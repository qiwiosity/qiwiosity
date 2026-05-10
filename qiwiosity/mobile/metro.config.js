/**
 * Metro configuration for Qiwiosity mobile (monorepo-aware).
 *
 * Because this project lives inside an npm-workspaces monorepo, most
 * dependencies are hoisted to the parent `qiwiosity/node_modules`.
 * Metro needs to be told:
 *   1. watchFolders — where to find source + hoisted deps
 *   2. nodeModulesPaths — where to resolve `require()` calls
 *   3. blockList — folders to *skip* watching (avoids EACCES on Windows)
 *
 * When you switch back to a full dev-build (expo prebuild), this config
 * still works — it's additive, not restrictive.
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;                        // .../qiwiosity/mobile
const monorepoRoot = path.resolve(projectRoot, '..'); // .../qiwiosity

const config = getDefaultConfig(projectRoot);

// 1. Watch the monorepo root so Metro can see hoisted node_modules
config.watchFolders = [monorepoRoot];

// 2. Tell Metro where to resolve modules — mobile's own first, then parent
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. On web, redirect react-native-maps to a no-op shim (it uses native-only APIs)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'src', 'shims', 'react-native-maps.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 4. Block directories that cause EACCES / aren't needed for mobile
//    (other workspaces, database scripts, tools, etc.)
config.resolver.blockList = [
  // Avoid scanning sibling workspace folders
  new RegExp(path.resolve(monorepoRoot, 'admin', '.*').replace(/\\/g, '\\\\')),
  new RegExp(path.resolve(monorepoRoot, 'database', '.*').replace(/\\/g, '\\\\')),
  new RegExp(path.resolve(monorepoRoot, 'tools', '.*').replace(/\\/g, '\\\\')),
  new RegExp(path.resolve(monorepoRoot, 'content', '.*').replace(/\\/g, '\\\\')),
  new RegExp(path.resolve(monorepoRoot, 'images', '.*').replace(/\\/g, '\\\\')),
  new RegExp(path.resolve(monorepoRoot, '_archive', '.*').replace(/\\/g, '\\\\')),
];

module.exports = config;
