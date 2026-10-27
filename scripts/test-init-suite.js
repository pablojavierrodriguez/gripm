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
    const stubScript = path.join(tempRoot, 'mock-playbook-cli.js');
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
    const stubScript = path.join(tempRoot, 'mock-playbook-cli.js');
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

} finally {
  cleanup();
  console.log('🧹 Cleanup complete');
}

console.log('🎉 All Gripm Suite Init tests passed with code 0!');
process.exit(0);
