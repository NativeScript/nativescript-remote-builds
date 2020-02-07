class FastlaneService {
    constructor() {
    }

    // TODO: introduce validation
    // const appstoreConnectAppId = config.env["IOS_APPSTORE_CONNECT_APP_ID"];
    // if (publishToTestflight && !appstoreConnectAppId) {
    //     // TODO: validate both cloud and local in order to fail
    //     throw new Error("appstoreConnectAppId (in .nscloudbuilds.json) required when publishing iOS apps!");
    // }

    getCustomFiles(platform) {
        const mappedFiles = {
            "node_modules/nativescript-cloud-builds/src/configs/fastlane/common/utils.rb": "./fastlane/common/utils.rb",
            [`node_modules/nativescript-cloud-builds/src/configs/fastlane/${platform}/Fastfile`]: "./fastlane/Fastfile",
            [`node_modules/nativescript-cloud-builds/src/configs/fastlane/${platform}/Gemfile`]: "./Gemfile",
        };

        return mappedFiles;
    }
}

module.exports.FastlaneService = FastlaneService;