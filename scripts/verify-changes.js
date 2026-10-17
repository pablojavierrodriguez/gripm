/**
 * scripts/verify-changes.js - gate on staged files, runs in the pre-commit hook.
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
 * - Runs on **staged** content only, so it never blocks unrelated work.
 * - Cheap: no test run, no build. It must stay under a second.
 * - No new dependencies. YAML validation shells out to python3+PyYAML and
 *     degrades to a warning when unavailable, because a gate that fails closed
 *     on a missing interpreter is a gate people disable.
 * - A check that cannot run is reported as SKIPPED, never as PASSED.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let esbuild;
try {
  esbuild = (await import('esbuild')).default;
} catch {}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const problems = [];
const skipped = [];

const fail = (file, message, hint) => problems.push({ file, message, hint });

// --- staged files ------------------------------------------------------------

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only -z', {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\0').filter(Boolean);
  } catch {
    return [];
  }
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

function getPythonYamlCmd() {
  for (const cmd of ['python3', 'python', 'py']) {
    try {
      execSync(`${cmd} -c "import yaml"`, { stdio: 'ignore' });
      return cmd;
    } catch {}
  }
  return null;
}

function checkYaml(file, content, pythonCmd) {
  if (!pythonCmd) {
    skipped.push(`${file}: YAML sin validar (sin python+PyYAML; lo cubre CI)`);
    return;
  }

  try {
    execSync(`${pythonCmd} -c "import yaml,sys; yaml.safe_load(sys.stdin.buffer.read().decode('utf-8'))"`, {
      input: content,
      stdio: ['pipe', 'ignore', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
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

  if (file.replace(/\\/g, '/').endsWith('.github/workflows/ci.yml')) {
    const verifyBlock = content.split(/^\s*ui-smoke:/m)[0] || content;
    const buildIdx = verifyBlock.indexOf('run: npm run build');
    const testIdx = verifyBlock.indexOf('run: npm test');
    if (testIdx !== -1 && (buildIdx === -1 || buildIdx > testIdx)) {
      fail(
        file,
        'En el job verify de ci.yml, "npm test" está antes que "npm run build"',
        'En un checkout limpio de CI no existe dist/; npm run build debe ejecutarse antes de npm test.',
      );
    }
  }
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
  content.split('\n').forEach((rawLine, i) => {
    const line = rawLine.replace(/\r$/, '');
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
      // Control characters other than tab, LF (0x0A) and CR (0x0D).
      const isControl = code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d;
      const isC1 = code >= 0x7f && code <= 0x9f;
      if (isControl || isC1) {
        fail(file, `Línea ${i + 1}: carácter de control U+${code.toString(16).toUpperCase()}`, 'Suele ser un resto de una edición o reemplazo mal hecho.');
        return;
      }
    }
  });
}

// --- 4. Anti-Em-Dash & Anti-En-Dash guardrail (Anti-AI Rule) -----------------
//
// Prohibits literal U+2014 (em-dash) and U+2013 (en-dash) characters in
// staged text files. Standard hyphen `-` with spaces (` - `) must be used.
function checkAntiEmDash(file, content) {
  content.split('\n').forEach((rawLine, i) => {
    const line = rawLine.replace(/\r$/, '');
    if (/[\u2013\u2014]/.test(line)) {
      fail(
        file,
        `Línea ${i + 1}: contiene em-dash o en-dash prohibido por la regla canónica Anti-AI`,
        'Reemplazá por el guión estándar ` - ` con espacios o el guión simple `-`.'
      );
    }
  });
}

// --- 5. Backlog task frontmatter matches its filename ------------------------

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

// --- 6. Standalone MCP binary parity (DEV-295) -------------------------------
//
// Verify that bin/gripm-mcp.js stays in sync with scripts/mcp-server.ts and its dependencies.
// Compiles scripts/mcp-server.ts in-memory and asserts exact match with bin/gripm-mcp.js.

async function checkMcpBinarySync(filesList, isAllMode) {
  const mcpSourcePatterns = [
    'scripts/mcp-server.ts',
    'bin/gripm-mcp.js',
    'scripts/backlogMdParser.ts',
    'scripts/registryConfig.js',
    'scripts/updateChecker.js',
    'server/services/atomicWrite.ts',
  ];

  const hasMcpChanges = isAllMode || filesList.some((f) =>
    mcpSourcePatterns.some((pattern) => f === pattern || f.endsWith(pattern))
  );

  if (!hasMcpChanges) return;

  if (!esbuild) {
    skipped.push('bin/gripm-mcp.js: sincronización de binario MCP sin validar (esbuild no disponible)');
    return;
  }

  const binaryPath = path.join(ROOT, 'bin/gripm-mcp.js');
  let currentBinaryContent;

  if (isAllMode) {
    if (!fs.existsSync(binaryPath)) {
      fail('bin/gripm-mcp.js', 'El binario compilado bin/gripm-mcp.js no existe', 'Ejecutá `npm run build:bin`.');
      return;
    }
    currentBinaryContent = fs.readFileSync(binaryPath, 'utf8');
  } else {
    currentBinaryContent = stagedContent('bin/gripm-mcp.js');
    if (currentBinaryContent === null) {
      fail(
        'bin/gripm-mcp.js',
        'El archivo bin/gripm-mcp.js no está stageado junto a los cambios del servidor MCP',
        'Ejecutá `npm run build:bin` y stageá bin/gripm-mcp.js con `git add bin/gripm-mcp.js`.'
      );
      return;
    }
  }

  try {
    const mcpServerContent = isAllMode
      ? fs.readFileSync(path.join(ROOT, 'scripts/mcp-server.ts'), 'utf8')
      : (stagedContent('scripts/mcp-server.ts') ?? (fs.existsSync(path.join(ROOT, 'scripts/mcp-server.ts')) ? fs.readFileSync(path.join(ROOT, 'scripts/mcp-server.ts'), 'utf8') : null));

    if (!mcpServerContent) {
      fail('scripts/mcp-server.ts', 'No se pudo leer el contenido de scripts/mcp-server.ts para la verificación.');
      return;
    }

    const gitIndexPlugin = {
      name: 'git-index-loader',
      setup(build) {
        build.onLoad({ filter: /.*/ }, (args) => {
          const relPath = path.relative(ROOT, args.path).replace(/\\/g, '/');
          if (relPath.startsWith('..') || relPath.includes('node_modules/')) {
            return null;
          }
          const content = stagedContent(relPath);
          if (content !== null) {
            const ext = path.extname(args.path).toLowerCase();
            const loader = ext === '.ts' ? 'ts' : ext === '.tsx' ? 'tsx' : ext === '.json' ? 'json' : 'js';
            return { contents: content, loader };
          }
          return null;
        });
      }
    };

    const res = await esbuild.build({
      stdin: {
        contents: mcpServerContent,
        resolveDir: path.join(ROOT, 'scripts'),
        sourcefile: 'mcp-server.ts',
        loader: 'ts'
      },
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      write: false,
      external: ['fsevents'],
      plugins: isAllMode ? [] : [gitIndexPlugin]
    });

    const compiledText = res.outputFiles[0].text;
    const normalize = (s) => s.replace(/\r\n/g, '\n').trim();

    if (normalize(currentBinaryContent) !== normalize(compiledText)) {
      fail(
        'bin/gripm-mcp.js',
        'El binario compilado bin/gripm-mcp.js está desactualizado respecto al código fuente de scripts/mcp-server.ts',
        'Ejecutá `npm run build:bin` para regenerar el binario compilado.'
      );
    }
  } catch (err) {
    fail('scripts/mcp-server.ts', `Error al compilar servidor MCP para verificación: ${err.message}`);
  }
}

// --- run ---------------------------------------------------------------------

const isAll = process.argv.includes('--all');
const files = isAll
  ? execSync('git ls-files -z', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean)
  : stagedFiles();
const pyyaml = getPythonYamlCmd();

for (const file of files) {
  const content = isAll
    ? (fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : null)
    : stagedContent(file);
  if (content === null) continue;

  const e = ext(file);
  if (e === '.yml' || e === '.yaml') {
    checkYamlNoTabs(file, content);
    checkYaml(file, content, pyyaml);
  }
  if (CODE.has(e)) {
    checkEsmPaths(file, content);
  }
  if (CODE.has(e) || e === '.md' || e === '.json' || e === '.sh' || e === '.yml' || e === '.yaml' || e === '.html' || e === '.css') {
    checkCorruption(file, content);
    checkAntiEmDash(file, content);
  }
  if (file.includes('backlog/tasks/') && e === '.md') {
    checkTaskSlug(file, content);
  }
}

checkScriptRefs();
await checkMcpBinarySync(files, isAll);

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

console.log(`   ${files.length} archivo(s)${isAll ? '' : ' stageado(s)'} verificado(s).`);
process.exit(0);