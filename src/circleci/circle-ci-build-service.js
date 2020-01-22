const path = require("path");
const BuildServiceBase = require("../services/build-service-base").BuildServiceBase;

class CircleCIBuildService extends BuildServiceBase {
    async build(cliArgs, additionalMappedFiles, additionalPlaceholders) {
        // projectRoot: string, projectData: IProjectData, buildData: IAndroidBuildData
        const [projectRoot, projectData, buildData] = cliArgs;

        await this.prepareCLIArgs(buildData);

        // TODO: validate CircleCI related config values
        var mappedFiles = {
            [`node_modules/nativescript-cloud-builds/src/circleci/${this.platform}/config.yml`]: "./.circleci/config.yml"
        };

        if (additionalMappedFiles) {
            mappedFiles = Object.assign(mappedFiles, additionalMappedFiles);
        }

        const commitRevision = await super.pushToSyncRepository(cliArgs, mappedFiles, additionalPlaceholders);
        const circleCIJobId = await this.getCircleCIJobNumber(commitRevision);
        const isSuccessfulBuild = await this.isSuccessfulBuild(circleCIJobId);
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
        const localBuildResult = await this.downloadCircleCIBuild(circleCIJobId, cloudFilePath, appLocation, outputFileName, isIOSSimulator);
        if (localBuildResult) {
            this.$logger.info(`Successfully downloaded: ${localBuildResult}`);
        } else {
            throw new Error("Failed to download build result.")
        }
    }

    async prepareCLIArgs(buildData) {
        if (this.isAndroid) {
            if (buildData.release) {
                await this.updateCLIEnvVariable("release", "1");
            }
            if (buildData.clean) {
                await this.updateCLIEnvVariable("clean", "1");
            }
            if (buildData.keyStorePath) {
                // base64 encode
                const base64KeyStore = await this.$fs.readFileSync(buildData.keyStorePath, { encoding: 'base64' });
                await this.updateCLIEnvVariable("keyStore", base64KeyStore);
            }
            if (buildData.keyStorePassword) {
                await this.updateCLIEnvVariable("keyStorePassword", buildData.keyStorePassword);
            }
            if (buildData.keyStoreAlias) {
                await this.updateCLIEnvVariable("keyStoreAlias", buildData.keyStoreAlias);
            }
            if (buildData.keyStoreAliasPassword) {
                await this.updateCLIEnvVariable("keyStoreAliasPassword", buildData.keyStoreAliasPassword);
            }
        } else {
            // TODO: handle iOS
        }
    }

    async timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    async downloadCircleCIBuild(jobNumber, cloudFilePath, outputLocation, outputFileName, isIOSSimulator) {
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
        const targetFile = this.$fs.createWriteStream(targetFileName);

        await this.$httpClient.httpRequest({
            url: apkDownloadUrl,
            pipeTo: targetFile
        });

        if (isIOSSimulator) {
            await this.$fs.unzip(targetFileName, outputLocation);
        }

        return targetFile.path;
    }

    async updateCLIEnvVariable(name, value) {
        // TODO: add lodash dep to the plugin
        return updateEnvVariable(`CLI_ARG_${_.snakeCase(name).toUpperCase()}`, value);
    }

    async updateEnvVariable(envName, envValue) {
        const response = await this.$httpClient.httpRequest({
            url: `https://circleci.com/api/v1.1/project/github/${this.githubRepository}/envvar?circle-token=${this.circleCiApiAccessToken}`,
            method: "POST",
            body: JSON.stringify({ "name": envName, "value": envValue }),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            }
        });

        if (response.response.statusCode !== 201) {
            throw new Error(`Unable to update CirlceCI environment variables for project "this.githubRepository"`);
        }
    }
}

module.exports.CircleCIBuildService = CircleCIBuildService;