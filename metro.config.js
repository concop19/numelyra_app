const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker imports wa-sqlite.wasm as a bundled asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
