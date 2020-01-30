
module.exports = (hookArgs) => {
    return (args) => {
        // commandName: string, commandArguments: string[], argv: string[]
        var [commandName, commandArguments, argv] = args;
        if (commandName === "publish") {
            commandName = "build";
            argv.push("--env.cloudPublish");
        }

        return { commandName, commandArguments, argv };
    };
}
