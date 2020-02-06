const path = require("path");
const _ = require("lodash");
const { sleep } = require("../common/utils");
const { FastlaneService } = require("./fastlane-service");
const constants = require("../common/constants");

class CircleCIService {
    constructor($httpClient, $fs, $logger, platform, options) {
        this.circleCiApiAccessToken = process.env.CIRCLE_CI_API_ACCESS_TOKEN || options.circleCiApiAccessToken;
        if (!this.circleCiApiAccessToken) {
            //  TODO: refer a README section.
            throw new Error(`You have to set the CIRCLE_CI_API_ACCESS_TOKEN env variable on your local machine or in the "${constants.configFileName}" file in order to run cloud builds in Circle CI.`);
        }

        this.$httpClient = $httpClient;
        this.$fs = $fs;
        this.$logger = $logger;
        this.platform = platform;
        const githubSshUrlStart = "git@github.com:";
        // TODO: validate all CircleCI related config values
        if (!options || !options.sshCloudSyncGitRepository || !options.sshCloudSyncGitRepository.startsWith(githubSshUrlStart)) {
            throw new Error(`"circleci.sshCloudSyncGitRepository" should be a valid github ssh URL. Received: ${options.sshCloudSyncGitRepository}`);
        }

        this.sshCloudSyncGitRepository = options.sshCloudSyncGitRepository;
        this.gitRepositoryName = options.sshCloudSyncGitRepository.replace(/\.git/g, "").substring(githubSshUrlStart.length);
        this.fastlaneService = new FastlaneService();
    }


    getCustomFiles() {
        // TODO: maybe relative to the plugin / __dirname
        const mappedFiles = {
            [`node_modules/nativescript-cloud-builds/src/configs/circleci/${this.platform}/config.yml`]: "./.circleci/config.yml",
        };

        const fastlaneFiles = this.fastlaneService.getCustomFiles(this.platform);

        return _.assign(mappedFiles, fastlaneFiles);
    }

    async build(gitRevision) {
        const buildNumber = await this._getBuildNumber(gitRevision);
        const isSuccessful = await this._isSuccessfulBuild(buildNumber);

        return { isSuccessful, buildNumber };
    }

    async downloadBuildArtefact(buildNumber, cloudFileName, destinationFilePath) {
        const artifactsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/${buildNumber}/artifacts`);
        const artifacts = JSON.parse(artifactsResponse.body);

        const appArtifact = _.find(artifacts, (a) => { return a.path.trim().indexOf(cloudFileName) > -1; });
        if (!appArtifact) {
            return null;
        }

        const isZip = appArtifact.path.trim().endsWith(".zip");
        if (isZip) {
            destinationFilePath += ".zip";
        }
        const destinationDir = path.dirname(destinationFilePath);
        this.$fs.createDirectory(destinationDir);
        var targetFile = this.$fs.createWriteStream(destinationFilePath);

        await this.$httpClient.httpRequest({
            url: appArtifact.url,
            pipeTo: targetFile
        });

        if (isZip) {
            await this.$fs.unzip(destinationFilePath, destinationDir);
        }
    }

    async updateEnvVariable(envName, envValue) {
        const response = await this.$httpClient.httpRequest({
            url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/envvar?circle-token=${this.circleCiApiAccessToken}`,
            method: "POST",
            body: JSON.stringify({ "name": envName, "value": envValue }),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            }
        });

        if (response.response.statusCode !== 201) {
            throw new Error(`Unable to update CircleCI environment variables for project "${this.gitRepositoryName}"`);
        }
    }

    async deleteEnvVariable(envName) {
        const response = await this.$httpClient.httpRequest({
            url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/envvar/${envName}?circle-token=${this.circleCiApiAccessToken}`,
            method: "DELETE"
        });

        if (response.response.statusCode !== 200) {
            throw new Error(`Unable to remove CircleCI environment variables for project "${this.gitRepositoryName}"`);
        }
    }

    async _getBuildNumber(gitRevision, retryCount) {
        const recentBuildsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/recent-builds?circle-token=${this.circleCiApiAccessToken}`);
        const recentBuilds = JSON.parse(recentBuildsResponse.body);
        const targetBuild = _.find(recentBuilds, (b) => { return b.vcs_revision.trim() === gitRevision; });
        if (!targetBuild && (!retryCount || retryCount < 60)) {
            await sleep(500);
            retryCount = retryCount || 0;
            retryCount++;
            return this._getBuildNumber(gitRevision, retryCount);
        }

        if (!targetBuild) {
            throw new Error(`Timeout while waiting for a CircleCI job. Make sure that the '${this.gitRepositoryName}' project is enabled in CircleCI`)
        }

        this.$logger.info(`A cloud build has started. Open ${targetBuild.build_url} for more details.`);

        return targetBuild.build_num;
    }

    async _isSuccessfulBuild(buildNumber) {
        const buildResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/${buildNumber}`);
        const build = JSON.parse(buildResponse.body);
        //  :retried, :canceled, :infrastructure_fail, :timeout, :not_run, :running, :failed, :queued, :scheduled, :not_running, :no_tests, :fixed, :success
        if (build.status === "queued" || build.status === "scheduled" || build.status === "running") {
            await sleep(100);
            return this._isSuccessfulBuild(buildNumber);
        }

        return build.status === "success";
    }
}

module.exports.CircleCIService = CircleCIService;