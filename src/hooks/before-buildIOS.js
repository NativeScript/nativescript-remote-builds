const CircleCIBuildService = require("../circleci/circle-ci-build-service").CircleCIBuildService;
const ConfigService = require("../services/config-service").ConfigService;
const path = require("path");
const constants = require("../common/constants");

module.exports = ($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    if (process.env.CI) {
        // do not override the native build in the cloud CI
        return;
    }

    const configService = new ConfigService();
    const buildService = new CircleCIBuildService(
        $childProcess,
        $fs,
        $logger,
        $platformsDataService,
        $settingsService,
        $httpClient,
        "ios");

    return (args) => {
        var [nativeProjectRoot, projectData, buildData] = args;
        const config = configService.getConfig(projectData.projectDir);
        nativeProjectRoot = path.relative(projectData.projectDir, nativeProjectRoot);

        return buildService.build(args, config.cloudSyncGithubRepository, config.circleCiApiAccessToken, {
            "node_modules/nativescript-cloud-builds/src/circleci/ios/fastlane/Appfile": "./fastlane/Appfile",
            "node_modules/nativescript-cloud-builds/src/circleci/ios/fastlane/Fastfile": "./fastlane/Fastfile",
            "node_modules/nativescript-cloud-builds/src/circleci/ios/fastlane/Matchfile": "./fastlane/Matchfile",
            "node_modules/nativescript-cloud-builds/src/circleci/ios/Gemfile": "./Gemfile",
        }, {
            "IOS_TEAM_ID": config.iOSTeamId,
            "IOS_APPLE_ID": config.appleId,
            "IOS_DEV_PROVISION_NAME": config.iOSDevProfileName,
            "IOS_SIGNING_REPO_URL": config.iOSSigningPrivateGithubRepo,
            "IOS_XCODE_PROJ_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcodeproj`),
            "IOS_XCODE_WORKSPACE_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcworkspace`)
        });
    };
}