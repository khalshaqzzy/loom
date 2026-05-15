const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(workspaceRoot, 'packages')];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@loom/contracts': path.resolve(workspaceRoot, 'packages/contracts/src'),
  '@loom/decision-tree': path.resolve(workspaceRoot, 'packages/decision-tree/src')
};

module.exports = config;
