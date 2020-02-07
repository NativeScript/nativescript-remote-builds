module.exports = ($commandsService) => {
    if ($commandsService.currentCommandData.commandName === "doctor") {
        // really check the env on `tns doctor`
        return;
    }

    return () => {
        return {
            canExecute: true
        };
    };
}
