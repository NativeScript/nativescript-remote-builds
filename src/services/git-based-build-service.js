const constants = require("../common/constants");
const uniqueString = require('unique-string');
const path = require("path");
const _ = require("lodash");

class GitBasedBuildService {
    constructor($fs, $logger, platform, gitService, ciService) {
        this.$fs = $fs;
        this.$logger = $logger;
        this.platform = platform;
        this.gitService = gitService;
        // TODO: validate all methods of ciService
        this.ciService = ciService;
        this.remoteUrl = ciService.sshCloudSyncGitRepository;
    }

    async build(buildOptions) {
        const { projectData, cliVersion, cliArgs, envVars, appOutputPath } = buildOptions;
        const cliBuildId = uniqueString();
        for (const arg in cliArgs) {
            await this.updateCLIArgEnvVariable(arg, cliArgs[arg], cliBuildId);
        }

        for (const varName in envVars) {
            await this.updateBuildEnvVariable(varName, envVars[varName], cliBuildId);
        }

        const mappedFiles = this.ciService.getCustomFiles();
        mappedFiles[`node_modules/nativescript-cloud-builds/src/configs/safe-config.json`] = constants.configFileName;

        const outputAppFilename = path.basename(appOutputPath);
        const placeholders = {
            "CLI_VERSION": cliVersion,
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

        // TODO: handle build errors
        const { buildNumber, isSuccessful } = await this.ciService.build(commitRevision);
        await this.cleanEnvVars(cliBuildId);
        await this.gitService.gitDeleteBranch(cliBuildId);
        if (!isSuccessful) {
            throw new Error("Cloud build failed. Open the link above for more details.");
        }

        this.$logger.info("Downloading build result.");
        // TODO: handle download errors
        await this.ciService.downloadBuildArtefact(buildNumber, outputAppFilename, appOutputPath);
        this.$logger.info(`Successfully downloaded: ${appOutputPath}`);
    }

    async updateCLIArgEnvVariable(argName, value, cliBuildId) {
        const envName = `CLI_ARG_${argName}`;
        await this.updateBuildEnvVariable(envName, value, cliBuildId);
    }

    async updateBuildEnvVariable(envVarName, value, cliBuildId) {
        envVarName = `${_.snakeCase(envVarName).toUpperCase()}_${cliBuildId}`;
        await this.ciService.updateEnvVariable(envVarName, value);
        this.buildEnvVars = this.buildEnvVars || {};
        this.buildEnvVars[cliBuildId] = this.buildEnvVars[cliBuildId] || [];
        this.buildEnvVars[cliBuildId].push(envVarName);
    }

    async cleanEnvVars(cliBuildId) {
        if (this.buildEnvVars[cliBuildId] && this.buildEnvVars[cliBuildId].length) {
            for (const envVar of this.buildEnvVars[cliBuildId]) {
                await this.ciService.deleteEnvVariable(envVar);
            }
        }
    }
}

module.exports.GitBasedBuildService = GitBasedBuildService;