
module.exports = (hookArgs) => {
    return (args) => {
        // commandName: string, commandArguments: string[], argv: string[]
        var [commandName, commandArguments, argv] = args;
        if (commandName === "publish") {
            commandName = "build";
            argv.push("--env.publish");
        }

        return { commandName, commandArguments, argv };
    };
}
