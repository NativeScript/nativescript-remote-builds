const GitService = require("../services/git-service").GitService;
const ConfigService = require("../services/config-service").ConfigService;
const GitBasedBuildService = require("../services/git-based-build-service").GitBasedBuildService;
const CircleCIService = require("../services/circle-ci-service").CircleCIService
const path = require("path");
const _ = require("lodash");

class CloudBuildService {
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
        const cliArgs = await this._getCliArgs(buildData);

        let buildService = null;
        if (config.circleci) {
            const gitDirsPath = this.$settingsService.getProfileDir();
            const gitService = new GitService(this.$childProcess, this.$fs, this.$logger, gitDirsPath, projectData.projectIdentifiers[this.platform], projectData.projectDir);
            const ciService = new CircleCIService(this.$httpClient, this.$fs, this.$logger, this.platform, config.circleci)
            buildService = new GitBasedBuildService(this.$fs, this.$logger, this.platform, gitService, ciService);
        } else {
            throw new Error("Unsupported build service: TODO: refer something from the README.");
        }

        const appOutputPath = this._getAppOutputPath(projectData, buildData);
        const cliVersion = this.$staticConfig.version;
        // TODO: obj
        await buildService.build(projectData, cliVersion, cliArgs, config.env, appOutputPath);
    }

    validateArgs(buildData) {
        const publish = !!(buildData.env && buildData.env.cloudPublish);
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
        const cliArgs = {};
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
                result[`${argName}`] = "1";
            }
        } else if (typeof envValue !== "undefined") {
            if (!Array.isArray(envValue)) {
                envValue = [envValue];
            }

            envValue.map((value) => result[`${argName}=${value}`]);
        }

        return result;
    }
}

module.exports.CloudBuildService = CloudBuildService;