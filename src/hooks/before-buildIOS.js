const GitBuildService = require("../services/git-build-service").GitBuildService;
const ConfigService = require("../services/config-service").ConfigService;
const CircleCIService = require("../circleci/circle-ci-service").CircleCIService
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
        const buildService = new GitBuildService(
            $staticConfig,
            $childProcess,
            $fs,
            $logger,
            $platformsDataService,
            $settingsService,
            $httpClient,
            "ios",
            config.sshCloudSyncGitRepository,
            new CircleCIService(
                $httpClient,
                $fs,
                $logger,
                config.cloudSyncGitRepository
            ));
        nativeProjectRoot = path.relative(projectData.projectDir, nativeProjectRoot);

        const appstoreConnectAppId = config.appstoreConnectAppId;
        if (publishToTestflight && !appstoreConnectAppId) {
            $logger.fail("appstoreConnectAppId (in .nscloudbuilds.json) required when publishing!");
        }

        return buildService.build(args, {
            "node_modules/nativescript-cloud-builds/src/fastlane/ios/Fastfile": "./fastlane/Fastfile",
            "node_modules/nativescript-cloud-builds/src/fastlane/ios/Matchfile": "./fastlane/Matchfile",
            "node_modules/nativescript-cloud-builds/src/fastlane/ios/Gemfile": "./Gemfile",
        }, {
            "IOS_APPLE_ID": config.appleId,
            "IOS_SIGNING_REPO_URL": config.iOSSigningPrivateGithubRepository,
            "IOS_XCODE_PROJ_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcodeproj`),
            "IOS_XCODE_WORKSPACE_PATH": path.join(nativeProjectRoot, `${projectData.projectName}.xcworkspace`),
            "IOS_BUILD_FOR_SIMULATOR": !buildData.buildForDevice,
            "IOS_PROVISION_TYPE": config.provisionType || (buildData.release ? "appstore" : "development"),
            "IOS_BUILD_TYPE": config.buildType || (buildData.release ? "app-store" : "development"),
            "IOS_BUILD_CONFIGURATION": buildData.release ? "Release" : "Debug",
            "IOS_APPSTORE_CONNECT_APP_ID": appstoreConnectAppId
        });
    };
}