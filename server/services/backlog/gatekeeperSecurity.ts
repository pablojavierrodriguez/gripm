/**
 * server/services/backlog/gatekeeperSecurity.ts
 *
 * Gatekeeper security, command verification, and architectural transition guardrails.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { normalizeStatus } from '../../../scripts/backlogMdParser.ts';
import {
  DEFAULT_MAX_LINES,
  DEFAULT_EXTENSIONS,
  DEFAULT_IGNORED_DIRS,
  countFileLines,
  isIgnored,
  parseIgnoreFile,
  parseIgnoreLines
} from '@gripm/playbook/check-loc';

export interface TaskMutationOptions {
  force?: boolean;
  verifyCommand?: string;
  expectedMtime?: number;
  repoPath?: string;
}

export interface GatekeeperAudit {
  bypassedGatekeeper: boolean;
  timestamp: string;
}

export interface VerifyCommandValidation {
  valid: boolean;
  reason?: string;
  command?: string;
}

export interface GatekeeperTransitionResult {
  locViolations?: Array<{ file: string; lines: number }>;
}

export function validateVerifyCommand(cmd: string, repoPath: string): VerifyCommandValidation {
  if (!cmd || typeof cmd !== 'string') {
    return { valid: false, reason: 'El comando de verificación debe ser un texto no vacío.' };
  }

  const trimmed = cmd.trim();
  if (!trimmed) {
    return { valid: false, reason: 'El comando de verificación no puede estar vacío.' };
  }

  // 1. Prohibir metacaracteres shell, subshells, comillas, tuberías y redirecciones
  const forbiddenChars = /[|&;`$()<>\n\r'"]/;
  if (forbiddenChars.test(trimmed)) {
    return {
      valid: false,
      reason: "Contiene metacaracteres o secuencias de encadenamiento de shell no permitidas ('|', '&', ';', '`', '$()', '<', '>', comillas)."
    };
  }

  // 2. Tokenizar argumentos respetando espacios simples
  const tokens = trimmed.split(/\s+/);
  const runner = tokens[0].toLowerCase();

  // Validar tokens individuales contra inyecciones
  const tokenPattern = /^[a-zA-Z0-9_\-.:/\\=]+$/;
  for (const token of tokens) {
    if (!tokenPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' contiene caracteres no permitidos. Solo se permiten caracteres alfanuméricos y separadores estándar (- _ . : / \\ =).`
      };
    }
  }

  // 2.5 Rechazar flags de evasión, secuencias relativas '..' y rutas absolutas (DEV-302 AC #2)
  const forbiddenFlagPattern = /^(--prefix|--config|-c|--script-shell|--eval|-e|--import|--loader)(?:=.*)?$/i;
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (forbiddenFlagPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no está permitido por el Gatekeeper (flags de configuración/evasión prohibidas).`
      };
    }
    if (token.includes('..')) {
      return {
        valid: false,
        reason: `El argumento '${token}' no está permitido por el Gatekeeper (secuencias relativas '..' prohibidas).`
      };
    }
    if (token.startsWith('/') || token.startsWith('\\') || /^[a-zA-Z]:[/\\]/.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no está permitido por el Gatekeeper (rutas absolutas prohibidas).`
      };
    }
  }

  // Leer package.json del repositorio
  let pkgScripts: Record<string, string> = {};
  let pkgDeps: Set<string> = new Set();
  try {
    const pkgPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts && typeof pkg.scripts === 'object') {
        pkgScripts = pkg.scripts;
      }
      if (pkg.dependencies && typeof pkg.dependencies === 'object') {
        Object.keys(pkg.dependencies).forEach(d => pkgDeps.add(d));
      }
      if (pkg.devDependencies && typeof pkg.devDependencies === 'object') {
        Object.keys(pkg.devDependencies).forEach(d => pkgDeps.add(d));
      }
    }
  } catch {}

  // 3. Evaluar runner permitido
  if (['npm', 'pnpm', 'yarn'].includes(runner)) {
    const subCmd = tokens[1];
    if (!subCmd) {
      return {
        valid: false,
        reason: `Debe especificar un subcomando para ${runner} (ej: '${runner} test' o '${runner} run <script>').`
      };
    }

    if (subCmd === 'test' || subCmd === 't') {
      if (!pkgScripts['test']) {
        return {
          valid: false,
          reason: `El script 'test' no está definido en el package.json de '${repoPath}'.`
        };
      }
      return { valid: true, command: trimmed };
    }

    if (subCmd === 'run') {
      const scriptName = tokens[2];
      if (!scriptName) {
        return {
          valid: false,
          reason: `Debe especificar el nombre del script a ejecutar (ej: '${runner} run <script>').`
        };
      }
      if (!pkgScripts[scriptName]) {
        return {
          valid: false,
          reason: `El script '${scriptName}' no está definido en los scripts de package.json.`
        };
      }
      return { valid: true, command: trimmed };
    }

    if ((runner === 'yarn' || runner === 'pnpm') && pkgScripts[subCmd]) {
      return { valid: true, command: trimmed };
    }

    return {
      valid: false,
      reason: `Subcomando '${subCmd}' no autorizado para ${runner}. Solo se permiten '${runner} test' o '${runner} run <script>'.`
    };
  }

  if (runner === 'npx') {
    const tool = tokens[1];
    if (!tool) {
      return {
        valid: false,
        reason: "Debe especificar la herramienta a ejecutar con npx (ej: 'npx tsc --noEmit')."
      };
    }
    const safeToolsAllowlist = new Set([
      'tsc', 'eslint', 'vitest', 'jest', 'playwright', 'prettier', 'biome'
    ]);
    if (!safeToolsAllowlist.has(tool) && !pkgDeps.has(tool)) {
      return {
        valid: false,
        reason: `La herramienta '${tool}' no está permitida para ejecución con npx. Solo se permiten herramientas del stack de calidad (${Array.from(safeToolsAllowlist).join(', ')}) o dependencias declaradas en package.json.`
      };
    }
    return { valid: true, command: trimmed };
  }

  return {
    valid: false,
    reason: `El ejecutable '${runner}' no está permitido en verifyCommand. Solo se permiten scripts de package.json ('npm test', 'npm run <script>') o herramientas de verificación ('npx <herramienta>').`
  };
}

export function getModifiedFiles(repoPath: string): string[] {
  try {
    const out = execSync('git status --porcelain -z', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024
    });
    const items = out.split('\0').filter(Boolean);
    const files: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.startsWith('R ') || item.startsWith('RM') || item.startsWith('RD') || item.startsWith('C ') || item.startsWith('CM')) {
        files.push(item.slice(3).trim().replace(/\\/g, '/'));
        i++; // skip old path in -z output
      } else if (item.length > 3) {
        files.push(item.slice(3).trim().replace(/\\/g, '/'));
      }
    }
    return files;
  } catch {
    try {
      const files: string[] = [];
      function walk(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.isFile()) files.push(path.relative(repoPath, full));
        }
      }
      walk(repoPath);
      return files;
    } catch {
      return [];
    }
  }
}

export function validateGatekeeperTransition(
  task: any,
  targetStatus: string,
  options?: TaskMutationOptions,
  repoPath?: string
): GatekeeperTransitionResult {
  const normTarget = normalizeStatus(targetStatus);
  const isTransitionToTerminal = normTarget === 'ready' || normTarget === 'done';
  const result: GatekeeperTransitionResult = {};

  // Architectural Guardrail: LOC Ceiling enforcement (DEV-357)
  if (normTarget === 'ready') {
    const execCwd = repoPath || process.cwd();
    let enforceLocCeiling = false;
    let auditMaxLines = DEFAULT_MAX_LINES;
    let auditExcluded: string[] = [];
    try {
      const configPath = path.join(execCwd, '.gripm', 'config.json');
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (cfg?.guardrails?.enforceLocCeiling === true) {
          enforceLocCeiling = true;
        }
        if (cfg?.audit?.rules?.loc === false) {
          enforceLocCeiling = false;
        }
        if (cfg?.audit?.thresholds?.maxLines || cfg?.audit?.maxLines) {
          auditMaxLines = Number(cfg.audit.thresholds?.maxLines || cfg.audit.maxLines);
        }
        if (Array.isArray(cfg?.audit?.exclude)) {
          auditExcluded = cfg.audit.exclude;
        }
      }
    } catch {}

    if (enforceLocCeiling) {
      const gitignoreRules = parseIgnoreFile(path.join(execCwd, '.gitignore'));
      const locignoreRules = parseIgnoreFile(path.join(execCwd, '.locignore'));
      const gripmLocignore = parseIgnoreFile(path.join(execCwd, '.gripm', 'locignore'));
      const extraExcludes = parseIgnoreLines(auditExcluded);
      const combinedRules = [...gitignoreRules, ...locignoreRules, ...gripmLocignore, ...extraExcludes];

      const modified = getModifiedFiles(execCwd);
      const violations: Array<{ file: string; lines: number }> = [];

      for (const relFile of modified) {
        const fullPath = path.join(execCwd, relFile);
        if (!fs.existsSync(fullPath)) continue;
        try {
          const stat = fs.statSync(fullPath);
          if (!stat.isFile()) continue;
        } catch {
          continue;
        }

        const ext = path.extname(relFile).toLowerCase();
        if (!DEFAULT_EXTENSIONS.has(ext)) continue;
        if (isIgnored(relFile, false, combinedRules, DEFAULT_IGNORED_DIRS)) continue;

        const lines = countFileLines(fullPath);
        if (lines > auditMaxLines) {
          violations.push({ file: relFile.replace(/\\/g, '/'), lines });
        }
      }

      if (violations.length > 0) {
        result.locViolations = violations;
        if (!options?.force) {
          const taskId = task.code || task.id || 'unknown';
          const violationsList = violations
            .map(v => ` - ${v.file} (${v.lines} lines > ${auditMaxLines} ceiling)`)
            .join('\n');
          throw new Error(
            `[MCP Gatekeeper] Transition rejected: Cannot move task '${taskId}' to '${normTarget}' because architectural guardrails are active (guardrails.enforceLocCeiling: true) and ${violations.length} modified file(s) exceed the ${auditMaxLines} LOC ceiling:\n` +
            `${violationsList}\n\n` +
            `Corrective action: Refactor and modularize large files to be under ${auditMaxLines} lines of code, or specify 'force: true' if explicitly authorized by the Product Owner.`
          );
        }
      }
    }
  }

  if (!options?.force && isTransitionToTerminal) {
    const acs = task.acceptanceCriteriaList || task.acceptanceCriteria || [];
    const unchecked = acs.filter((ac: any) => !ac.checked);
    if (unchecked.length > 0) {
      const taskId = task.code || task.id || 'unknown';
      const uncheckedList = unchecked.map((ac: any) => ` - [ ] #${ac.index} ${ac.text}`).join('\n');
      throw new Error(
        `[MCP Gatekeeper] Transition rejected: Cannot move task '${taskId}' to '${normTarget}' because it has ${unchecked.length} uncompleted acceptance criteria:\n` +
        `${uncheckedList}\n\n` +
        `Corrective action: Complete the implementation of each pending criterion and mark it as completed (- [x]) before certifying the task as '${normTarget}'.`
      );
    }

    const verifyCmd = options?.verifyCommand;
    if (verifyCmd && typeof verifyCmd === 'string') {
      const execCwd = repoPath || process.cwd();
      const validation = validateVerifyCommand(verifyCmd, execCwd);
      if (!validation.valid) {
        throw new Error(
          `[MCP Gatekeeper Security] Transition rejected: Verification command '${verifyCmd}' is not permitted when attempting to move '${task.code || task.id}' to '${normTarget}':\n` +
          `${validation.reason}\n\n` +
          `Corrective action: Use only scripts defined in package.json (e.g. 'npm test', 'npm run <script>') or authorized tools ('npx tsc --noEmit').`
        );
      }

      try {
        execSync(validation.command || verifyCmd, {
          cwd: execCwd,
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 15000
        });
      } catch (execErr: any) {
        const outMsg = (execErr.stderr || execErr.stdout || execErr.message || '').toString().trim();
        throw new Error(
          `[MCP Gatekeeper] Transition rejected: Verification command '${verifyCmd}' failed when attempting to move '${task.code || task.id}' to '${normTarget}':\n` +
          `${outMsg}\n\n` +
          `Corrective action: Check the verification script errors, fix the issues, and retry certifying the task.`
        );
      }
    }
  }

  return result;
}
