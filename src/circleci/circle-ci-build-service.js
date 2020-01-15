const GitService = require("../services/git-service").GitService;
const path = require("path");
const config = require("../config");

class CircleCIBuildService {
    constructor($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient, platform) {
        this.remoteUrl = config.repoForCloudBuilding;
        const githubSshUrlStart = "git@github.com:";
        if (!this.remoteUrl.startsWith(githubSshUrlStart)) {
            throw new Error(`"repoForCloudBuilding" should be a valid github ssh URL. Received: ${this.remoteUrl}`);
        }

        this.githubRepository = this.remoteUrl.replace(/\.git/g, "").substring(githubSshUrlStart.length);
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

    async build(args, additionalMappedFiles, additionalPlaceholders) {
        // projectRoot: string, projectData: IProjectData, buildData: IAndroidBuildData
        const [projectRoot, projectData, buildData] = args;
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
        const appFileName = this.isAndroid ? `app-${buildData.release ? "release" : "debug"}` : projectData.projectName;
        const localBuildResult = await this.downloadCircleCIBuild(circleCIJobId, appLocation, appFileName);
        this.$logger.info(`Successfully downloaded: ${localBuildResult}`);
    }

    async timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getCircleCIJobNumber(gitRevision) {
        // TODO: accept the token as param
        const recentBuildsResponse = await this.$httpClient.httpRequest("https://circleci.com/api/v1.1/recent-builds?circle-token=24a8fc55a938af9c6ba163b61994aedf52639d60");
        const recentBuilds = JSON.parse(recentBuildsResponse.body);
        const targetBuild = _.find(recentBuilds, (b) => { return b.vcs_revision.trim() === gitRevision; });
        if (!targetBuild) {
            // console.log("reccursion: ", recentBuilds, gitRevision);
            await this.timeout(100);
            return this.getCircleCIJobNumber(gitRevision);
        }

        // console.log(targetBuild, gitRevision, targetBuild.build_num);

        console.log(`A cloud build has started. Open ${targetBuild.build_url} for more details.`);

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

    async downloadCircleCIBuild(jobNumber, apkLocation, apkFileName) {
        const artifactsResponse = await this.$httpClient.httpRequest(`https://circleci.com/api/v1.1/project/github/${this.githubRepository}/${jobNumber}/artifacts`);
        const artifacts = JSON.parse(artifactsResponse.body);

        // TODO: download based on the target platform

        const appExtension = this.isAndroid ? ".apk" : ".ipa";
        const appLocation = this.isAndroid ? "home/circleci/output/app.apk" : "Users/distiller/output/gym/nativescriptcirclecilivesync.ipa";
        const apkArtifact = _.find(artifacts, (a) => { return a.path.trim() === appLocation; });
        if (!apkArtifact) {
            return null;
        }

        const apkDownloadUrl = apkArtifact.url;
        const targetFileName = path.join(apkLocation, `${apkFileName}${appExtension}`);
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