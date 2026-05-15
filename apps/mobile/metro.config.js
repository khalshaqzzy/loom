const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');
const mobileNodeModules = path.join(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.join(repoRoot, 'packages', 'contracts'),
  path.join(repoRoot, 'packages', 'decision-tree'),
];

config.resolver.nodeModulesPaths = [
  mobileNodeModules,
  path.join(repoRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@loom/contracts': path.join(repoRoot, 'packages', 'contracts'),
  '@loom/decision-tree': path.join(repoRoot, 'packages', 'decision-tree'),
  zod: path.dirname(require.resolve('zod/package.json', { paths: [mobileNodeModules] })),
};

config.resolver.unstable_enableSymlinks = true;

module.exports = config;
