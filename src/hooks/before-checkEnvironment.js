module.exports = () => {
    return () => {
        // TODO: do not skip if the command is tns doctor
        return {
            canExecute: true
        };
    };
}
