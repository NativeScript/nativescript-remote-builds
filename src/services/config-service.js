const path = require("path");
const constants = require("../common/constants");

class ConfigService {
    getConfig(projectDir) {
        if (this.config) {
            return this.config;
        }

        const configLocation = path.join(projectDir, constants.configFileName);
        try {
            this.config = require(configLocation);
            const githubSshUrlStart = "git@github.com:";
            if (!this.config.sshCloudSyncGitRepository.startsWith(githubSshUrlStart)) {
                throw new Error(`"sshCloudSyncGitRepository" should be a valid github ssh URL. Received: ${this.config.sshCloudSyncGitRepository}`);
            }

            this.config.cloudSyncGitRepository = this.config.sshCloudSyncGitRepository.replace(/\.git/g, "").substring(githubSshUrlStart.length);
        } catch (e) {
            throw new Error(`${configLocation} is required.`);
        }

        return this.config;
    }
}

module.exports.ConfigService = ConfigService;