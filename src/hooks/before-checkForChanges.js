
const semver = require("semver");

module.exports = function ($staticConfig) {
    const cliVersion = semver.parse($staticConfig.version);
    if (semver.lt(cliVersion, "6.4.0-2020-01-29-151728-14101")) {
        throw new Error(`The nativescript-remote-builds requires NativeScript CLI 6.4.0.`);
    }
}