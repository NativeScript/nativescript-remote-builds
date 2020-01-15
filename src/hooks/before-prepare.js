module.exports = (hookArgs) => {
    if (!process.env.FORCE_NATIVE_PREPARE) {
        hookArgs.prepareData = hookArgs.prepareData || {};
        hookArgs.prepareData.nativePrepare = hookArgs.prepareData.nativePrepare || {};
        hookArgs.prepareData.nativePrepare.skipNativePrepare = true;
    }
}
