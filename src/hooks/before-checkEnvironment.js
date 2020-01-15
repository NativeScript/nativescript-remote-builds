module.exports = ($childProcess, $fs, $logger, $platformsDataService, $settingsService, $httpClient) => {
    return (args) => {
        // TODO: do not skip if the command is tns doctor
        console.log("skipping doctor!!!");
        return {
            canExecute: true
        };
    };
}
