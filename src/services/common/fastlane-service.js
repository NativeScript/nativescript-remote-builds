class FastlaneService {
    constructor() {
    }

    getRequiredEnvVars(platform, cliArgs) {
        const shouldPublish = !!cliArgs["env.remotePublish"];
        const requiredArgs = [];
        if (platform === "android") {
            if (shouldPublish) {
                requiredArgs.push({
                    name: "PLAYSTORE_ACCOUNT_BASE_64_JSON",
                    // TODO: refer README
                    errorIfMissing: "'PLAYSTORE_ACCOUNT_BASE_64_JSON' required in order to publish Android apps."
                });
            }
        } else {
            // TODO: refer README
            const iosBuildError = "required when building iOS apps."
            requiredArgs.push({
                name: "IOS_SIGNING_REPO_URL",
                errorIfMissing: `'IOS_SIGNING_REPO_URL' ${iosBuildError}`
            });
            requiredArgs.push({
                name: "MATCH_PASSWORD",
                errorIfMissing: `'MATCH_PASSWORD' ${iosBuildError}`
            });
            if (shouldPublish) {
                // TODO: refer README
                const iosPublishError = "required in order to publish iOS apps.";
                requiredArgs.push({
                    name: "IOS_APPSTORE_CONNECT_APP_ID",
                    errorIfMissing: `'IOS_APPSTORE_CONNECT_APP_ID' ${iosPublishError}`
                });
                requiredArgs.push({
                    name: "IOS_APPLE_ID",
                    errorIfMissing: `'IOS_APPLE_ID' ${iosBuildError}`
                });

                requiredArgs.push({
                    name: "FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD",
                    errorIfMissing: `'FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD' ${iosPublishError}`
                });
            }
        }

        return requiredArgs;
    }

    getCustomFiles(platform) {
        const mappedFiles = {
            "node_modules/nativescript-remote-builds/src/configs/fastlane/common/utils.rb": "./fastlane/common/utils.rb",
            [`node_modules/nativescript-remote-builds/src/configs/fastlane/${platform}/Fastfile`]: "./fastlane/Fastfile",
            [`node_modules/nativescript-remote-builds/src/configs/fastlane/${platform}/Gemfile`]: "./Gemfile",
        };

        return mappedFiles;
    }
}

module.exports.FastlaneService = FastlaneService;