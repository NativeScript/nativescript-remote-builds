const RemoteBuildsService = require("../services/remote-builds-service").RemoteBuildsService;

module.exports = (platform) => {
    return (hookArgs, $staticConfig, $childProcess, $fs, $logger, $cleanupService, $platformsDataService, $settingsService, $httpClient) => {
        if ((hookArgs.buildData || hookArgs.androidBuildData || hookArgs.iOSBuildData).env.local) {
            // let the local build
            return;
        }

        const buildService = new RemoteBuildsService({
            $staticConfig,
            $childProcess,
            $fs,
            $logger,
            $platformsDataService,
            $settingsService,
            $httpClient,
            $cleanupService,
            platform
        });

        return buildService.build.bind(buildService);
    }
}
