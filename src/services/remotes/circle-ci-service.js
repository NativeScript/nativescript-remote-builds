const path = require("path");
const _ = require("lodash");
const { sleep } = require("../../utils");
const { FastlaneService } = require("../common/fastlane-service");
const constants = require("../../constants");

class CircleCIService {
    constructor($httpClient, $fs, $logger, $cleanupService, platform, localEnv, options) {
        this.circleCiApiAccessToken = (localEnv && localEnv.CIRCLE_CI_API_ACCESS_TOKEN) || process.env.CIRCLE_CI_API_ACCESS_TOKEN;
        const githubAccessToken = (localEnv && localEnv.GITHUB_ACCESS_TOKEN) || process.env.GITHUB_ACCESS_TOKEN;
        if (!this.circleCiApiAccessToken) {
            //  TODO: refer a README section.
            throw new Error(`You have to set the 'CIRCLE_CI_API_ACCESS_TOKEN' env variable on your local machine or in the local variables in the "${constants.envFileName}" file in order to run cloud builds in Circle CI.`);
        }

        this.$httpClient = $httpClient;
        this.$fs = $fs;
        this.$logger = $logger;
        this.platform = platform;
        this.$cleanupService = $cleanupService;
        const hasSshUrl = !!options.sshRepositoryURL;
        const hasHttpsUrl = !!options.httpsRepositoryURL;
        if ((hasSshUrl && hasHttpsUrl) || (!hasSshUrl && !hasHttpsUrl)) {
            throw new Error(`One of "circleci.sshRepositoryURL" and "circleci.httpsRepositoryURL" is required.`);
        }

        if (hasSshUrl) {
            const githubSshUrlStart = "git@github.com:";
            if (!options.sshRepositoryURL.startsWith(githubSshUrlStart)) {
                throw new Error(`"circleci.sshRepositoryURL" should be a valid github ssh URL. Received: ${options.sshRepositoryURL}`);
            }

            this.syncRepositoryURL = options.sshRepositoryURL;
            this.gitRepositoryName = options.sshRepositoryURL.replace(/\.git/g, "").substring(githubSshUrlStart.length);
        } else {

            const githubHttpsUrlStart = "https://github.com/";
            if (!options.httpsRepositoryURL.startsWith(githubHttpsUrlStart)) {
                throw new Error(`"circleci.httpsRepositoryURL" should be a valid github HTTPS repository URL. For example: "https://github.com/DimitarTachev/nativescript-circle-ci-livesync.git". Received: ${options.httpsRepositoryURL}`);
            }

            if (!githubAccessToken) {
                //  TODO: refer a README section.
                throw new Error(`You have to set the 'GITHUB_ACCESS_TOKEN' env variable on your local machine or in the local variables in the "${constants.envFileName}" file in order to use HTTPS GitHub URLs.`);
            }

            this.gitRepositoryName = options.httpsRepositoryURL.replace(/\.git/g, "").substring(githubHttpsUrlStart.length);
            const accessTokenStartIndex = "https://".length;
            this.syncRepositoryURL = options.httpsRepositoryURL.slice(0, accessTokenStartIndex) + `${githubAccessToken}:x-oauth-basic@` + options.httpsRepositoryURL.slice(accessTokenStartIndex);
        }

        this.fastlaneService = new FastlaneService();
    }

    getRequiredEnvVars(platform, cliArgs) {
        return this.fastlaneService.getRequiredEnvVars(platform, cliArgs);
    }

    getCustomFiles() {
        const mappedFiles = {
            [`node_modules/nativescript-remote-builds/src/configs/circleci/${this.platform}/config.yml`]: "./.circleci/config.yml",
        };

        const fastlaneFiles = this.fastlaneService.getCustomFiles(this.platform);

        return _.assign(mappedFiles, fastlaneFiles);
    }

    async build(gitRevision) {
        await this._ensureValidSyncRepository();
        const buildNumber = await this._getBuildNumber(gitRevision);
        const isSuccessful = await this._isSuccessfulBuild(buildNumber);

        return { isSuccessful, buildNumber };
    }

    async downloadBuildArtefact(buildNumber, cloudFileName, destinationFilePath) {
        await this._ensureValidSyncRepository();
        const artifactsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/${buildNumber}/artifacts?circle-token=${this.circleCiApiAccessToken}`);
        const artifacts = JSON.parse(artifactsResponse.body);

        const appArtifact = _.find(artifacts, (a) => { return a.path.trim().indexOf(cloudFileName) > -1; });
        if (!appArtifact) {
            throw new Error(`"${cloudFileName}" not found in the Circle CI artifacts!`);
        }

        const isZip = appArtifact.path.trim().endsWith(".zip");
        if (isZip) {
            destinationFilePath += ".zip";
        }
        const destinationDir = path.dirname(destinationFilePath);
        this.$fs.createDirectory(destinationDir);
        var targetFile = this.$fs.createWriteStream(destinationFilePath);

        await this.$httpClient.httpRequest({
            url: appArtifact.url + `?circle-token=${this.circleCiApiAccessToken}`,
            pipeTo: targetFile
        });

        if (isZip) {
            await this.$fs.unzip(destinationFilePath, destinationDir);
        }
    }

    async getRemoteEnvVariables() {
        await this._ensureValidSyncRepository();
        let hasError = false;
        try {
            const response = await this.$httpClient.httpRequest({
                url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/envvar?circle-token=${this.circleCiApiAccessToken}`,
                method: "GET"
            });
            hasError = response.response.statusCode !== 200;
            if (!hasError) {
                const envVars = JSON.parse(response.body).reduce(function (result, item) {
                    result[item.name] = item.value;
                    return result;
                }, {});

                return envVars;
            }
        } catch (e) {
            hasError = true;
        }

        if (hasError) {
            throw new Error(`Unable to read CircleCI environment variables for project "${this.gitRepositoryName}"`);
        }
    }

    async updateRemoteEnvVariable(envName, envValue) {
        await this._ensureValidSyncRepository();
        let hasError = false;
        try {
            const response = await this.$httpClient.httpRequest({
                url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/envvar?circle-token=${this.circleCiApiAccessToken}`,
                method: "POST",
                body: JSON.stringify({ "name": envName, "value": envValue }),
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            });
            hasError = response.response.statusCode !== 201;
            if (!hasError && this.$cleanupService.addRequest) {
                this.$cleanupService.addRequest({
                    url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/envvar/${envName}?circle-token=${this.circleCiApiAccessToken}`,
                    method: "DELETE"
                });
            }
        } catch (e) {
            hasError = true;
        }

        if (hasError) {
            throw new Error(`Unable to update CircleCI environment variables for project "${this.gitRepositoryName}"`);
        }
    }

    async deleteRemoteEnvVariable(envName) {
        await this._ensureValidSyncRepository();
        let hasError = false;
        try {
            const response = await this.$httpClient.httpRequest({
                url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/envvar/${envName}?circle-token=${this.circleCiApiAccessToken}`,
                method: "DELETE"
            });
            hasError = response.response.statusCode !== 200;
            if (!hasError && this.$cleanupService.removeRequest) {
                this.$cleanupService.removeRequest({
                    url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/envvar/${envName}?circle-token=${this.circleCiApiAccessToken}`,
                    method: "DELETE"
                });
            }
        } catch (e) {
            hasError = true;
        }

        if (hasError) {
            throw new Error(`Unable to remove CircleCI environment variables for project "${this.gitRepositoryName}"`);
        }
    }

    async _ensureValidSyncRepository() {
        if (this._hasValidIntegration) {
            return;
        }

        try {
            const followRepoResponse = await this.$httpClient.httpRequest({
                url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/follow?circle-token=${this.circleCiApiAccessToken}`,
                method: "POST"
            });

            this._hasValidIntegration = followRepoResponse.response.statusCode === 200;
        } catch (e) {
            this._hasValidIntegration = false;
        }

        if (!this._hasValidIntegration) {
            throw new Error(`Unable to integrate the "${this.gitRepositoryName}" project with Circle CI. Make sure that "${this.gitRepositoryName}" is an initialized GitHub repository and the Circle CI OAuth application is authorized in your GitHub organization - https://circleci.com/integrations/github `)
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
            throw new Error(`Timeout while waiting for a CircleCI job.`);
        }

        if (this.$cleanupService.addRequest) {
            this.$cleanupService.addRequest({
                url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/${targetBuild.build_num}/cancel?circle-token=${this.circleCiApiAccessToken}`,
                method: "POST"
            });
        }

        this.$logger.info(`A cloud build has started. Open ${targetBuild.build_url} for more details.`);

        return targetBuild.build_num;
    }

    async _isSuccessfulBuild(buildNumber) {
        const buildResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/${buildNumber}?circle-token=${this.circleCiApiAccessToken}`);
        const build = JSON.parse(buildResponse.body);
        //  :retried, :canceled, :infrastructure_fail, :timeout, :not_run, :running, :failed, :queued, :scheduled, :not_running, :no_tests, :fixed, :success
        if (build.status === "not_running" || build.status === "queued" || build.status === "scheduled" || build.status === "running") {
            await sleep(500);
            return this._isSuccessfulBuild(buildNumber);
        }

        if (this.$cleanupService.removeRequest) {
            this.$cleanupService.removeRequest({
                url: `https://circleci.com/api/v1.1/project/github/${this.gitRepositoryName}/${buildNumber}/cancel?circle-token=${this.circleCiApiAccessToken}`,
                method: "POST"
            });
        }

        return build.status === "success";
    }
}

module.exports.CircleCIService = CircleCIService;