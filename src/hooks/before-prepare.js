module.exports = (hookArgs) => {
    if (hookArgs.prepareData.env.local) {
        // local build
        return;
    }

    hookArgs.prepareData = hookArgs.prepareData || {};
    hookArgs.prepareData.nativePrepare = hookArgs.prepareData.nativePrepare || {};
    hookArgs.prepareData.nativePrepare.skipNativePrepare = true;
}
