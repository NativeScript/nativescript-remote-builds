const path = require("path");
const uniqueString = require('unique-string');
const BuildServiceBase = require("../services/build-service-base").BuildServiceBase;

class CircleCIBuildService extends BuildServiceBase {
    async build(cliArgs, additionalMappedFiles, additionalPlaceholders) {
        // projectRoot: string, projectData: IProjectData, buildData: IAndroidBuildData
        const [projectRoot, projectData, buildData] = cliArgs;
        const cliBuildId = uniqueString();
        // TODO: test if the repo is not integrated with circle ci.
        await this.uploadCLIArgsAsEnvVars(buildData, cliBuildId);

        // TODO: validate CircleCI related config values
        var mappedFiles = {
            [`node_modules/nativescript-cloud-builds/src/circleci/${this.platform}/config.yml`]: "./.circleci/config.yml"
        };

        if (additionalMappedFiles) {
            mappedFiles = Object.assign(mappedFiles, additionalMappedFiles);
        }

        var placeholders = {
            "CLI_BUILD_ID": cliBuildId,
        };

        if (additionalPlaceholders) {
            placeholders = Object.assign(placeholders, additionalPlaceholders);
        }

        const commitRevision = await super.pushToSyncRepository(cliArgs, mappedFiles, placeholders, cliBuildId);
        const circleCIJobId = await this.getCircleCIJobNumber(commitRevision);
        const isSuccessfulBuild = await this.isSuccessfulBuild(circleCIJobId);
        await this.cleanEnvVars(cliBuildId);
        await this.gitService.gitDeleteBranch(
            { projectDir: projectData.projectDir, projectId: projectData.projectIdentifiers[this.platform] },
            cliBuildId
        )

        if (!isSuccessfulBuild) {
            throw new Error("Cloud build failed.");
        }

        const platformData = this.$platformsDataService.getPlatformData(this.platform, projectData);
        const appLocation = platformData.getBuildOutputPath(buildData);
        this.$logger.info("Downloading build result.");
        const isIOSSimulator = !this.isAndroid && !buildData.buildForDevice;
        const cloudFilePath = this.isAndroid ? "app.apk" :
            isIOSSimulator ?
                `${projectData.projectName}.app.zip` :
                `${projectData.projectName}.ipa`;

        const outputFileName = this.isAndroid ? `app-${buildData.release ? "release" : "debug"}` : projectData.projectName;
        const localBuildResult = await this.downloadCircleCIBuild(circleCIJobId, cloudFilePath, appLocation, outputFileName, isIOSSimulator, buildData.androidBundle);
        if (localBuildResult) {
            this.$logger.info(`Successfully downloaded: ${localBuildResult}`);
        } else {
            throw new Error("Failed to download build result.")
        }
    }

    async cleanEnvVars(cliBuildId) {
        if (this.buildEnvVars[cliBuildId] && this.buildEnvVars[cliBuildId].length) {
            for (const envVar of this.buildEnvVars[cliBuildId]) {
                await this.deleteEnvVariable(envVar);
            }
        }
    }

    async uploadCLIArgsAsEnvVars(buildData, cliBuildId) {
        // TODO: pass dynamic list of arg names to the templates
        await this.handleEnv(buildData.env, cliBuildId);
        await this.updateCLIEnvVariable("log", this.$logger.getLevel(), cliBuildId);
        if (buildData.release) {
            await this.updateCLIEnvVariable("release", "1", cliBuildId);
        }
        if (buildData.hmr) {
            await this.updateCLIEnvVariable("hmr", "1", cliBuildId);
        }
        if (buildData.clean) {
            await this.updateCLIEnvVariable("clean", "1", cliBuildId);
        }
        if (buildData.androidBundle) {
            await this.updateCLIEnvVariable("aab", "1", cliBuildId);
        }

        if (this.isAndroid) {
            if (buildData.keyStorePath) {
                const base64KeyStore = await this.$fs.readFile(buildData.keyStorePath, { encoding: 'base64' });
                await this.updateCLIEnvVariable("keyStore", base64KeyStore, cliBuildId);
            }
            if (buildData.keyStorePassword) {
                await this.updateCLIEnvVariable("keyStorePassword", buildData.keyStorePassword, cliBuildId);
            }
            if (buildData.keyStoreAlias) {
                await this.updateCLIEnvVariable("keyStoreAlias", buildData.keyStoreAlias, cliBuildId);
            }
            if (buildData.keyStoreAliasPassword) {
                await this.updateCLIEnvVariable("keyStoreAliasPassword", buildData.keyStoreAliasPassword, cliBuildId);
            }
        }
    }

    async timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async handleEnv(envObj, cliBuildId) {
        const handleEnvParam = async (item, buildId) => {
            let envValue = envObj[item];
            if (typeof envValue === "undefined") {
                return;
            }
            if (typeof envValue === "boolean") {
                if (envValue) {
                    await this.updateCLIEnvVariable(`--env.${item}`, "1", buildId);
                }
            } else {
                if (!Array.isArray(envValue)) {
                    envValue = [envValue];
                }

                await this.updateCLIEnvVariable(`--env.${item}`, value, buildId);
            }
        }

        return Promise.all(Object.keys(envObj).map(item => handleEnvParam(item, cliBuildId)));
    }

    async getCircleCIJobNumber(gitRevision, retryCount) {
        const recentBuildsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/recent-builds?circle-token=${this.circleCiApiAccessToken}`);
        const recentBuilds = JSON.parse(recentBuildsResponse.body);
        const targetBuild = _.find(recentBuilds, (b) => { return b.vcs_revision.trim() === gitRevision; });
        if (!targetBuild && (!retryCount || retryCount < 60)) {
            await this.timeout(500);
            retryCount = retryCount || 0;
            retryCount++;
            return this.getCircleCIJobNumber(gitRevision, retryCount);
        }

        if (!targetBuild) {
            throw new Error(`Timeout while waiting for a CircleCI job. Make sure that the '${this.remoteUrl}' project is enabled in CircleCI`)
        }

        this.$logger.info(`A cloud build has started. Open ${targetBuild.build_url} for more details.`);

        return targetBuild.build_num;
    }

    async isSuccessfulBuild(jobNumber) {
        const buildResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.githubRepository}/${jobNumber}`);
        const build = JSON.parse(buildResponse.body);
        //  :retried, :canceled, :infrastructure_fail, :timedout, :not_run, :running, :failed, :queued, :scheduled, :not_running, :no_tests, :fixed, :success
        if (build.status === "queued" || build.status === "scheduled" || build.status === "running") {
            await this.timeout(100);
            return this.isSuccessfulBuild(jobNumber);
        }

        return build.status === "success";
    }

    async downloadCircleCIBuild(jobNumber, cloudFilePath, outputLocation, outputFileName, isIOSSimulator, isAndroidBundle) {
        const artifactsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.githubRepository}/${jobNumber}/artifacts`);
        const artifacts = JSON.parse(artifactsResponse.body);

        const appExtension = this.isAndroid ? ".apk" : isIOSSimulator ? ".app.zip" : ".ipa";
        const apkArtifact = _.find(artifacts, (a) => { return a.path.trim().indexOf(cloudFilePath) > -1; });
        if (!apkArtifact) {
            return null;
        }

        const apkDownloadUrl = apkArtifact.url;
        const targetFileName = path.join(outputLocation, `${outputFileName}${appExtension}`);
        this.$fs.createDirectory(path.dirname(targetFileName));
        var targetFile = this.$fs.createWriteStream(targetFileName);

        await this.$httpClient.httpRequest({
            url: apkDownloadUrl,
            pipeTo: targetFile
        });

        var appPath = targetFile.path;
        if (isIOSSimulator) {
            await this.$fs.unzip(targetFileName, outputLocation);
            // we are archiving the app folder for simulators in the cloud
            // <path-to-the-app>.app.zip => <path-to-the-app>.app
            appPath = this.removeExtension(targetFileName);
        }

        if (isAndroidBundle) {
            // we are passing --copy-to=<path>.apk in the cloud (even when --aab is passed)
            // <path-to-the-app>.apk => <path-to-the-app>.aab
            appPath = this.removeExtension(targetFile.path) + '.aab';
            this.$fs.rename(targetFile.path, appPath);
        }

        return appPath;
    }

    removeExtension(filePath) {
        return path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
    }

    async updateCLIEnvVariable(name, value, cliBuildId) {
        // TODO: add lodash dep to the plugin
        return this.updateEnvVariable(`CLI_ARG_${_.snakeCase(name).toUpperCase()}_${cliBuildId}`, value, cliBuildId);
    }

    async updateEnvVariable(envName, envValue, cliBuildId) {
        const response = await this.$httpClient.httpRequest({
            url: `https://circleci.com/api/v1.1/project/github/${this.githubRepository}/envvar?circle-token=${this.circleCiApiAccessToken}`,
            method: "POST",
            body: JSON.stringify({ "name": envName, "value": envValue }),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            }
        });

        if (response.response.statusCode !== 201) {
            throw new Error(`Unable to update CirlceCI environment variables for project "${this.githubRepository}"`);
        }

        this.buildEnvVars = this.buildEnvVars || {};
        this.buildEnvVars[cliBuildId] = this.buildEnvVars[cliBuildId] || [];
        this.buildEnvVars[cliBuildId].push(envName);
    }

    async deleteEnvVariable(envName) {
        const response = await this.$httpClient.httpRequest({
            url: `https://circleci.com/api/v1.1/project/github/${this.githubRepository}/envvar/${envName}?circle-token=${this.circleCiApiAccessToken}`,
            method: "DELETE"
        });

        if (response.response.statusCode !== 200) {
            throw new Error(`Unable to remove CirlceCI environment variables for project "${this.githubRepository}"`);
        }
    }
}

module.exports.CircleCIBuildService = CircleCIBuildService;