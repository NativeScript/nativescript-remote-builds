const constants = require("../../constants");
const uniqueString = require('unique-string');
const path = require("path");
const childProcess = require("child_process");
const _ = require("lodash");

class SshBuildService {
    constructor($fs, $logger, $childProcess, platform) {
        this.$fs = $fs;
        this.$logger = $logger;
        this.platform = platform;
        this.$childProcess = $childProcess;
    }

    async getRemoteEnvVariables(envVarNames) {
    }

    async build(buildOptions) {
        const { envDependencies, buildLevelRemoteEnvVars, cliArgs, projectData, appOutputPath } = buildOptions;

        // Upload project
        const cliBuildId = uniqueString();
        await this.$childProcess.spawnFromEvent("ssh", [`rvladimiriov@192.168.0.126`, `mkdir -p /tmp/${cliBuildId}/`], "close",
            { stdio: "inherit" });
            // TODO: Copy files without node_modules and platforms
        await this.$childProcess.spawnFromEvent("scp", ["-r", projectData.projectDir, `rvladimiriov@192.168.0.126:/tmp/${cliBuildId}/`], "close", { stdio: "pipe" });

        await this.$childProcess.spawnFromEvent("ssh", [`rvladimiriov@192.168.0.126`, `cd /tmp/${cliBuildId}/${path.basename(projectData.projectDir)}; source ~/.bashrc; rm -rf platforms; tns build android --disableNpmInstall --env.local --copy-to ./${projectData.projectName}.apk`], "close",
            { stdio: "inherit" });

        this.$fs.ensureDirectoryExists(path.dirname(appOutputPath));
        await this.$childProcess.spawnFromEvent("scp", [`rvladimiriov@192.168.0.126:/tmp/${cliBuildId}/${path.basename(projectData.projectDir)}/${projectData.projectName}.apk`, appOutputPath], "close", { stdio: "inherit" });

        this.$logger.info(`Successfully downloaded: ${appOutputPath}`);
    }

    async updateCLIArgEnvVariable(argName, value, cliBuildId) {
        // const envName = `CLI_ARG_${argName}`;
        // await this.updateBuildEnvVariable(envName, value, cliBuildId);
    }

    async updateBuildEnvVariable(envVarName, value, cliBuildId) {
        // envVarName = `${_.snakeCase(envVarName).toUpperCase()}_${cliBuildId}`;
        // await this.ciService.updateRemoteEnvVariable(envVarName, value);
        // this.buildEnvVars = this.buildEnvVars || {};
        // this.buildEnvVars[cliBuildId] = this.buildEnvVars[cliBuildId] || [];
        // this.buildEnvVars[cliBuildId].push(envVarName);
    }

    async cleanEnvVars(cliBuildId) {
        // if (this.buildEnvVars[cliBuildId] && this.buildEnvVars[cliBuildId].length) {
        //     for (const envVar of this.buildEnvVars[cliBuildId]) {
        //         await this.ciService.deleteRemoteEnvVariable(envVar);
        //     }
        // }
    }
}

module.exports.SshBuildService = SshBuildService;