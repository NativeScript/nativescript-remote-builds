const CloudBuildService = require("../services/cloud-build-service").CloudBuildService;

module.exports = (platform) => {
    return ($staticConfig, $childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
        if (process.env.CI) {
            // TODO: replace with --env.local ?
            // do not override the native build in CI env
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
