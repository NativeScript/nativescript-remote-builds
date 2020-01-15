const CircleCIBuildService = require("../circleci/circle-ci-build-service").CircleCIBuildService;

module.exports = ($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    if (process.env.CI) {
        // do not override the native build in the cloud CI
        return;
    }

    console.log("WILL START A CLOUD BUILD")

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
