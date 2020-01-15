const GitService = require("../services/git-service").GitService;
const path = require("path");

class CircleCIBuildService {
    constructor($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient, platform) {
        this.$childProcess = $childProcess;
        this.$fs = $fs;
        this.$logger = $logger;
        this.$platformsDataService = $platformsDataService;
        this.$settingsService = $settingsService;
        this.$httpClient = $httpClient;
        this.platform = platform;
        this.isAndroid = this.platform === "android";
        this.gitService = new GitService(this.$childProcess, this.$fs, this.$logger, this.$settingsService.getProfileDir());
    }

    async build(args, cloudSyncGithubRepository, circleCiApiAccessToken, additionalMappedFiles, additionalPlaceholders) {
        // projectRoot: string, projectData: IProjectData, buildData: IAndroidBuildData
        const [projectRoot, projectData, buildData] = args;
        this.circleCiApiAccessToken = circleCiApiAccessToken;
        this.remoteUrl = cloudSyncGithubRepository;
        const githubSshUrlStart = "git@github.com:";
        if (!this.remoteUrl.startsWith(githubSshUrlStart)) {
            throw new Error(`"cloudSyncGithubRepository" should be a valid github ssh URL. Received: ${this.remoteUrl}`);
        }

        this.githubRepository = this.remoteUrl.replace(/\.git/g, "").substring(githubSshUrlStart.length);
        const platformData = this.$platformsDataService.getPlatformData(this.platform, projectData);
        var mappedFiles = { [`node_modules/nativescript-cloud-builds/src/circleci/${this.platform}/config.yml`]: "./.circleci/config.yml" };
        if (additionalMappedFiles) {
            mappedFiles = Object.assign(mappedFiles, additionalMappedFiles);
        }
        var placeholders = {
            "PROJECT_NAME": projectData.projectName,
            "PROJECT_ID": projectData.projectIdentifiers[this.platform],
            "BUILD_TYPE": "development", // TODO: base on the CLI args
            "BUILD_CONFIGURATION": "Debug" // TODO: base on CLI args
        };
        if (additionalPlaceholders) {
            placeholders = Object.assign(placeholders, additionalPlaceholders);
        }
        const commitRevision = await this.gitService.gitPushChanges(
            { projectDir: projectData.projectDir, projectId: projectData.projectIdentifiers[this.platform] },
            { httpRemoteUrl: this.remoteUrl },
            mappedFiles,
            placeholders);

        const circleCIJobId = await this.getCircleCIJobNumber(commitRevision);
        const isSuccessfulBuild = await this.isSuccessfulBuild(circleCIJobId);
        if (!isSuccessfulBuild) {
            throw new Error("Cloud build failed.");
        }

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

    async getCircleCIJobNumber(gitRevision) {
        // TODO: accept the token as param
        const recentBuildsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/recent-builds?circle-token=${this.circleCiApiAccessToken}`);
        const recentBuilds = JSON.parse(recentBuildsResponse.body);
        const targetBuild = _.find(recentBuilds, (b) => { return b.vcs_revision.trim() === gitRevision; });
        if (!targetBuild) {
            await this.timeout(100);
            return this.getCircleCIJobNumber(gitRevision);
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