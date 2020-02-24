const ConfigService = require("../services/common/config-service").ConfigService;
const GitBasedBuildService = require("../services/common/git-based-build-service").GitBasedBuildService;
const CircleCIService = require("../services/remotes/circle-ci-service").CircleCIService
const path = require("path");
const _ = require("lodash");

class RemoteBuildsService {
    constructor(options) {
        _.assign(this, options);
        this.isAndroid = this.platform === "android";
    }

    async build(args) {
        const [nativeProjectRoot, projectData, buildData] = args;
        projectData.nativeProjectRoot = path.relative(projectData.projectDir, nativeProjectRoot);
        this.validateArgs(buildData);
        const configService = new ConfigService();
        const config = configService.getConfig(projectData.projectDir);
        const env = configService.getEnv(projectData.projectDir);

        const cliArgs = await this._getCliArgs(buildData);

        let buildService = null;
        if (config.circleci) {
            const gitDirsPath = this.$settingsService.getProfileDir();
            const ciService = new CircleCIService(this.$httpClient, this.$fs, this.$logger, this.$cleanupService, this.platform, env.local, config.circleci)
            buildService = new GitBasedBuildService(this.$childProcess, this.$fs, this.$logger, this.$cleanupService, ciService, gitDirsPath, this.platform);
        } else {
            // TODO: refer a README section
            throw new Error("Unsupported build service.");
        }

        const appOutputPath = this._getAppOutputPath(projectData, buildData);
        const cliVersion = this.$staticConfig.version;
        const envDependencies = {
            cliVersion,
            cocoapodsVersion: config.cocoapodsVersion || "1.8.4"
        }
        const buildLevelLocalEnvVars = env.local || {};
        const buildLevelRemoteEnvVars = env.remote || {};

        await this.validateRemoteEnvVars(buildService, cliArgs, buildLevelRemoteEnvVars);
        await buildService.build({
            envDependencies,
            buildLevelLocalEnvVars,
            buildLevelRemoteEnvVars,
            projectData,
            cliArgs,
            appOutputPath
        });
    }

    async validateRemoteEnvVars(buildService, cliArgs, buildLevelRemoteEnvVars) {
        if (!buildService.getRequiredEnvVars) {
            return;
        }

        const requiredEnvVars = buildService.getRequiredEnvVars(this.platform, cliArgs);
        if (!requiredEnvVars || !requiredEnvVars.length) {
            return;
        }

        const remoteEnvVars = await buildService.getRemoteEnvVariables(requiredEnvVars.map(v => v.name));
        for (const envVar of requiredEnvVars) {
            if (!remoteEnvVars[envVar.name] && !buildLevelRemoteEnvVars[envVar.name]) {
                throw new Error(`The specified remote environment variables are not properly configured. Error: "${envVar.errorIfMissing}".`);
            }
        }
    }

    validateArgs(buildData) {
        const publish = !!(buildData.env && buildData.env.remotePublish);
        if (publish && (!buildData.release || !buildData.buildForDevice)) {
            throw new Error("Only release builds for device can be published!");
        }
    }

    _getAppOutputPath(projectData, buildData) {
        const isIOSSimulator = !this.isAndroid && !buildData.buildForDevice;
        const platformData = this.$platformsDataService.getPlatformData(this.platform, projectData);
        const localAppDirectory = platformData.getBuildOutputPath(buildData);
        const outputFileName = this.isAndroid ? `app-${buildData.release ? "release" : "debug"}` : projectData.projectName;
        const appExtension = this.isAndroid ? (buildData.androidBundle ? ".aab" : ".apk") : (isIOSSimulator ? ".app" : ".ipa");
        const targetFilePath = path.join(localAppDirectory, `${outputFileName}${appExtension}`);

        return targetFilePath;
    }

    _getCliArgs(buildData) {
        const cliArgs = {
            "env.local": "true"
        };

        Object.keys(buildData.env).map(envArg => {
            _.assign(cliArgs, this._getCliArgsFromObj(buildData.env, envArg, `env.${envArg}`));
        });

        cliArgs["log"] = this.$logger.getLevel();
        _.assign(cliArgs, this._getCliArgsFromObj(buildData, "release"));
        _.assign(cliArgs, this._getCliArgsFromObj(buildData, "buildForDevice", "forDevice"));
        _.assign(cliArgs, this._getCliArgsFromObj(buildData, "hmr"));
        _.assign(cliArgs, this._getCliArgsFromObj(buildData, "clean"));
        _.assign(cliArgs, this._getCliArgsFromObj(buildData, "androidBundle", "aab"));
        if (this.isAndroid) {
            if (buildData.keyStorePath) {
                const base64KeyStore = this.$fs.readFile(buildData.keyStorePath, { encoding: 'base64' });
                // TODO: docs
                cliArgs["keyStore"] = base64KeyStore;
            }

            _.assign(cliArgs, this._getCliArgsFromObj(buildData, "keyStorePassword"));
            _.assign(cliArgs, this._getCliArgsFromObj(buildData, "keyStoreAlias"));
            _.assign(cliArgs, this._getCliArgsFromObj(buildData, "keyStoreAliasPassword"));
        } else {
            _.assign(cliArgs, this._getCliArgsFromObj(buildData, "teamId"));
            _.assign(cliArgs, this._getCliArgsFromObj(buildData, "provision"));
        }

        return cliArgs;
    }

    _getCliArgsFromObj(object, propertyName, argName) {
        const result = {};
        argName = argName || propertyName;
        let envValue = object[propertyName];
        if (typeof envValue === "boolean") {
            if (envValue) {
                result[`${argName}`] = "true";
            } else {
                result[`${argName}`] = "false";
            }
        } else if (typeof envValue !== "undefined") {
            if (!Array.isArray(envValue)) {
                envValue = [envValue];
            }

            envValue.map((value) => result[argName] = value);
        }

        return result;
    }
}

module.exports.RemoteBuildsService = RemoteBuildsService;