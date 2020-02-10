const constants = require("../../constants");
const uniqueString = require('unique-string');
const path = require("path");
const _ = require("lodash");

class GitBasedBuildService {
    constructor($fs, $logger, platform, gitService, ciService) {
        this.$fs = $fs;
        this.$logger = $logger;
        this.platform = platform;
        this.gitService = gitService;
        // TODO: document all required methods of a ciService
        this.ciService = ciService;
        this.remoteUrl = ciService.sshRepositoryURL;
    }

    getRequiredEnvVars(platform, cliArgs) {
        return this.ciService.getRequiredEnvVars(platform, cliArgs);
    }

    async getRemoteEnvVariables(envVarNames) {
        const remoteEnvVars = await this.ciService.getRemoteEnvVariables(envVarNames);
        return remoteEnvVars;
    }

    async build(buildOptions) {
        const { envDependencies, buildLevelRemoteEnvVars, cliArgs, projectData, appOutputPath } = buildOptions;
        const cliBuildId = uniqueString();
        for (const arg in cliArgs) {
            await this.updateCLIArgEnvVariable(arg, cliArgs[arg], cliBuildId);
        }

        for (const varName in buildLevelRemoteEnvVars) {
            await this.updateBuildEnvVariable(varName, buildLevelRemoteEnvVars[varName], cliBuildId);
        }

        const mappedFiles = this.ciService.getCustomFiles();
        mappedFiles[`node_modules/nativescript-remote-builds/src/configs/safe-config.json`] = constants.configFileName;
        mappedFiles[`node_modules/nativescript-remote-builds/src/configs/safe-config.json`] = constants.envFileName;

        const outputAppFilename = path.basename(appOutputPath);
        const placeholders = {
            "CLI_VERSION": envDependencies.cliVersion,
            "IOS_COCOAPODS_VERSION": envDependencies.cocoapodsVersion,
            "CLI_BUILD_ID": cliBuildId,
            "NATIVE_PROJECT_ROOT": projectData.nativeProjectRoot,
            "PROJECT_ID": projectData.projectIdentifiers[this.platform],
            "PROJECT_NAME": projectData.projectName,
            "OUTPUT_APP_FILENAME": outputAppFilename
        };

        const commitRevision = await this.gitService.gitPushChanges(
            { httpRemoteUrl: this.remoteUrl },
            mappedFiles,
            placeholders,
            cliBuildId);

        let buildNumber, isSuccessful;
        try {
            const buildResult = await this.ciService.build(commitRevision);
            isSuccessful = buildResult.isSuccessful;
            buildNumber = buildResult.buildNumber;
        } catch (e) {
            isSuccessful = false;
            // ignore the error in order to clean the state
        }

        await this.cleanEnvVars(cliBuildId);
        await this.gitService.gitDeleteBranch(cliBuildId);
        if (!isSuccessful) {
            throw new Error("Cloud build failed. Open the link above for more details.");
        }

        this.$logger.info("Downloading build result.");
        await this.ciService.downloadBuildArtefact(buildNumber, outputAppFilename, appOutputPath);
        this.$logger.info(`Successfully downloaded: ${appOutputPath}`);

    }

    async updateCLIArgEnvVariable(argName, value, cliBuildId) {
        const envName = `CLI_ARG_${argName}`;
        await this.updateBuildEnvVariable(envName, value, cliBuildId);
    }

    async updateBuildEnvVariable(envVarName, value, cliBuildId) {
        envVarName = `${_.snakeCase(envVarName).toUpperCase()}_${cliBuildId}`;
        await this.ciService.updateRemoteEnvVariable(envVarName, value);
        this.buildEnvVars = this.buildEnvVars || {};
        this.buildEnvVars[cliBuildId] = this.buildEnvVars[cliBuildId] || [];
        this.buildEnvVars[cliBuildId].push(envVarName);
    }

    async cleanEnvVars(cliBuildId) {
        if (this.buildEnvVars[cliBuildId] && this.buildEnvVars[cliBuildId].length) {
            for (const envVar of this.buildEnvVars[cliBuildId]) {
                await this.ciService.deleteRemoteEnvVariable(envVar);
            }
        }
    }
}

module.exports.GitBasedBuildService = GitBasedBuildService;