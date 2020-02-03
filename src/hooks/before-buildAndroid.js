const GitBuildService = require("../services/git-build-service").GitBuildService;
const ConfigService = require("../services/config-service").ConfigService;
const CircleCIService = require("../circleci/circle-ci-service").CircleCIService

module.exports = ($staticConfig, $childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    if (process.env.CI) {
        // do not override the native build in the cloud CI
        return;
    }

    return (args) => {
        var [nativeProjectRoot, projectData, buildData] = args;
        const configService = new ConfigService();
        const config = configService.getConfig(projectData.projectDir);
        const buildService = new GitBuildService(
            $staticConfig,
            $childProcess,
            $fs,
            $logger,
            $platformsDataService,
            $settingsService,
            $httpClient,
            "android",
            config.sshCloudSyncGitRepository,
            new CircleCIService(
                $httpClient,
                $fs,
                config.cloudSyncGitRepository
            ));

        return buildService.build(args, {
            "node_modules/nativescript-cloud-builds/src/fastlane/android/Fastfile": "./fastlane/Fastfile",
            "node_modules/nativescript-cloud-builds/src/fastlane/android/Gemfile": "./Gemfile",
        });
    };
}
