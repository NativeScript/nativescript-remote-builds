const path = require("path");
const constants = require("../../constants");

class ConfigService {
    getConfig(projectDir) {
        let config = {};
        const configLocation = path.join(projectDir, constants.configFileName);
        try {
            config = require(configLocation);
        } catch (e) {
            throw new Error(`${configLocation} is required.`);
        }

        return config;
    }

    getEnv(projectDir) {
        let env;
        const envLocation = path.join(projectDir, constants.envFileName);
        try {
            env = require(envLocation);
        } catch (e) {
            env = {};
        }

        return env;
    }
}

module.exports.ConfigService = ConfigService;