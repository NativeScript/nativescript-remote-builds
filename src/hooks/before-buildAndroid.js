const CircleCIBuildService = require("../circleci/circle-ci-build-service").CircleCIBuildService;
const ConfigService = require("../services/config-service").ConfigService;

module.exports = ($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    if (process.env.CI) {
        // do not override the native build in the cloud CI
        return;
    }

    // TODO: release configurations based on --release
    // TODO: handle keystore args

    return (args) => {
        var [nativeProjectRoot, projectData, buildData] = args;
        const configService = new ConfigService();
        const config = configService.getConfig(projectData.projectDir);
        const buildService = new CircleCIBuildService(
            $childProcess,
            $fs,
            $logger,
            $platformsDataService,
            $settingsService,
            $httpClient,
            "android",
            config.cloudSyncGithubRepository);

        return buildService.build(args, {
            "node_modules/nativescript-cloud-builds/src/fastlane/android/Fastfile": "./fastlane/Fastfile",
            "node_modules/nativescript-cloud-builds/src/fastlane/Gemfile": "./Gemfile",
        });
    };
}
