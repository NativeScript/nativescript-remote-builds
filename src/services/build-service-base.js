const GitService = require("../services/git-service").GitService;

class BuildServiceBase {
    constructor($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient, platform) {
        if (typeof this.build !== "function") {
            throw new Error("The 'build' method is not implemented. You have to use a valid BuildServiceBase subclass (e.g. CircleCIBuildService).");
        }

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

    async pushToSyncRepository(args, cloudSyncGithubRepository, additionalMappedFiles, additionalPlaceholders) {
        const [projectRoot, projectData, buildData] = args;
        this.remoteUrl = cloudSyncGithubRepository;
        const githubSshUrlStart = "git@github.com:";
        if (!this.remoteUrl.startsWith(githubSshUrlStart)) {
            throw new Error(`"cloudSyncGithubRepository" should be a valid github ssh URL. Received: ${this.remoteUrl}`);
        }

        this.githubRepository = this.remoteUrl.replace(/\.git/g, "").substring(githubSshUrlStart.length);
        var mappedFiles = {
            [`node_modules/nativescript-cloud-builds/src/common/safe-config.json`]: constants.configFileName
        };

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

        return commitRevision;
    }
}

module.exports.BuildServiceBase = BuildServiceBase;