import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const BAK_PATH = path.join(ROOT_DIR, '.package.json.prepack.bak');

/**
 * Restores original development package.json after npm pack or npm publish (DEV-336).
 */
export function restoreScripts() {
  if (fs.existsSync(BAK_PATH)) {
    const raw = fs.readFileSync(BAK_PATH, 'utf8');
    fs.writeFileSync(PKG_PATH, raw, 'utf8');
    fs.unlinkSync(BAK_PATH);
    // Write notice to stderr to avoid corrupting tools that consume npm pack --json stdout
    process.stderr.write('📦 [postpack] package.json restored to development state (DEV-336).\n');
  }
}

// CLI direct execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  restoreScripts();
}
