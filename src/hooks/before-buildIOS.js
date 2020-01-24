const CircleCIBuildService = require("../circleci/circle-ci-build-service").CircleCIBuildService;
const ConfigService = require("../services/config-service").ConfigService;
const path = require("path");

module.exports = ($staticConfig, $childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    if (process.env.CI) {
        // do not override the native build in the cloud CI
        return;
    }

    return (args) => {
        var [nativeProjectRoot, projectData, buildData] = args;
        const configService = new ConfigService();
        const config = configService.getConfig(projectData.projectDir);
        const buildService = new CircleCIBuildService(
            $staticConfig,
            $childProcess,
            $fs,
            $logger,
            $platformsDataService,
            $settingsService,
            $httpClient,
            "ios",
            config.cloudSyncGithubRepository);
        nativeProjectRoot = path.relative(projectData.projectDir, nativeProjectRoot);

        return buildService.build(args, {
            "node_modules/nativescript-cloud-builds/src/fastlane/ios/Appfile": "./fastlane/Appfile",
            "node_modules/nativescript-cloud-builds/src/fastlane/ios/Fastfile": "./fastlane/Fastfile",
            "node_modules/nativescript-cloud-builds/src/fastlane/ios/Matchfile": "./fastlane/Matchfile",
            "node_modules/nativescript-cloud-builds/src/fastlane/ios/Gemfile": "./Gemfile",
        }, {
            "IOS_TEAM_ID": config.iOSTeamId,
            "IOS_APPLE_ID": config.appleId,
            "IOS_DEV_PROVISION_NAME": config.iOSDevProfileName,
            "IOS_SIGNING_REPO_URL": config.iOSSigningPrivateGithubRepository,
            "IOS_XCODE_PROJ_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcodeproj`),
            "IOS_XCODE_WORKSPACE_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcworkspace`),
            "IOS_BUILD_FOR_SIMULATOR": !buildData.buildForDevice,
            "IOS_BUILD_TYPE": "development",
            "IOS_BUILD_CONFIGURATION": buildData.release ? "Release" : "Debug"
        });
    };
}