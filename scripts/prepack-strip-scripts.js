import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const BAK_PATH = path.join(ROOT_DIR, '.package.json.prepack.bak');

export const ALLOWED_SHIPPED_SCRIPTS = ['gripm', 'board', 'mcp'];

/**
 * Strips development-only npm scripts from package.json before packing or publishing (DEV-336).
 * Backs up original package.json to .package.json.prepack.bak so postpack can restore it.
 */
export function stripScripts() {
  if (fs.existsSync(BAK_PATH)) {
    // If a backup already exists from a previous interrupted run, restore first to start clean
    try {
      const orig = fs.readFileSync(BAK_PATH, 'utf8');
      fs.writeFileSync(PKG_PATH, orig, 'utf8');
    } catch {
      // ignore
    }
  }

  const raw = fs.readFileSync(PKG_PATH, 'utf8');
  const pkg = JSON.parse(raw);

  // Backup original package.json
  fs.writeFileSync(BAK_PATH, raw, 'utf8');

  // Keep only the scripts that resolve files shipped in the tarball (bin/ entries)
  const filteredScripts = {};
  if (pkg.scripts) {
    for (const name of ALLOWED_SHIPPED_SCRIPTS) {
      if (pkg.scripts[name]) {
        filteredScripts[name] = pkg.scripts[name];
      }
    }
  }

  pkg.scripts = filteredScripts;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  // Write notice to stderr to avoid corrupting tools that consume npm pack --json stdout
  process.stderr.write('📦 [prepack] package.json scripts stripped for production tarball (DEV-336).\n');
}

// CLI direct execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  stripScripts();
}
