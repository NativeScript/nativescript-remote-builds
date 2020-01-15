const CircleCIBuildService = require("../circleci/circle-ci-build-service").CircleCIBuildService;

module.exports = ($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    const buildService = new CircleCIBuildService(
        $childProcess,
        $fs,
        $logger,
        $platformsDataService,
        $settingsService,
        $httpClient,
        "android");

    return (args) => {
        return buildService.build(args);
    };
}
