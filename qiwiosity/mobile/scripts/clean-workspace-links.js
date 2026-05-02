/**
 * Removes npm workspace symlinks from the parent node_modules that cause
 * EACCES errors on Windows when Metro's file walker tries to lstat them.
 *
 * Run automatically via the "prestart" / "preexpo-go" npm scripts.
 */
const fs = require('fs');
const path = require('path');

const parentNodeModules = path.resolve(__dirname, '..', '..', 'node_modules');

try {
  const entries = fs.readdirSync(parentNodeModules);
  for (const entry of entries) {
    if (entry.startsWith('.qiwiosity-')) {
      const fullPath = path.join(parentNodeModules, entry);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`Cleaned workspace symlink: ${entry}`);
      } catch (e) {
        // If we can't delete it either, skip silently
      }
    }
  }
} catch (e) {
  // Parent node_modules doesn't exist — nothing to clean
}
