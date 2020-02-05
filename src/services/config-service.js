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
            if (!this.config.circleci || !this.config.circleci.sshCloudSyncGitRepository || !this.config.circleci.sshCloudSyncGitRepository.startsWith(githubSshUrlStart)) {
                throw new Error(`"circleci.sshCloudSyncGitRepository" should be a valid github ssh URL. Received: ${this.config.sshCloudSyncGitRepository}`);
            }

            this.config.cloudSyncGitRepositoryName = this.config.circleci.sshCloudSyncGitRepository.replace(/\.git/g, "").substring(githubSshUrlStart.length);
        } catch (e) {
            throw new Error(`${configLocation} is required.`);
        }

        return this.config;
    }
}

module.exports.ConfigService = ConfigService;