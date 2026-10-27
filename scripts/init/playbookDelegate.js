import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Resolves the Playbook CLI command and base arguments.
 * Resolution order:
 * 1. process.env.GRIPM_PLAYBOOK_CLI
 * 2. local node_modules/.bin/playbook in targetRepo
 * 3. npx -y @gripm/playbook@^2.8.0
 */
export function resolvePlaybookCommand(targetRepo = process.cwd()) {
  const isWin = process.platform === 'win32';

  // 1. Explicit override via environment variable (used for tests and cross-development)
  if (process.env.GRIPM_PLAYBOOK_CLI) {
    const raw = process.env.GRIPM_PLAYBOOK_CLI.trim();
    if (raw.endsWith('.js') || raw.endsWith('.mjs') || raw.endsWith('.cjs')) {
      return {
        command: process.execPath,
        baseArgs: [path.resolve(raw)],
        shell: false
      };
    }
    return {
      command: raw,
      baseArgs: [],
      shell: isWin
    };
  }

  // 2. Local node_modules in target repository
  const localBin = path.join(targetRepo, 'node_modules/.bin', isWin ? 'playbook.cmd' : 'playbook');
  if (fs.existsSync(localBin)) {
    return {
      command: localBin,
      baseArgs: [],
      shell: isWin
    };
  }

  // 3. Fallback to npx
  const npxCmd = isWin ? 'npx.cmd' : 'npx';
  return {
    command: npxCmd,
    baseArgs: ['-y', '@gripm/playbook@^2.8.0'],
    shell: isWin
  };
}

/**
 * Delegates repository initialization to Gripm Playbook CLI.
 * Runs as a child process with stdio: 'inherit' to preserve interactive prompts.
 */
export function delegatePlaybookInit(targetRepo, options = {}, isEn = true) {
  const { command, baseArgs, shell } = resolvePlaybookCommand(targetRepo);

  console.log(isEn
    ? '\n  📦 Delegating to Gripm Playbook CLI (@gripm/playbook init)...'
    : '\n  📦 Delegando al CLI de Gripm Playbook (@gripm/playbook init)...'
  );

  const initArgs = ['init', '--repo', path.resolve(targetRepo)];

  if (options.language || options.lang) {
    initArgs.push('--lang', options.language || options.lang);
  }
  if (options.name || options.projectName) {
    initArgs.push('--name', options.name || options.projectName);
  }

  // Board was already handled or explicitly skipped; avoid re-running board setup from playbook
  initArgs.push('--no-board');

  if (options.yes) {
    initArgs.push('--yes');
  }

  if (options.mode) {
    initArgs.push('--mode', options.mode);
  }

  const allArgs = [...baseArgs, ...initArgs];

  try {
    const result = spawnSync(command, allArgs, {
      cwd: targetRepo,
      stdio: 'inherit',
      shell
    });

    if (result.error) {
      console.warn(isEn
        ? `  ⚠️ Could not spawn Gripm Playbook CLI: ${result.error.message}`
        : `  ⚠️ No se pudo ejecutar el CLI de Gripm Playbook: ${result.error.message}`
      );
      return false;
    }

    if (result.status !== 0) {
      console.warn(isEn
        ? `  ⚠️ Gripm Playbook initialization exited with code ${result.status}.`
        : `  ⚠️ La inicialización de Gripm Playbook finalizó con código ${result.status}.`
      );
      return false;
    }

    console.log(isEn
      ? '  ✅ Gripm Playbook initialized successfully.'
      : '  ✅ Gripm Playbook inicializado con éxito.'
    );
    return true;
  } catch (err) {
    console.warn(isEn
      ? `  ⚠️ Error during Gripm Playbook delegation: ${err.message}`
      : `  ⚠️ Error durante la delegación a Gripm Playbook: ${err.message}`
    );
    return false;
  }
}
