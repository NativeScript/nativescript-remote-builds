const path = require("path");

class CircleCIService {
    constructor($httpClient, $fs, $logger, gitRepository) {
        if (!process.env.CIRCLE_CI_API_ACCESS_TOKEN) {
            throw new Error("You have to set the CIRCLE_CI_API_ACCESS_TOKEN env variable on your local machine in order to run cloud builds in Circle CI.");
        }

        this.circleCiApiAccessToken = process.env.CIRCLE_CI_API_ACCESS_TOKEN;
        this.$httpClient = $httpClient;
        this.$fs = $fs;
        this.$logger = $logger;
        this.gitRepository = gitRepository;
    }

    async getBuildNumber(gitRevision, retryCount) {
        const recentBuildsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/recent-builds?circle-token=${this.circleCiApiAccessToken}`);
        const recentBuilds = JSON.parse(recentBuildsResponse.body);
        const targetBuild = _.find(recentBuilds, (b) => { return b.vcs_revision.trim() === gitRevision; });
        if (!targetBuild && (!retryCount || retryCount < 60)) {
            await this.timeout(500);
            retryCount = retryCount || 0;
            retryCount++;
            return this.getBuildNumber(gitRevision, retryCount);
        }

        if (!targetBuild) {
            throw new Error(`Timeout while waiting for a CircleCI job. Make sure that the '${this.gitRepository}' project is enabled in CircleCI`)
        }

        this.$logger.info(`A cloud build has started. Open ${targetBuild.build_url} for more details.`);

        return targetBuild.build_num;
    }

    async isSuccessfulBuild(buildNumber) {
        const buildResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.gitRepository}/${buildNumber}`);
        const build = JSON.parse(buildResponse.body);
        //  :retried, :canceled, :infrastructure_fail, :timeout, :not_run, :running, :failed, :queued, :scheduled, :not_running, :no_tests, :fixed, :success
        if (build.status === "queued" || build.status === "scheduled" || build.status === "running") {
            await this.timeout(100);
            return this.isSuccessfulBuild(buildNumber);
        }

        return build.status === "success";
    }

    async downloadBuildArtefact(buildNumber, cloudFileName, destinationFilePath) {
        const artifactsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.gitRepository}/${buildNumber}/artifacts`);
        const artifacts = JSON.parse(artifactsResponse.body);

        const appArtifact = _.find(artifacts, (a) => { return a.path.trim().indexOf(cloudFileName) > -1; });
        if (!appArtifact) {
            return null;
        }

        this.$fs.createDirectory(path.dirname(destinationFilePath));
        var targetFile = this.$fs.createWriteStream(destinationFilePath);

        await this.$httpClient.httpRequest({
            url: appArtifact.url,
            pipeTo: targetFile
        });

        var appPath = targetFile.path;

        return appPath;
    }

    async updateEnvVariable(envName, envValue) {
        const response = await this.$httpClient.httpRequest({
            url: `https://circleci.com/api/v1.1/project/github/${this.gitRepository}/envvar?circle-token=${this.circleCiApiAccessToken}`,
            method: "POST",
            body: JSON.stringify({ "name": envName, "value": envValue }),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            }
        });

        if (response.response.statusCode !== 201) {
            throw new Error(`Unable to update CircleCI environment variables for project "${this.gitRepository}"`);
        }
    }

    async deleteEnvVariable(envName) {
        const response = await this.$httpClient.httpRequest({
            url: `https://circleci.com/api/v1.1/project/github/${this.gitRepository}/envvar/${envName}?circle-token=${this.circleCiApiAccessToken}`,
            method: "DELETE"
        });

        if (response.response.statusCode !== 200) {
            throw new Error(`Unable to remove CircleCI environment variables for project "${this.gitRepository}"`);
        }
    }

    async timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports.CircleCIService = CircleCIService;