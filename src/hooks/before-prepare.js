module.exports = (hookArgs) => {
    if (process.env.CI) {
        // do not skip the native prepare in the cloud CI
        return;
    }

    hookArgs.prepareData = hookArgs.prepareData || {};
    hookArgs.prepareData.nativePrepare = hookArgs.prepareData.nativePrepare || {};
    hookArgs.prepareData.nativePrepare.skipNativePrepare = true;
}
