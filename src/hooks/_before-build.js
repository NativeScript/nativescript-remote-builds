const CloudBuildService = require("../services/cloud-build-service").CloudBuildService;

module.exports = (platform) => {
    return (hookArgs, $staticConfig, $childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
        if ((hookArgs.buildData || hookArgs.androidBuildData || hookArgs.iOSBuildData).env.local) {
            // let the local build
            return;
        }

        const buildService = new CloudBuildService({
            $staticConfig,
            $childProcess,
            $fs,
            $logger,
            $platformsDataService,
            $settingsService,
            $httpClient,
            platform
        });

        return buildService.build.bind(buildService);
    }
}
