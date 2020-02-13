module.exports = () => {
    if (process.argv.indexOf("doctor") > -1) {
        // really check the env on `tns doctor`
        return;
    }

    return () => {
        return {
            canExecute: true
        };
    };
}
