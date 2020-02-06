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
        } catch (e) {
            throw new Error(`${configLocation} is required.`);
        }

        return this.config;
    }
}

module.exports.ConfigService = ConfigService;