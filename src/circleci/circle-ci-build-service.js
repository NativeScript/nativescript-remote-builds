const path = require("path");
const BuildServiceBase = require("../services/build-service-base").BuildServiceBase;

class CircleCIBuildService extends BuildServiceBase {
    async build(cliArgs, cloudSyncGithubRepository, circleCiApiAccessToken, additionalMappedFiles, additionalPlaceholders) {
        // projectRoot: string, projectData: IProjectData, buildData: IAndroidBuildData
        const [projectRoot, projectData, buildData] = cliArgs;
        this.circleCiApiAccessToken = circleCiApiAccessToken;

        // TODO: validate CircleCI related config values
        var mappedFiles = {
            [`node_modules/nativescript-cloud-builds/src/circleci/${this.platform}/config.yml`]: "./.circleci/config.yml"
        };

        if (additionalMappedFiles) {
            mappedFiles = Object.assign(mappedFiles, additionalMappedFiles);
        }

        const commitRevision = await super.pushToSyncRepository(cliArgs, cloudSyncGithubRepository, mappedFiles, additionalPlaceholders);
        const circleCIJobId = await this.getCircleCIJobNumber(commitRevision);
        const isSuccessfulBuild = await this.isSuccessfulBuild(circleCIJobId);
        if (!isSuccessfulBuild) {
            throw new Error("Cloud build failed.");
        }

        const platformData = this.$platformsDataService.getPlatformData(this.platform, projectData);
        const appLocation = platformData.getBuildOutputPath(buildData);
        this.$logger.info("Downloading build result.");
        const cloudFilePath = this.isAndroid ? "home/circleci/output/app.apk" : `Users/distiller/output/gym/${projectData.projectName}.ipa`;
        const outputFileName = this.isAndroid ? `app-${buildData.release ? "release" : "debug"}` : projectData.projectName;
        const localBuildResult = await this.downloadCircleCIBuild(circleCIJobId, cloudFilePath, appLocation, outputFileName);
        if (localBuildResult) {
            this.$logger.info(`Successfully downloaded: ${localBuildResult}`);
        } else {
            throw new Error("Failed to download build result.")
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

    async downloadCircleCIBuild(jobNumber, cloudFilePath, outputLocation, outputFileName) {
        const artifactsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.githubRepository}/${jobNumber}/artifacts`);
        const artifacts = JSON.parse(artifactsResponse.body);

        const appExtension = this.isAndroid ? ".apk" : ".ipa";
        const apkArtifact = _.find(artifacts, (a) => { return a.path.trim() === cloudFilePath; });
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

        return targetFile.path;
    }
}

module.exports.CircleCIBuildService = CircleCIBuildService;