const CircleCIBuildService = require("../circleci/circle-ci-build-service").CircleCIBuildService;
const ConfigService = require("../services/config-service").ConfigService;

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
        "android");

    return (args) => {
        var [nativeProjectRoot, projectData, buildData] = args;
        const config = configService.getConfig(projectData.projectDir);

        return buildService.build(args, config.cloudSyncGithubRepository, config.circleCiApiAccessToken);
    };
}
