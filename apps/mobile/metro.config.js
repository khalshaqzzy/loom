/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@loom/contracts": path.resolve(workspaceRoot, "packages/contracts"),
  "@loom/decision-tree": path.resolve(workspaceRoot, "packages/decision-tree"),
  zod: path.resolve(workspaceRoot, "node_modules/zod")
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zod") {
    return {
      type: "sourceFile",
      filePath: require.resolve("zod", { paths: [workspaceRoot] })
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
