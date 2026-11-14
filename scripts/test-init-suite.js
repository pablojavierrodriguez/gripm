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
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInitWizard } from './initScaffold.js';
import { parseMultiSelectInput, promptPlaybookOptions } from './init/prompts.js';
import { renderManifest, PRESETS } from './init/catalog.js';
import { parsePlaybookCliOptions, PLAYBOOK_INIT_CHOICES } from './init/playbookOptions.js';
import { HARNESS_CHOICES } from '@gripm/playbook/scripts/lib/adapters.mjs';

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
    assert.deepStrictEqual(parsePlaybookCliOptions([
      '--scripts', '--playbook-harness', 'cursor', '--playbook-harness', 'claude',
      '--playbook-skills', 'principal-engineer,qa-auditor',
      '--playbook-preset', 'strict'
    ]), {
      harnesses: ['cursor', 'claude'],
      skills: ['principal-engineer', 'qa-auditor'],
      preset: 'strict'
    }, 'Playbook options use namespaced flags without consuming Board --scripts');

    const promptAnswers = ['all', '1', 'none', '', 'all', '2', '2'];
    const promptLabels = [];
    const prompted = await promptPlaybookOptions({
      question: async (label) => {
        promptLabels.push(label);
        return promptAnswers.shift();
      }
    }, PLAYBOOK_INIT_CHOICES, {}, true);
    assert.strictEqual(promptLabels.length, 7, 'Granular Playbook choices must fit in one Gripm wizard');
    assert.deepStrictEqual(prompted.harnesses, HARNESS_CHOICES.map(({ value }) => value));
    assert.strictEqual(prompted.rules.length, 0, 'Empty non-harness selections are allowed');
    assert.strictEqual(prompted.preset, 'strict');
    assert.strictEqual(prompted.automation, 'manual');
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
      yes: false
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
        yes: false
      });

      assert.strictEqual(res.playbook, true, 'Playbook delegation should succeed');
      assert.strictEqual(fs.existsSync(argvLogFile), true, 'Mock Playbook CLI should have been executed');

      const loggedArgv = JSON.parse(fs.readFileSync(argvLogFile, 'utf8'));
      assert.ok(loggedArgv.includes('init'), 'Mock CLI should receive "init" command');
      assert.ok(loggedArgv.includes('--repo'), 'Mock CLI should receive "--repo" flag');
      assert.ok(loggedArgv.includes('--lang'), 'Mock CLI should receive "--lang" flag');
      assert.ok(loggedArgv.includes('--no-board'), 'Mock CLI should receive "--no-board" flag to prevent circular init');
      assert.ok(loggedArgv.includes('--yes'), 'Mock CLI should receive "--yes" when --yes is passed');
      assert.ok(loggedArgv.includes('--mode') && loggedArgv.includes('quick'), 'Quick setup should select Playbook quick mode');
      assert.ok(loggedArgv.includes('--preset') && loggedArgv.includes('pragmatic'), 'Quick setup should select pragmatic rigor');
      assert.ok(loggedArgv.includes('--automation') && loggedArgv.includes('automated'), 'Quick setup should select automated delivery');
      for (const { value } of HARNESS_CHOICES) {
        assert.ok(loggedArgv.includes('--harness'), `Playbook should receive harness ${value}`);
        assert.ok(loggedArgv.includes(value), `Playbook should receive selected harness ${value}`);
      }

      // CRITICAL INVARIANT: Board MUST NOT create AGENTS.md when Playbook is installed
      assert.strictEqual(
        fs.existsSync(path.join(repoPlaybook, 'AGENTS.md')),
        false,
        'Board MUST NOT create AGENTS.md when Playbook is selected (Playbook generates canonical AGENTS.md)'
      );

      const config = JSON.parse(fs.readFileSync(path.join(repoPlaybook, '.gripm/config.json'), 'utf8'));
      assert.strictEqual(config.preset, 'pragmatic');
      assert.strictEqual(config.automation, 'automated');

      const repoMinimalPlaybook = path.join(tempRoot, 'minimal-playbook-repo');
      fs.mkdirSync(repoMinimalPlaybook, { recursive: true });
      await runInitWizard(repoMinimalPlaybook, {
        isInteractive: false,
        profile: 'minimal',
        withPlaybook: true
      });
      const minimalArgv = JSON.parse(fs.readFileSync(argvLogFile, 'utf8'));
      assert.ok(minimalArgv.includes('--yes'), 'Combined quick setup must not launch a second wizard');
      assert.ok(minimalArgv.includes('--mode') && minimalArgv.includes('quick'));
      assert.ok(minimalArgv.includes('--preset') && minimalArgv.includes('pragmatic'));
      assert.ok(minimalArgv.includes('--automation') && minimalArgv.includes('automated'));
      for (const { value } of HARNESS_CHOICES) {
        assert.ok(minimalArgv.includes(value), `Minimal preset should select harness ${value}`);
      }

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
    const boardOnlyStub = path.join(tempRoot, 'mock-playbook-cli.mjs');
    const boardOnlyLog = path.join(tempRoot, 'mock-playbook-argv.json');
    if (fs.existsSync(boardOnlyLog)) fs.unlinkSync(boardOnlyLog);
    process.env.GRIPM_PLAYBOOK_CLI = boardOnlyStub;

    try {
      const resBoard = await runInitWizard(repoBoardOnly, {
        isInteractive: false,
        board: true,
        playbook: false,
        yes: true
      });
      assert.strictEqual(resBoard.gripmConfig, true);
      assert.strictEqual(resBoard.playbook, false);
      assert.strictEqual(fs.existsSync(path.join(repoBoardOnly, '.gripm/config.json')), true);
      assert.strictEqual(fs.existsSync(boardOnlyLog), false, 'Board-only setup must not invoke Playbook');
    } finally {
      delete process.env.GRIPM_PLAYBOOK_CLI;
    }

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
      const playbookOnlyArgv = JSON.parse(fs.readFileSync(path.join(tempRoot, 'mock-playbook-argv.json'), 'utf8'));
      assert.ok(playbookOnlyArgv.includes('--yes'));
      for (const { value } of HARNESS_CHOICES) {
        assert.ok(playbookOnlyArgv.includes(value), `Playbook-only --yes should select ${value}`);
      }
    } finally {
      delete process.env.GRIPM_PLAYBOOK_CLI;
    }

    const repoPlaybookInteractive = path.join(tempRoot, 'playbook-interactive-repo');
    fs.mkdirSync(repoPlaybookInteractive, { recursive: true });
    process.env.GRIPM_PLAYBOOK_CLI = path.join(tempRoot, 'mock-playbook-cli.mjs');
    try {
      await runInitWizard(repoPlaybookInteractive, {
        isInteractive: false,
        board: false,
        playbook: true,
        yes: false
      });
      const interactiveArgv = JSON.parse(fs.readFileSync(path.join(tempRoot, 'mock-playbook-argv.json'), 'utf8'));
      assert.strictEqual(interactiveArgv.includes('--yes'), false, 'Playbook-only interactive flow must retain its native wizard');
      assert.strictEqual(interactiveArgv.includes('--mode'), false);
      assert.strictEqual(interactiveArgv.includes('--harness'), false);
    } finally {
      delete process.env.GRIPM_PLAYBOOK_CLI;
    }

    console.log('  ✅ Suite product independence verified');
  }

  // --- 8. DEV-361: Exact granular Playbook selection and explicit empty harness rejection ---
  {
    console.log('  Testing granular Playbook selection and empty harness rejection...');
    const repoGranular = path.join(tempRoot, 'granular-playbook-repo');
    fs.mkdirSync(repoGranular, { recursive: true });
    const userFile = path.join(repoGranular, 'user-notes.md');
    fs.writeFileSync(userFile, 'Keep this file unchanged.\n', 'utf8');
    fs.mkdirSync(path.join(repoGranular, '.gripm'), { recursive: true });
    fs.writeFileSync(path.join(repoGranular, '.gripm/config.json'), JSON.stringify({
      theme: 'light',
      verifyCommand: 'npm test'
    }, null, 2), 'utf8');

    const stubScript = path.join(tempRoot, 'mock-playbook-cli.mjs');
    const argvLogFile = path.join(tempRoot, 'mock-playbook-argv.json');
    const stubCode = `
      import fs from 'node:fs';
      fs.writeFileSync(${JSON.stringify(argvLogFile)}, JSON.stringify(process.argv), 'utf8');
      process.exit(Number(process.env.PLAYBOOK_EXIT_CODE || 0));
    `;
    fs.writeFileSync(stubScript, stubCode, 'utf8');
    process.env.GRIPM_PLAYBOOK_CLI = stubScript;

    try {
      const res = await runInitWizard(repoGranular, {
        isInteractive: false,
        yes: true,
        profile: 'custom',
        speedMode: 'granular',
        playbook: true,
        playbookOptions: {
          harnesses: ['cursor', 'claude'],
          skills: ['principal-engineer'],
          rules: ['git-workflow'],
          scripts: ['gate:qa'],
          docs: ['domain'],
          preset: 'strict',
          automation: 'manual'
        }
      });

      assert.strictEqual(res.playbook, true);
      const argv = JSON.parse(fs.readFileSync(argvLogFile, 'utf8'));
      const expectedPairs = [
        ['--harness', 'cursor'],
        ['--harness', 'claude'],
        ['--skills', 'principal-engineer'],
        ['--rules', 'git-workflow'],
        ['--scripts', 'gate:qa'],
        ['--docs', 'domain'],
        ['--preset', 'strict'],
        ['--automation', 'manual'],
        ['--mode', 'custom']
      ];
      for (const [flag, value] of expectedPairs) {
        assert.ok(
          argv.some((argument, index) => argument === flag && argv[index + 1] === value),
          `Expected ${flag} ${value}`
        );
      }

      const config = JSON.parse(fs.readFileSync(path.join(repoGranular, '.gripm/config.json'), 'utf8'));
      assert.strictEqual(config.preset, 'strict');
      assert.strictEqual(config.automation, 'manual');
      assert.strictEqual(config.theme, 'light', 'Existing Board config settings must be preserved');
      assert.strictEqual(config.verifyCommand, 'npm test');
      assert.strictEqual(fs.readFileSync(userFile, 'utf8'), 'Keep this file unchanged.\n');

      const repoNoHarness = path.join(tempRoot, 'empty-playbook-harness-repo');
      fs.mkdirSync(repoNoHarness, { recursive: true });
      await assert.rejects(() => runInitWizard(repoNoHarness, {
        isInteractive: false,
        yes: true,
        profile: 'custom',
        speedMode: 'granular',
        playbook: true,
        playbookOptions: { harnesses: [] }
      }), /select at least one Playbook harness/i);
      assert.strictEqual(fs.existsSync(path.join(repoNoHarness, '.gripm/config.json')), false);

      const repoEmptyArtifacts = path.join(tempRoot, 'empty-playbook-artifacts-repo');
      fs.mkdirSync(repoEmptyArtifacts, { recursive: true });
      const emptyArtifactsResult = await runInitWizard(repoEmptyArtifacts, {
        isInteractive: false,
        yes: true,
        profile: 'custom',
        speedMode: 'granular',
        playbook: true,
        playbookOptions: {
          harnesses: ['cursor'],
          skills: [],
          rules: [],
          scripts: [],
          docs: []
        }
      });
      assert.strictEqual(emptyArtifactsResult.playbook, true);
      const emptyArtifactArgv = JSON.parse(fs.readFileSync(argvLogFile, 'utf8'));
      for (const flag of ['--skills', '--rules', '--scripts', '--docs']) {
        assert.ok(
          emptyArtifactArgv.some((argument, index) => argument === flag && emptyArtifactArgv[index + 1] === 'none'),
          `${flag} should permit an empty selection`
        );
      }

      const repoFailed = path.join(tempRoot, 'failed-playbook-repo');
      fs.mkdirSync(repoFailed, { recursive: true });
      process.env.PLAYBOOK_EXIT_CODE = '7';
      const failedResult = await runInitWizard(repoFailed, {
        isInteractive: false,
        yes: true,
        full: true,
        playbook: true
      });
      assert.strictEqual(failedResult.success, false);
      assert.strictEqual(fs.existsSync(path.join(repoFailed, '.gripm/config.json')), true);
      assert.strictEqual(failedResult.playbook, false);

      const cliRepoFailed = path.join(tempRoot, 'failed-playbook-cli-repo');
      fs.mkdirSync(cliRepoFailed, { recursive: true });
      fs.writeFileSync(path.join(cliRepoFailed, 'package.json'), JSON.stringify({
        name: 'failed-playbook-cli-repo',
        scripts: {}
      }, null, 2), 'utf8');
      const runnerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gripm-runner.js');
      const cliRuntimeFlags = process.execArgv.filter(flag => flag === '--experimental-strip-types');
      const cliFailure = spawnSync(process.execPath, [
        ...cliRuntimeFlags,
        runnerPath,
        '--repo', cliRepoFailed,
        '--init',
        '--yes',
        '--full',
        '--with-playbook',
        '--scripts',
        '--playbook-harness', 'cursor',
        '--playbook-harness', 'claude',
        '--playbook-skills', 'principal-engineer',
        '--playbook-rules', 'git-workflow',
        '--playbook-scripts', 'gate:qa',
        '--playbook-docs', 'domain',
        '--playbook-preset', 'strict',
        '--playbook-automation', 'manual'
      ], {
        encoding: 'utf8',
        env: {
          ...process.env,
          GRIPM_PLAYBOOK_CLI: stubScript,
          PLAYBOOK_EXIT_CODE: '7',
          NO_COLOR: '1'
        }
      });
      assert.notStrictEqual(cliFailure.status, 0, 'Gripm CLI must exit non-zero when Playbook fails');
      assert.strictEqual(
        fs.existsSync(path.join(cliRepoFailed, '.gripm/config.json')),
        true,
        `Board config should survive Playbook failure.\nstdout: ${cliFailure.stdout}\nstderr: ${cliFailure.stderr}`
      );
      const cliDelegatedArgv = JSON.parse(fs.readFileSync(argvLogFile, 'utf8'));
      for (const [flag, value] of [
        ['--harness', 'cursor'],
        ['--harness', 'claude'],
        ['--skills', 'principal-engineer'],
        ['--rules', 'git-workflow'],
        ['--scripts', 'gate:qa'],
        ['--docs', 'domain'],
        ['--preset', 'strict'],
        ['--automation', 'manual']
      ]) {
        assert.ok(
          cliDelegatedArgv.some((argument, index) => argument === flag && cliDelegatedArgv[index + 1] === value),
          `CLI should delegate ${flag} ${value}`
        );
      }
      const cliPackage = JSON.parse(fs.readFileSync(path.join(cliRepoFailed, 'package.json'), 'utf8'));
      assert.ok(cliPackage.scripts.board, 'The existing --scripts flag must still configure Board package scripts');
      delete process.env.PLAYBOOK_EXIT_CODE;
      console.log('  ✅ Granular Playbook selection and empty harness rejection verified');
    } finally {
      delete process.env.GRIPM_PLAYBOOK_CLI;
      delete process.env.PLAYBOOK_EXIT_CODE;
    }
  }

  // --- 9. Non-interactive flag parity & Granular overrides ---
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
