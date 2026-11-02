#!/usr/bin/env node

/**
 * scripts/test-init-suite.js - Comprehensive test suite for DEV-344 (Gripm Suite Onboarding & Init)
 *
 * Verifies:
 * 1. Preset Minimalist AI-First (Kanban, clean backlog, skill, no timeboxes, no AGENTS.md)
 * 2. Preset Batteries Included (Scrum, Sprints, Releases, Timeline, Metrics, Estimation, AGENTS.md)
 * 3. Explicit config writing (.gripm/config.json explicit modules, enabledTabs, estimation)
 * 4. Project identity & custom codePrefix without silent truncation
 * 5. Playbook CLI delegation via GRIPM_PLAYBOOK_CLI contract (--repo, --lang, --name, --no-board, --yes)
 * 6. Anti-collision invariant: Board does not write AGENTS.md when Playbook is installed
 * 7. Suite product independence (Board only, Playbook only, Both)
 * 8. Capability manifest renderer ([ON] / [OFF])
 * 9. Multi-select terminal input parsing (1,3,5 | all | none | empty default)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitWizard } from './initScaffold.js';
import { parseMultiSelectInput } from './init/prompts.js';
import { renderManifest, PRESETS } from './init/catalog.js';

console.log('🧪 Running Gripm Suite Init Test Suite (DEV-344)...');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-test-init-suite-'));

function cleanup() {
  if (fs.existsSync(tempRoot)) {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {}
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

try {
  // --- 1. Multi-select parser unit tests ---
  {
    console.log('  Testing multi-select input parser...');
    assert.deepStrictEqual(parseMultiSelectInput('', 5, [0, 2]), [0, 2], 'Empty string returns defaults');
    assert.deepStrictEqual(parseMultiSelectInput('   ', 5, [1]), [1], 'Whitespace returns defaults');
    assert.deepStrictEqual(parseMultiSelectInput('all', 3, [0]), [0, 1, 2], '"all" returns all indices');
    assert.deepStrictEqual(parseMultiSelectInput('todos', 4, []), [0, 1, 2, 3], '"todos" returns all indices');
    assert.deepStrictEqual(parseMultiSelectInput('none', 5, [0, 1]), [], '"none" returns empty list');
    assert.deepStrictEqual(parseMultiSelectInput('0', 5, [0, 1]), [], '"0" returns empty list');
    assert.deepStrictEqual(parseMultiSelectInput('1,3,5', 6, []), [0, 2, 4], '"1,3,5" parses to 0-based [0, 2, 4]');
    assert.deepStrictEqual(parseMultiSelectInput('2 4', 5, []), [1, 3], 'Space separation works');
    assert.deepStrictEqual(parseMultiSelectInput('1,99,invalid,-1', 4, []), [0], 'Filters out of bounds and non-numbers');
    console.log('  ✅ Multi-select input parser verified');
  }

  // --- 2. Manifest renderer test ---
  {
    console.log('  Testing capability manifest renderer...');
    const manifest = renderManifest({
      methodology: 'kanban',
      mode: 'single',
      modules: { release: true, sprint: false, timeline: false, metrics: false, calendar: false },
      estimation: { enabled: false, method: 'fibonacci' },
      kanban: { showIdeasByDefault: false },
      assets: { skill: true, agentsMd: false, packageJson: true, gitignore: true },
      playbook: false
    }, true);

    assert.ok(manifest.includes('[ON] '), 'Manifest should render [ON]');
    assert.ok(manifest.includes('[OFF]'), 'Manifest should render [OFF]');
    assert.ok(!manifest.includes('\u2014') && !manifest.includes('\u2013'), 'Manifest must never contain em-dashes');
    console.log('  ✅ Capability manifest renderer verified');
  }

  // --- 3. Preset Minimalist AI-First ---
  {
    console.log('  Testing Minimalist AI-First preset...');
    const repoMinimal = path.join(tempRoot, 'minimal-repo');
    fs.mkdirSync(repoMinimal, { recursive: true });

    const res = await runInitWizard(repoMinimal, {
      isInteractive: false,
      minimal: true
    });

    assert.strictEqual(res.profile, 'minimal', 'Profile should be minimal');
    assert.strictEqual(res.methodology, 'kanban', 'Methodology should be kanban');
    assert.strictEqual(res.enabledTabs.sprint, false, 'Sprint tab should be disabled');
    assert.strictEqual(res.modules.sprint, false, 'Sprint module should be disabled');
    assert.strictEqual(res.modules.release, true, 'Release module should be enabled');
    assert.strictEqual(res.skill, true, 'Agent skill should be installed');
    assert.strictEqual(res.agentsMd, false, 'AGENTS.md should NOT be created in minimal profile');

    const config = JSON.parse(fs.readFileSync(path.join(repoMinimal, '.gripm/config.json'), 'utf8'));
    assert.strictEqual(config.methodology, 'kanban');
    assert.strictEqual(config.defaultView, 'kanban');
    assert.strictEqual(config.modules.sprint, false);
    assert.strictEqual(config.modules.release, true);
    assert.strictEqual(config.modules.timeline, false);
    assert.strictEqual(config.modules.metrics, false);
    assert.strictEqual(config.modules.calendar, false);
    assert.strictEqual(config.enabledTabs.sprint, false);
    assert.strictEqual(config.enabledTabs.release, true);
    assert.strictEqual(config.estimation.enabled, false);
    assert.strictEqual(fs.existsSync(path.join(repoMinimal, '.agents/skills/gripm/SKILL.md')), true);
    assert.strictEqual(fs.existsSync(path.join(repoMinimal, 'AGENTS.md')), false);
    console.log('  ✅ Minimalist AI-First preset verified');
  }

  // --- 4. Preset Batteries Included ---
  {
    console.log('  Testing Batteries Included preset...');
    const repoFull = path.join(tempRoot, 'full-repo');
    fs.mkdirSync(repoFull, { recursive: true });

    const res = await runInitWizard(repoFull, {
      isInteractive: false,
      full: true
    });

    assert.strictEqual(res.profile, 'full', 'Profile should be full');
    assert.strictEqual(res.methodology, 'scrum', 'Methodology should be scrum');
    assert.strictEqual(res.enabledTabs.sprint, true, 'Sprint tab should be enabled');
    assert.strictEqual(res.modules.sprint, true, 'Sprint module should be enabled');
    assert.strictEqual(res.modules.timeline, true, 'Timeline module should be enabled');
    assert.strictEqual(res.modules.metrics, true, 'Metrics module should be enabled');
    assert.strictEqual(res.modules.calendar, true, 'Calendar module should be enabled');
    assert.strictEqual(res.agentsMd, true, 'AGENTS.md should be created when Playbook is not selected');

    const config = JSON.parse(fs.readFileSync(path.join(repoFull, '.gripm/config.json'), 'utf8'));
    assert.strictEqual(config.methodology, 'scrum');
    assert.strictEqual(config.modules.sprint, true);
    assert.strictEqual(config.modules.timeline, true);
    assert.strictEqual(config.modules.metrics, true);
    assert.strictEqual(config.modules.calendar, true);
    assert.strictEqual(config.estimation.enabled, true);
    assert.strictEqual(config.estimation.method, 'fibonacci');
    assert.strictEqual(fs.existsSync(path.join(repoFull, 'AGENTS.md')), true);
    console.log('  ✅ Batteries Included preset verified');
  }

  // --- 5. Project identity & custom codePrefix without truncation ---
  {
    console.log('  Testing project identity and custom codePrefix (up to 10 chars)...');
    const repoIdentity = path.join(tempRoot, 'identity-repo');
    fs.mkdirSync(repoIdentity, { recursive: true });

    await runInitWizard(repoIdentity, {
      isInteractive: false,
      name: 'Custom Suite Project',
      id: 'custom-suite-proj',
      codePrefix: 'CSUITE',
      yes: true
    });

    const config = JSON.parse(fs.readFileSync(path.join(repoIdentity, '.gripm/config.json'), 'utf8'));
    assert.strictEqual(config.projectName, 'Custom Suite Project');
    assert.strictEqual(config.projectId, 'custom-suite-proj');
    assert.strictEqual(config.codePrefix, 'CSUITE', 'Preserves exact custom prefix up to 10 chars without truncation');
    console.log('  ✅ Project identity and codePrefix verified');
  }

  // --- 6. Playbook CLI delegation & Anti-collision AGENTS.md invariant ---
  {
    console.log('  Testing Playbook CLI delegation via mock GRIPM_PLAYBOOK_CLI...');
    const repoPlaybook = path.join(tempRoot, 'playbook-repo');
    fs.mkdirSync(repoPlaybook, { recursive: true });

    // Create a mock Playbook CLI script that records arguments in JSON
    const stubScript = path.join(tempRoot, 'mock-playbook-cli.mjs');
    const argvLogFile = path.join(tempRoot, 'mock-playbook-argv.json');
    const stubCode = `
      import fs from 'node:fs';
      fs.writeFileSync(${JSON.stringify(argvLogFile)}, JSON.stringify(process.argv), 'utf8');
      process.exit(0);
    `;
    fs.writeFileSync(stubScript, stubCode, 'utf8');

    process.env.GRIPM_PLAYBOOK_CLI = stubScript;

    try {
      const res = await runInitWizard(repoPlaybook, {
        isInteractive: false,
        name: 'PlaybookIntegrationProject',
        language: 'en',
        full: true,
        withPlaybook: true,
        yes: true
      });

      assert.strictEqual(res.playbook, true, 'Playbook delegation should succeed');
      assert.strictEqual(fs.existsSync(argvLogFile), true, 'Mock Playbook CLI should have been executed');

      const loggedArgv = JSON.parse(fs.readFileSync(argvLogFile, 'utf8'));
      assert.ok(loggedArgv.includes('init'), 'Mock CLI should receive "init" command');
      assert.ok(loggedArgv.includes('--repo'), 'Mock CLI should receive "--repo" flag');
      assert.ok(loggedArgv.includes('--lang'), 'Mock CLI should receive "--lang" flag');
      assert.ok(loggedArgv.includes('--no-board'), 'Mock CLI should receive "--no-board" flag to prevent circular init');
      assert.ok(loggedArgv.includes('--yes'), 'Mock CLI should receive "--yes" when --yes is passed');

      // CRITICAL INVARIANT: Board MUST NOT create AGENTS.md when Playbook is installed
      assert.strictEqual(
        fs.existsSync(path.join(repoPlaybook, 'AGENTS.md')),
        false,
        'Board MUST NOT create AGENTS.md when Playbook is selected (Playbook generates canonical AGENTS.md)'
      );

      console.log('  ✅ Playbook CLI delegation and AGENTS.md anti-collision verified');
    } finally {
      delete process.env.GRIPM_PLAYBOOK_CLI;
    }
  }

  // --- 7. Suite product independence: Board only vs Playbook only ---
  {
    console.log('  Testing Suite product independence (Board only vs Playbook only)...');
    const repoBoardOnly = path.join(tempRoot, 'board-only-repo');
    fs.mkdirSync(repoBoardOnly, { recursive: true });

    const resBoard = await runInitWizard(repoBoardOnly, {
      isInteractive: false,
      board: true,
      playbook: false,
      yes: true
    });
    assert.strictEqual(resBoard.gripmConfig, true);
    assert.strictEqual(resBoard.playbook, false);
    assert.strictEqual(fs.existsSync(path.join(repoBoardOnly, '.gripm/config.json')), true);

    const repoPlaybookOnly = path.join(tempRoot, 'playbook-only-repo');
    fs.mkdirSync(repoPlaybookOnly, { recursive: true });

    // Set up stub for Playbook only
    const stubScript = path.join(tempRoot, 'mock-playbook-cli.mjs');
    process.env.GRIPM_PLAYBOOK_CLI = stubScript;
    try {
      const resPbOnly = await runInitWizard(repoPlaybookOnly, {
        isInteractive: false,
        board: false,
        playbook: true,
        yes: true
      });
      assert.strictEqual(resPbOnly.gripmConfig, false, 'Board config should NOT be written when board=false');
      assert.strictEqual(resPbOnly.playbook, true, 'Playbook should be executed');
      assert.strictEqual(fs.existsSync(path.join(repoPlaybookOnly, '.gripm/config.json')), false);
    } finally {
      delete process.env.GRIPM_PLAYBOOK_CLI;
    }
    console.log('  ✅ Suite product independence verified');
  }

  // --- 8. Non-interactive flag parity & Granular overrides ---
  {
    console.log('  Testing granular overrides via flags (--no-skill, --no-scripts, --no-gitignore)...');
    const repoFlags = path.join(tempRoot, 'flags-repo');
    fs.mkdirSync(repoFlags, { recursive: true });

    const mockPkg = { name: 'flags-project', version: '1.0.0', scripts: {} };
    fs.writeFileSync(path.join(repoFlags, 'package.json'), JSON.stringify(mockPkg, null, 2), 'utf8');

    await runInitWizard(repoFlags, {
      isInteractive: false,
      yes: true,
      skill: false,
      packageJson: false,
      gitignore: false
    });

    assert.strictEqual(fs.existsSync(path.join(repoFlags, '.agents/skills/gripm/SKILL.md')), false, 'Skill omitted');
    assert.strictEqual(fs.existsSync(path.join(repoFlags, '.gitignore')), false, 'Gitignore omitted');
    const pkg = JSON.parse(fs.readFileSync(path.join(repoFlags, 'package.json'), 'utf8'));
    assert.strictEqual(pkg.scripts.board, undefined, 'Package scripts omitted');
    console.log('  ✅ Granular flag overrides verified');
  }

  // --- 9. DEV-354: Codebase Diagnostic & Smart Profile Recommendation (AC #4, AC #5) ---
  {
    console.log('  Testing Codebase Diagnostic & Smart Profile Recommendation (DEV-354)...');
    const repoDiagnostic = path.join(tempRoot, 'ts-test-repo');
    fs.mkdirSync(path.join(repoDiagnostic, 'src'), { recursive: true });

    // Setup TypeScript + tests
    fs.writeFileSync(path.join(repoDiagnostic, 'tsconfig.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(repoDiagnostic, 'package.json'), JSON.stringify({
      name: 'ts-test-repo',
      version: '1.0.0',
      scripts: { test: 'vitest run' },
      devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' }
    }, null, 2), 'utf8');
    fs.writeFileSync(path.join(repoDiagnostic, 'src/index.ts'), 'export const answer = 42;\n', 'utf8');

    const res = await runInitWizard(repoDiagnostic, {
      isInteractive: false,
      yes: true
    });

    assert.ok(res.auditReport, 'Debe incluir auditReport en el resultado');
    assert.strictEqual(res.recommendedProfile, 'full', 'Con TypeScript y tests debe recomendar perfil full');
    assert.strictEqual(res.profile, 'full', 'En modo non-interactive sin flag explícita adopta la recomendación');
    console.log('  ✅ Smart profile recommendation para TS + tests verificado');

    // Simple repo without tests
    const repoSimple = path.join(tempRoot, 'simple-repo');
    fs.mkdirSync(repoSimple, { recursive: true });
    fs.writeFileSync(path.join(repoSimple, 'script.js'), 'console.log("hello");\n', 'utf8');

    const resSimple = await runInitWizard(repoSimple, {
      isInteractive: false,
      yes: true
    });

    assert.strictEqual(resSimple.recommendedProfile, 'minimal', 'Repo simple sin tests debe recomendar minimal');
    assert.strictEqual(resSimple.profile, 'minimal', 'Adopta minimal');
    console.log('  ✅ Smart profile recommendation para repos simples verificado');
  }

  // --- 10. DEV-354: Auto-configuración de verifyCommand en .gripm/config.json ---
  {
    console.log('  Testing auto-configuration of verifyCommand in config.json (DEV-354)...');
    const repoVerify = path.join(tempRoot, 'verify-cmd-repo');
    fs.mkdirSync(repoVerify, { recursive: true });
    fs.writeFileSync(path.join(repoVerify, 'package.json'), JSON.stringify({
      name: 'verify-repo',
      scripts: { test: 'node --test' }
    }, null, 2), 'utf8');

    const res = await runInitWizard(repoVerify, {
      isInteractive: false,
      yes: true
    });

    assert.ok(res.verifyCommand, 'Debe detectar y reportar verifyCommand');
    const config = JSON.parse(fs.readFileSync(path.join(repoVerify, '.gripm/config.json'), 'utf8'));
    assert.strictEqual(config.verifyCommand, 'npm test', 'Debe persistir verifyCommand en .gripm/config.json');
    console.log('  ✅ Auto-configuración de verifyCommand verificada');
  }

  // --- 11. DEV-354: Importación opt-in de TODOs a backlog/tasks/ (AC #6) ---
  {
    console.log('  Testing opt-in TODO import to backlog/tasks/ (DEV-354 AC #6)...');
    const repoTodos = path.join(tempRoot, 'todos-repo');
    fs.mkdirSync(path.join(repoTodos, 'src'), { recursive: true });

    // Seed file with TODOs and FIXMEs
    fs.writeFileSync(path.join(repoTodos, 'src/math.js'), [
      '// TODO: Add support for complex numbers',
      'function add(a, b) { return a + b; }',
      '// FIXME: Prevent division by zero crash',
      'function divide(a, b) { return a / b; }'
    ].join('\n'), 'utf8');

    const res = await runInitWizard(repoTodos, {
      isInteractive: false,
      yes: true,
      importTodos: true,
      codePrefix: 'TODO'
    });

    assert.strictEqual(res.importedTodosCount, 2, 'Debe haber importado 2 TODOs');
    const tasksDir = path.join(repoTodos, 'backlog/tasks');
    assert.ok(fs.existsSync(tasksDir), 'backlog/tasks debe existir');
    const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
    assert.strictEqual(files.length, 2, 'Deben haberse creado 2 archivos de tareas');

    // Verify task content integrity
    const task1 = fs.readFileSync(path.join(tasksDir, files[0]), 'utf8');
    assert.ok(task1.includes('id: TODO-001'), 'ID debe ser correlativo con prefijo');
    assert.ok(task1.includes('status: draft'), 'Estado inicial debe ser draft');
    assert.ok(task1.includes('<!-- SECTION:DESCRIPTION:BEGIN -->'), 'Debe incluir marcador de descripción');
    assert.ok(task1.includes('<!-- AC:BEGIN -->'), 'Debe incluir marcador de AC');

    console.log('  ✅ Importación de TODOs y materialización en backlog/tasks/ verificada');
  }

  // --- 12. DEV-354: Modo no interactivo predecible sin bloqueos (AC #7) ---
  {
    console.log('  Testing predictable non-interactive mode (DEV-354 AC #7)...');
    const repoNonInt = path.join(tempRoot, 'non-interactive-repo');
    fs.mkdirSync(path.join(repoNonInt, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoNonInt, 'src/app.js'), '// TODO: unimported todo\nconst y = 2;\n', 'utf8');

    // Run without importTodos flag - must complete instantly without hanging
    const startTime = Date.now();
    const res = await runInitWizard(repoNonInt, {
      isInteractive: false,
      yes: true
    });
    const elapsed = Date.now() - startTime;

    assert.ok(elapsed < 5000, `Debe completarse en < 5s sin colgarse en prompts (demoró ${elapsed}ms)`);
    assert.strictEqual(res.importedTodosCount, 0, 'No debe importar TODOs si no fue solicitado');
    console.log('  ✅ Modo no interactivo predecible verificado');
  }

} finally {
  cleanup();
  console.log('🧹 Cleanup complete');
}

console.log('🎉 All Gripm Suite Init tests passed with code 0!');
process.exit(0);
