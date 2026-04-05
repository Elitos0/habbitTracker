const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .wasm files for expo-sqlite web support
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), "wasm"];

// Add COOP/COEP headers required for OPFS SharedArrayBuffer (expo-sqlite web)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
