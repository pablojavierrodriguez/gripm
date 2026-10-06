/**
 * scripts/verify-changes.js — gate on staged files, runs in the pre-commit hook.
 *
 * Why this exists: the verification pyramid passed on macOS while four separate
 * defects shipped to main. Each one was invisible locally for a structural
 * reason, not for lack of rigor:
 *
 *   1. Indentation lost in ci.yml      -> the workflow file was invalid YAML and
 *                                         GitHub refused to run ANY job from it.
 *   2. `import()` on a raw path        -> Windows parses `D:\...` as a URL with
 *                                         protocol `d:`; passes on macOS forever.
 *   3. Leftover handles                -> invisible on macOS, fatal on Linux.
 *   4. Garbage characters in prose     -> shipped into docs and commit messages.
 *
 * None of those are logic errors, so `tsc`, tests and lint will never catch
 * them. Only checks aimed at those specific classes do.
 *
 * Design constraints:
 *   - Runs on **staged** content only, so it never blocks unrelated work.
 *   - Cheap: no test run, no build. It must stay under a second.
 *   - No new dependencies. YAML validation shells out to python3+PyYAML and
 *     degrades to a warning when unavailable, because a gate that fails closed
 *     on a missing interpreter is a gate people disable.
 *   - A check that cannot run is reported as SKIPPED, never as PASSED.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const problems = [];
const skipped = [];

const fail = (file, message, hint) => problems.push({ file, message, hint });

// --- staged files ------------------------------------------------------------

function stagedFiles() {
  const out = execSync('git diff --cached --name-only -z', {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split('\0').filter(Boolean);
}

/** Read the staged content, not the working tree: they can differ. */
function stagedContent(file) {
  try {
    return execSync(`git show ":${file}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

const ext = (f) => path.extname(f).toLowerCase();
const CODE = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);

// --- 1. YAML must parse ------------------------------------------------------
//
// Tabs are checked separately because a tab-indented YAML file is invalid and
// the parser error points at the line *after* the real mistake, which is what
// made the ci.yml break so annoying to diagnose.

function hasPyYaml() {
  try {
    execSync("python3 -c 'import yaml'", { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkYaml(file, content, pyyamlAvailable) {
  if (!pyyamlAvailable) {
    skipped.push(`${file}: YAML sin validar (sin python3+PyYAML; lo cubre CI)`);
    return;
  }

  try {
    execSync(`python3 -c 'import yaml,sys; yaml.safe_load(sys.stdin.read())'`, {
      input: content,
      stdio: ['pipe', 'ignore', 'pipe'],
    });
  } catch (err) {
    const detail = String(err.stderr || err.message)
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('Traceback') && !l.startsWith('  '))
      .slice(-3)
      .join(' | ');
    fail(
      file,
      `YAML inválido: ${detail}`,
      'GitHub Actions rechaza el archivo entero y no ejecuta ningún job. Revisá la indentación.',
    );
  }
}

function checkYamlNoTabs(file, content) {
  content.split('\n').forEach((line, i) => {
    if (/^\s*\t/.test(line)) {
      fail(file, `Línea ${i + 1}: tabulación en la indentación`, 'En YAML la indentación es solo con espacios.');
    }
  });
}

// --- 2. Dynamic import() must receive a file:// URL --------------------------
//
// `import('/abs/path.js')` works on macOS and throws ERR_UNSUPPORTED_ESM_URL_SCHEME
// on Windows, where the leading `C:` is parsed as a URL scheme. Newer Node
// releases are stricter about it, so this can break with no code change at all.

function checkEsmPaths(file, content) {
  const lines = content.split('\n');
  // A filesystem path built into a variable: exactly the shape that breaks on Windows.
  const pathish = /path\.(?:join|resolve|resolve\w*)|__dirname|__filename|process\.cwd\(\)/;

  lines.forEach((line, i) => {
    const dynamicImport = line.match(/(?:await\s+)?import\(\s*([A-Za-z_$][\w$.]*)\s*\)/);
    if (!dynamicImport) return;

    const identifier = dynamicImport[1];

    // Resolve the identifier back to its declaration, so the check judges the
    // actual value rather than the variable name.
    const declRe = new RegExp(
      `\\b(?:const|let|var)\\s+${identifier.replace(/\$/g, '\\$')}\\s*=\\s*([^;]+)`,
    );
    const decl = content.match(declRe)?.[1];

    if (!decl) {
      skipped.push(
        `${file}:${i + 1}: import(${identifier}) sin declaración local (usá pathToFileURL si es una ruta)`,
      );
      return;
    }
    if (/pathToFileURL/.test(decl)) return; // Correct on purpose.
    if (pathish.test(decl)) {
      fail(
        file,
        `Línea ${i + 1}: import(${identifier}) recibe una ruta del sistema de archivos`,
        'En Windows `C:\\...` se interpreta como URL con protocolo `c:` y lanza ' +
          'ERR_UNSUPPORTED_ESM_URL_SCHEME. Usá pathToFileURL(p).href',
      );
    }
  });
}

// --- 3. Encoding corruption and control characters ---------------------------
//
// Scope note: an earlier version of this check tried to flag "unexpected"
// characters and produced 63 false positives on a correct tree, because the
// repo legitimately uses box drawing, emoji, arrows, section signs and
// variation selectors. A gate that cries wolf is worse than no gate: it teaches
// people to reach for --no-verify, which is how real defects get through.
//
// So this check is deliberately narrow: only two things are mechanically
// unambiguous, encoding corruption and raw control characters. Prose typos are a
// spell-checker's job, and guessing at them here would be noise, not safety.

function checkCorruption(file, content) {
  content.split('\n').forEach((line, i) => {
    for (const ch of line) {
      const code = ch.codePointAt(0);
      if (code === 0xfffd) {
        fail(
          file,
          `Línea ${i + 1}: carácter de reemplazo U+FFFD, el texto está corrupto`,
          'Normalmente es un archivo guardado con otra codificación.',
        );
        return;
      }
      // Control characters other than tab. Tab is allowed because YAML forbids
      // it for indentation and checkYamlNoTabs reports that precisely.
      const isControl = code < 0x20 && code !== 0x09;
      const isC1 = code >= 0x7f && code <= 0x9f;
      if (isControl || isC1) {
        fail(file, `Línea ${i + 1}: carácter de control U+${code.toString(16).toUpperCase()}`, 'Suele ser un resto de una edición o reemplazo mal hecho.');
        return;
      }
    }
  });
}

// --- 4. Backlog task frontmatter matches its filename ------------------------

function checkTaskSlug(file, content) {
  const base = path.basename(file);
  const id = content.match(/^id:\s*(DEV-\d+)\s*$/m)?.[1];
  if (!id) return;
  const fromName = base.match(/^(?:DEV-|dev-)(\d+)/i)?.[1];
  if (!fromName) {
    fail(file, `El id ${id} no coincide con el nombre del archivo`, 'Usá el patrón canónico `DEV-XXX - slug.md`');
    return;
  }
  if (id !== `DEV-${fromName}`) {
    fail(file, `El id ${id} no coincide con el prefijo DEV-${fromName} del archivo`, 'Renombrá el archivo o corregí el frontmatter.');
  }
}

// --- 5. Every script referenced by package.json exists -----------------------

function checkScriptRefs() {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  } catch {
    return;
  }
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    for (const m of String(cmd).matchAll(/\bnode\s+(scripts\/[\w.-]+)/g)) {
      if (!fs.existsSync(path.join(ROOT, m[1]))) {
        fail('package.json', `El script "${name}" invoca ${m[1]}, que no existe`);
      }
    }
  }
}

// --- run ---------------------------------------------------------------------

const files = stagedFiles();
const pyyaml = hasPyYaml();

for (const file of files) {
  const content = stagedContent(file);
  if (content === null) continue;

  const e = ext(file);
  if (e === '.yml' || e === '.yaml') {
    checkYamlNoTabs(file, content);
    checkYaml(file, content, pyyaml);
  }
  if (CODE.has(e)) {
    checkEsmPaths(file, content);
  }
  if (CODE.has(e) || e === '.md' || e === '.json' || e === '.sh') {
    checkCorruption(file, content);
  }
  if (file.includes('backlog/tasks/') && e === '.md') {
    checkTaskSlug(file, content);
  }
}

checkScriptRefs();

for (const s of skipped) console.log(`   ℹ️  ${s}`);

if (problems.length) {
  console.error('');
  for (const p of problems) {
    console.error(`❌ ${p.file}: ${p.message}`);
    if (p.hint) console.error(`   → ${p.hint}`);
  }
  console.error(`\n${problems.length} problema(s) en archivos stageados.\n`);
  process.exit(1);
}

console.log(`   ${files.length} archivo(s) stageado(s) verificado(s).`);
process.exit(0);