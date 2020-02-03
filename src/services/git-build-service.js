const GitService = require("../services/git-service").GitService;
const constants = require("../common/constants");
const uniqueString = require('unique-string');
const path = require("path");

class GitBuildService {
    constructor($staticConfig,
        $childProcess,
        $fs,
        $logger,
        $platformsDataService,
        $settingsService,
        $httpClient,
        platform,
        sshCloudSyncGitRepository,
        ciService) {
        // TODO: validate all methods of ciService
        this.ciService = ciService;
        this.remoteUrl = sshCloudSyncGitRepository;
        this.$staticConfig = $staticConfig;
        this.$childProcess = $childProcess;
        this.$fs = $fs;
        this.$logger = $logger;
        this.$platformsDataService = $platformsDataService;
        this.$settingsService = $settingsService;
        this.$httpClient = $httpClient;
        this.platform = platform;
        this.isAndroid = this.platform === "android";
        this.gitService = new GitService(this.$childProcess, this.$fs, this.$logger, this.$settingsService.getProfileDir());
    }

    async pushToSyncRepository(args, additionalMappedFiles, additionalPlaceholders, cliBuildId) {
        const [projectRoot, projectData, buildData] = args;
        var mappedFiles = {
            [`node_modules/nativescript-cloud-builds/src/common/safe-config.json`]: constants.configFileName
        };
        if (additionalMappedFiles) {
            mappedFiles = Object.assign(mappedFiles, additionalMappedFiles);
        }
        var placeholders = {
            "PROJECT_NAME": projectData.projectName,
            "PROJECT_DIR": `~/${projectData.projectName}`,
            "OUTPUT_DIR": "~/output",
            "PROJECT_ID": projectData.projectIdentifiers[this.platform],
            "CLI_VERSION": this.$staticConfig.version
        };

        if (additionalPlaceholders) {
            placeholders = Object.assign(placeholders, additionalPlaceholders);
        }

        const commitRevision = await this.gitService.gitPushChanges(
            { projectDir: projectData.projectDir, projectId: projectData.projectIdentifiers[this.platform] },
            { httpRemoteUrl: this.remoteUrl },
            mappedFiles,
            placeholders,
            cliBuildId);

        return commitRevision;
    }


    async build(cliArgs, additionalMappedFiles, additionalPlaceholders) {
        // projectRoot: string, projectData: IProjectData, buildData: IAndroidBuildData
        const [projectRoot, projectData, buildData] = cliArgs;
        const cliBuildId = uniqueString();
        // TODO: test if the repo is not integrated with circle ci.
        await this.uploadCLIArgsAsEnvVars(buildData, cliBuildId);

        // TODO: validate CircleCI related config values
        var mappedFiles = {
            [`node_modules/nativescript-cloud-builds/src/circleci/${this.platform}/config.yml`]: "./.circleci/config.yml"
        };

        if (additionalMappedFiles) {
            mappedFiles = Object.assign(mappedFiles, additionalMappedFiles);
        }

        var placeholders = {
            "CLI_BUILD_ID": cliBuildId,
        };

        if (additionalPlaceholders) {
            placeholders = Object.assign(placeholders, additionalPlaceholders);
        }

        const commitRevision = await this.pushToSyncRepository(cliArgs, mappedFiles, placeholders, cliBuildId);
        const circleCIJobId = await this.ciService.getBuildNumber(commitRevision);
        const isSuccessfulBuild = await this.ciService.isSuccessfulBuild(circleCIJobId);
        await this.cleanEnvVars(cliBuildId);
        await this.gitService.gitDeleteBranch(
            { projectDir: projectData.projectDir, projectId: projectData.projectIdentifiers[this.platform] },
            cliBuildId
        )

        if (!isSuccessfulBuild) {
            throw new Error("Cloud build failed.");
        }

        const platformData = this.$platformsDataService.getPlatformData(this.platform, projectData);
        const localAppDirectory = platformData.getBuildOutputPath(buildData);
        this.$logger.info("Downloading build result.");
        const isIOSSimulator = !this.isAndroid && !buildData.buildForDevice;
        const cloudFilePath = this.isAndroid ? "app.apk" :
            isIOSSimulator ?
                `${projectData.projectName}.app.zip` :
                `${projectData.projectName}.ipa`;

        const outputFileName = this.isAndroid ? `app-${buildData.release ? "release" : "debug"}` : projectData.projectName;
        const appExtension = this.isAndroid ? ".apk" : isIOSSimulator ? ".app.zip" : ".ipa";
        const targetFilePath = path.join(localAppDirectory, `${outputFileName}${appExtension}`);
        let localBuildResult = await this.ciService.downloadBuildArtefact(circleCIJobId, cloudFilePath, targetFilePath);
        localBuildResult = await this.handleDownloadedApp(localAppDirectory, localBuildResult, isIOSSimulator, buildData.androidBundle);
    }

    async handleDownloadedApp(localAppDirectory, localAppPath, isIOSSimulator, isAndroidBundle) {
        if (localAppPath) {
            if (isIOSSimulator) {
                await this.$fs.unzip(localAppPath, localAppDirectory);
                // we are archiving the app folder for simulators in the cloud
                // <path-to-the-app>.app.zip => <path-to-the-app>.app
                localAppPath = this.removeExtension(localAppPath);
            }
            if (isAndroidBundle) {
                // we are passing --copy-to=<path>.apk in the cloud (even when --aab is passed)
                // <path-to-the-app>.apk => <path-to-the-app>.aab
                const aabPath = this.removeExtension(localAppPath) + '.aab';
                this.$fs.rename(localAppPath, aabPath);
                localAppPath = aabPath;
            }
            this.$logger.info(`Successfully downloaded: ${localAppPath}`);
        }
        else {
            throw new Error("Failed to download build result.");
        }
        return localAppPath;
    }

    async cleanEnvVars(cliBuildId) {
        if (this.buildEnvVars[cliBuildId] && this.buildEnvVars[cliBuildId].length) {
            for (const envVar of this.buildEnvVars[cliBuildId]) {
                await this.ciService.deleteEnvVariable(envVar);
            }
        }
    }

    async uploadCLIArgsAsEnvVars(buildData, cliBuildId) {
        // TODO: pass dynamic list of arg names to the templates
        await this.handleEnv(buildData.env, cliBuildId);
        await this.updateCLIEnvVariable("log", this.$logger.getLevel(), cliBuildId);
        if (buildData.release) {
            await this.updateCLIEnvVariable("release", "1", cliBuildId);
        }
        if (buildData.hmr) {
            await this.updateCLIEnvVariable("hmr", "1", cliBuildId);
        }
        if (buildData.clean) {
            await this.updateCLIEnvVariable("clean", "1", cliBuildId);
        }
        if (buildData.androidBundle) {
            await this.updateCLIEnvVariable("aab", "1", cliBuildId);
        }

        if (this.isAndroid) {
            if (buildData.keyStorePath) {
                const base64KeyStore = await this.$fs.readFile(buildData.keyStorePath, { encoding: 'base64' });
                await this.updateCLIEnvVariable("keyStore", base64KeyStore, cliBuildId);
            }
            if (buildData.keyStorePassword) {
                await this.updateCLIEnvVariable("keyStorePassword", buildData.keyStorePassword, cliBuildId);
            }
            if (buildData.keyStoreAlias) {
                await this.updateCLIEnvVariable("keyStoreAlias", buildData.keyStoreAlias, cliBuildId);
            }
            if (buildData.keyStoreAliasPassword) {
                await this.updateCLIEnvVariable("keyStoreAliasPassword", buildData.keyStoreAliasPassword, cliBuildId);
            }
        }
    }

    async handleEnv(envObj, cliBuildId) {
        const handleEnvParam = async (item, buildId) => {
            let envValue = envObj[item];
            if (typeof envValue === "undefined") {
                return;
            }
            if (typeof envValue === "boolean") {
                if (envValue) {
                    await this.updateCLIEnvVariable(`--env.${item}`, "1", buildId);
                }
            } else {
                if (!Array.isArray(envValue)) {
                    envValue = [envValue];
                }

                await this.updateCLIEnvVariable(`--env.${item}`, value, buildId);
            }
        }

        return Promise.all(Object.keys(envObj).map(item => handleEnvParam(item, cliBuildId)));
    }

    removeExtension(filePath) {
        return path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
    }

    async updateCLIEnvVariable(name, value, cliBuildId) {
        // TODO: add lodash dep to the plugin
        const envName = `CLI_ARG_${_.snakeCase(name).toUpperCase()}_${cliBuildId}`;
        await this.ciService.updateEnvVariable(envName, value);
        this.buildEnvVars = this.buildEnvVars || {};
        this.buildEnvVars[cliBuildId] = this.buildEnvVars[cliBuildId] || [];
        this.buildEnvVars[cliBuildId].push(envName);
    }
}

module.exports.GitBuildService = GitBuildService;