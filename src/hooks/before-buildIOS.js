const CircleCIBuildService = require("../circleci/circle-ci-build-service").CircleCIBuildService;
const config = require("../config");
const path = require("path");

module.exports = ($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    if (process.env.CI) {
        // do not override the native build in the cloud CI
        return;
    }

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
        nativeProjectRoot = path.relative(projectData.projectDir, nativeProjectRoot);

        return buildService.build(args, {
            "node_modules/nativescript-cloud-builds/src/circleci/ios/fastlane/Appfile": "./fastlane/Appfile",
            "node_modules/nativescript-cloud-builds/src/circleci/ios/fastlane/Fastfile": "./fastlane/Fastfile",
            "node_modules/nativescript-cloud-builds/src/circleci/ios/fastlane/Matchfile": "./fastlane/Matchfile",
            "node_modules/nativescript-cloud-builds/src/circleci/ios/Gemfile": "./Gemfile",
        }, {
            "IOS_TEAM_ID": config.iOSTeamId,
            "IOS_APPLE_ID": config.appleId,
            "IOS_DEV_PROVISION_NAME": config.iOSDevProfileName,
            "IOS_SIGNING_REPO_URL": config.privateRepoForSigning,
            "IOS_XCODE_PROJ_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcodeproj`),
            "IOS_XCODE_WORKSPACE_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcworkspace`)
        });
    };
}