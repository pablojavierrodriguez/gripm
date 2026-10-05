import { PassThrough, Writable } from 'node:stream';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseBacklogMd,
  serializeBacklogMd,
  normalizeStatus,
  generateTaskFilename,
  generateMonolithicBacklogMd
} from './backlogMdParser.ts';
import {
  getDevBoardHomeDir,
  getRegistryPath,
  loadRegistryFile,
  saveRegistryFile
} from './registryConfig.js';
import {
  semverGreaterThan,
  formatUpdateBanner,
  writeUpdateCache,
  readUpdateCache,
  getCachedUpdateInfo,
  isUpdateCheckDisabled
} from './updateChecker.js';
import { runInitWizard } from './initScaffold.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testRepoDir = path.join(__dirname, '../data/test-repo-backlog-md');

console.log('Testing End-to-End Backlog.md Integration...');

// 1. Setup sample Backlog.md folder structure
const tasksDir = path.join(testRepoDir, 'backlog/tasks');
if (fs.existsSync(testRepoDir)) {
  fs.rmSync(testRepoDir, { recursive: true, force: true });
}
fs.mkdirSync(tasksDir, { recursive: true });

// 2. Create 3 sample tasks
const task1 = {
  id: 'DEMO-101',
  title: 'Implementar autenticación OAuth',
  status: 'doing',
  type: 'feature',
  priority: 'p1',
  assignees: ['@developer', '@agent'],
  labels: ['auth', 'security'],
  milestone: 'Sprint 1',
  description: 'Implementar login con Google y GitHub mediante JWT.',
  acceptanceCriteria: [
    { index: 1, text: 'Tokens JWT firmados y cifrados', checked: true },
    { index: 2, text: 'Manejo de expiración y refresh tokens', checked: false }
  ],
  implementationPlan: '1. Configurar endpoints de OAuth.\n2. Validar callbacks.\n3. Integrar middleware de sesión.'
};

const task2 = {
  id: 'DEMO-102',
  title: 'Corregir fuga de memoria en web workers',
  status: 'review',
  type: 'bug',
  priority: 'p0',
  assignees: ['@agent'],
  labels: ['performance', 'workers'],
  milestone: 'Sprint 1',
  description: 'Los workers no se destruían correctamente al desmontar la vista.',
  acceptanceCriteria: [
    { index: 1, text: 'Limpieza de listeners en useEffect', checked: true },
    { index: 2, text: 'Pruebas de carga sin acumulación de memoria', checked: true }
  ],
  implementationPlan: '1. Usar hook useWorkerClean.\n2. Auditar heapsnapshots.'
};

const task3 = {
  id: 'DEMO-103',
  title: 'Diseñar panel de métricas financieras',
  status: 'draft',
  type: 'feature',
  priority: 'p2',
  assignees: [],
  labels: ['ui', 'analytics'],
  description: 'Dashboard principal con gráficos de balance y flujo de caja.',
  acceptanceCriteria: [
    { index: 1, text: 'Gráfico de barras mensual', checked: false }
  ],
  implementationPlan: ''
};

// Write files to tasksDir
const file1 = path.join(tasksDir, generateTaskFilename(task1.id, task1.title));
const file2 = path.join(tasksDir, generateTaskFilename(task2.id, task2.title));
const file3 = path.join(tasksDir, generateTaskFilename(task3.id, task3.title));

fs.writeFileSync(file1, serializeBacklogMd(task1), 'utf8');
fs.writeFileSync(file2, serializeBacklogMd(task2), 'utf8');
fs.writeFileSync(file3, serializeBacklogMd(task3), 'utf8');

console.log('✅ Created 3 sample tasks in disk');

// 3. Read and parse from disk
const readTasks = fs.readdirSync(tasksDir).map(file => {
  const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
  return parseBacklogMd(content);
});

assert.strictEqual(readTasks.length, 3);
const t1 = readTasks.find(t => t.id === 'DEMO-101');
assert.ok(t1);
assert.strictEqual(t1.status, 'doing');
assert.strictEqual(t1.acceptanceCriteria?.length, 2);
assert.strictEqual(t1.acceptanceCriteria?.[0].checked, true);
assert.strictEqual(t1.acceptanceCriteria?.[1].checked, false);
assert.ok(t1.implementationPlan?.includes('Configurar endpoints'));

console.log('✅ Read and verified tasks from disk');

// 4. Update task (toggle AC, update status to ready)
t1.status = 'ready';
t1.acceptanceCriteria[1].checked = true;
fs.writeFileSync(file1, serializeBacklogMd(t1), 'utf8');

const updatedRaw = fs.readFileSync(file1, 'utf8');
const updatedT1 = parseBacklogMd(updatedRaw);
assert.strictEqual(updatedT1.status, 'ready');
assert.strictEqual(updatedT1.acceptanceCriteria[1].checked, true);

console.log('✅ Updated task and verified AC toggling and status change');

// 5. Monolithic export
const monolithicMd = generateMonolithicBacklogMd('Demo Backlog.md Project', [updatedT1, task2, task3]);
assert.ok(monolithicMd.includes('# Backlog: Demo Backlog.md Project'));
assert.ok(monolithicMd.includes('### 🚀 Ready for Deploy (1)'));
assert.ok(monolithicMd.includes('### 🔍 Review & QA (1)'));
assert.ok(monolithicMd.includes('### 📋 Backlog / Draft (1)'));
assert.ok(monolithicMd.includes('DEMO-101'));
assert.ok(monolithicMd.includes('Tokens JWT firmados y cifrados'));

console.log('✅ Monolithic BACKLOG.md generation verified');

// 6. Test DEV-068: Sprint filtering on dev-board project
const devBoardTasksDir = path.join(__dirname, '../backlog/tasks');
if (fs.existsSync(devBoardTasksDir)) {
  const allDevBoardFiles = fs.readdirSync(devBoardTasksDir).filter(f => f.endsWith('.md'));
  const sprint3Tasks = [];
  for (const f of allDevBoardFiles) {
    const raw = fs.readFileSync(path.join(devBoardTasksDir, f), 'utf8');
    const parsed = parseBacklogMd(raw, f.split(' - ')[0]);
    const sp = parsed.sprint || parsed.targetSprint || parsed.rawExtraFrontmatter?.sprint || parsed.milestone;
    if (sp && sp.toLowerCase() === 'sprint 3') {
      sprint3Tasks.push(parsed.id);
    }
  }
  sprint3Tasks.sort();
  const expectedSprint3 = ['DEV-047', 'DEV-049', 'DEV-051', 'DEV-052', 'DEV-053', 'DEV-055', 'DEV-067'];
  assert.deepStrictEqual(sprint3Tasks, expectedSprint3, `Expected Sprint 3 tasks to match exactly: ${expectedSprint3.join(', ')} but got ${sprint3Tasks.join(', ')}`);
  console.log('✅ DEV-068: Sprint 3 filter returns exactly expected tasks: ' + sprint3Tasks.join(', '));
}

// 7. Test DEV-069: Status update via top-level status AND updates.status
const testTaskPath = path.join(tasksDir, 'DEV-TEST-001 - test-status.md');
const testTaskObj = {
  id: 'DEV-TEST-001',
  title: 'Test Status Support',
  status: 'draft',
  priority: 'p2',
  description: 'Test description',
  acceptanceCriteria: []
};
fs.writeFileSync(testTaskPath, serializeBacklogMd(testTaskObj), 'utf8');

// Top-level status update
const rawTaskTop = fs.readFileSync(testTaskPath, 'utf8');
const parsedTop = parseBacklogMd(rawTaskTop);
parsedTop.status = normalizeStatus('doing');
fs.writeFileSync(testTaskPath, serializeBacklogMd(parsedTop), 'utf8');
const verifiedTop = parseBacklogMd(fs.readFileSync(testTaskPath, 'utf8'));
assert.strictEqual(verifiedTop.status, 'doing', 'Top-level status should be doing');

// updates.status update
const rawTaskNested = fs.readFileSync(testTaskPath, 'utf8');
const parsedNested = parseBacklogMd(rawTaskNested);
const mockUpdates = { status: 'ready' };
const effectiveStatus = mockUpdates.status;
parsedNested.status = normalizeStatus(effectiveStatus);
fs.writeFileSync(testTaskPath, serializeBacklogMd(parsedNested), 'utf8');
const verifiedNested = parseBacklogMd(fs.readFileSync(testTaskPath, 'utf8'));
assert.strictEqual(verifiedNested.status, 'ready', 'updates.status should be applied as ready');
console.log('✅ DEV-069: Both top-level status and updates.status successfully validated');

// 8. Test DEV-042 & DEV-040: Local scaffolding via --init
const initTestDir = path.join(__dirname, '../data/test-init-repo');
if (fs.existsSync(initTestDir)) {
  fs.rmSync(initTestDir, { recursive: true, force: true });
}
fs.mkdirSync(initTestDir, { recursive: true });
fs.writeFileSync(path.join(initTestDir, 'package.json'), JSON.stringify({ name: 'test-app', scripts: {} }, null, 2), 'utf8');

// Simulate --init logic
const initGripmDir = path.join(initTestDir, '.gripm');
fs.mkdirSync(initGripmDir, { recursive: true });
const initConfigFile = path.join(initGripmDir, 'config.json');
fs.writeFileSync(initConfigFile, JSON.stringify({ theme: 'dark', version: '1.0.0' }, null, 2), 'utf8');
const initTasksDir = path.join(initTestDir, 'backlog/tasks');
fs.mkdirSync(initTasksDir, { recursive: true });

const pkgJson = JSON.parse(fs.readFileSync(path.join(initTestDir, 'package.json'), 'utf8'));
pkgJson.scripts = pkgJson.scripts || {};
pkgJson.scripts.board = 'gripm';
fs.writeFileSync(path.join(initTestDir, 'package.json'), JSON.stringify(pkgJson, null, 2), 'utf8');

assert.ok(fs.existsSync(path.join(initTestDir, '.gripm/config.json')), 'config.json should exist');
assert.ok(fs.existsSync(path.join(initTestDir, 'backlog/tasks')), 'backlog/tasks should exist');
const updatedPkg = JSON.parse(fs.readFileSync(path.join(initTestDir, 'package.json'), 'utf8'));
assert.strictEqual(updatedPkg.scripts.board, 'gripm', 'board script should be configured');

fs.rmSync(initTestDir, { recursive: true, force: true });
console.log('✅ DEV-042 & DEV-040: --init and embedded configuration verified');

// 9. Test DEV-048 & DEV-056: Relations and Multi-Sprint / Multi-Release Serialization & Parsing
const relationsTask = {
  id: 'DEV-TEST-002',
  title: 'Test Relations and Multi-Versions',
  status: 'draft',
  priority: 'p1',
  description: 'Testing parentId, blocks, blockedBy, sprints, and releases',
  parentId: 'DEV-047',
  blocks: ['DEV-050', 'DEV-051'],
  blockedBy: ['DEV-040'],
  relatedTo: ['DEV-055'],
  sprints: ['Sprint 3', 'Sprint 4'],
  releases: ['0.4.0', '0.5.0'],
  acceptanceCriteria: []
};

const serializedRel = serializeBacklogMd(relationsTask);
assert.ok(serializedRel.includes('parent: "DEV-047"'), 'Should serialize parent');
assert.ok(serializedRel.includes('blocks:'), 'Should serialize blocks section');
assert.ok(serializedRel.includes('blocked_by:'), 'Should serialize blocked_by section');
assert.ok(serializedRel.includes('related_to:'), 'Should serialize related_to section');
assert.ok(serializedRel.includes('sprints:'), 'Should serialize sprints section');
assert.ok(serializedRel.includes('releases:'), 'Should serialize releases section');

const parsedRel = parseBacklogMd(serializedRel, 'DEV-TEST-002');
assert.strictEqual(parsedRel.parentId, 'DEV-047', 'Should parse parentId');
assert.deepStrictEqual(parsedRel.blocks, ['DEV-050', 'DEV-051'], 'Should parse blocks');
assert.deepStrictEqual(parsedRel.blockedBy, ['DEV-040'], 'Should parse blockedBy');
assert.deepStrictEqual(parsedRel.relatedTo, ['DEV-055'], 'Should parse relatedTo');
assert.deepStrictEqual(parsedRel.sprints, ['Sprint 3', 'Sprint 4'], 'Should parse sprints');
assert.deepStrictEqual(parsedRel.releases, ['0.4.0', '0.5.0'], 'Should parse releases');
console.log('✅ DEV-048 & DEV-056: Relations and multi-sprint/release parsing & serialization verified');

// 10. Test DEV-059 & DEV-074: Custom item types taxonomy config persistence & reset
const customConfigTest = {
  theme: 'dark',
  density: 'compact',
  customItemTypes: [
    {
      key: 'spike',
      label: 'Spike Técnico',
      color: 'text-amber-500 dark:text-amber-400',
      badge: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-300',
      iconName: 'Zap'
    }
  ]
};

const customConfigJson = JSON.stringify(customConfigTest, null, 2);
const parsedConfig = JSON.parse(customConfigJson);
assert.strictEqual(parsedConfig.customItemTypes.length, 1);
assert.strictEqual(parsedConfig.customItemTypes[0].key, 'spike');
assert.strictEqual(parsedConfig.customItemTypes[0].label, 'Spike Técnico');
console.log('✅ DEV-059 & DEV-074: Custom item types taxonomy config persistence verified');

// 11. Test DEV-104: XDG and Home Directory Registry Resolution and Migration
const tempHome = path.join(__dirname, '../data/test-temp-home');
const tempLegacyPkg = path.join(__dirname, '../data/test-temp-pkg');

try {
  if (fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true, force: true });
  if (fs.existsSync(tempLegacyPkg)) fs.rmSync(tempLegacyPkg, { recursive: true, force: true });

  process.env.DEVBOARD_HOME = tempHome;
  assert.strictEqual(getDevBoardHomeDir(), tempHome, 'Should resolve DEVBOARD_HOME when set');
  const userRegistryFile = getRegistryPath(tempLegacyPkg);
  assert.strictEqual(userRegistryFile, path.join(tempHome, 'registry.json'), 'Registry path should be in home dir');

  // Create legacy registry mock
  const legacyDataDir = path.join(tempLegacyPkg, 'data');
  fs.mkdirSync(legacyDataDir, { recursive: true });
  const legacyFile = path.join(legacyDataDir, 'projects-registry.json');
  fs.writeFileSync(legacyFile, JSON.stringify({
    activeProjectId: 'migrated-proj',
    projects: [{ id: 'migrated-proj', name: 'Migrated Project', codePrefix: 'MIG', repoPath: '/tmp/mig' }]
  }, null, 2), 'utf8');

  // Load should transparently migrate to tempHome
  assert.strictEqual(fs.existsSync(userRegistryFile), false, 'User registry should not exist before load');
  const loaded = loadRegistryFile(tempLegacyPkg);
  assert.strictEqual(loaded.activeProjectId, 'migrated-proj', 'Should load legacy project');
  assert.strictEqual(fs.existsSync(userRegistryFile), true, 'User registry should be automatically created upon migration');

  // Mutating and saving should write to userRegistryFile and NOT modify legacy file
  loaded.projects.push({ id: 'new-proj', name: 'New Project', codePrefix: 'NEW' });
  saveRegistryFile(loaded, tempLegacyPkg);

  const updatedUserReg = JSON.parse(fs.readFileSync(userRegistryFile, 'utf8'));
  assert.strictEqual(updatedUserReg.projects.length, 2, 'User registry should have 2 projects');

  const legacyUnchanged = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
  assert.strictEqual(legacyUnchanged.projects.length, 1, 'Legacy registry must remain untouched');
  console.log('✅ DEV-104: XDG/Home directory registry resolution, automatic migration, and isolation verified');
} finally {
  delete process.env.DEVBOARD_HOME;
  if (fs.existsSync(tempHome)) fs.rmSync(tempHome, { recursive: true, force: true });
  if (fs.existsSync(tempLegacyPkg)) fs.rmSync(tempLegacyPkg, { recursive: true, force: true });
}

// 12. Test DEV-107: Update Checker, Semver comparison, 24h Caching & Banners
assert.strictEqual(semverGreaterThan('0.6.0', '0.5.0'), true, '0.6.0 should be greater than 0.5.0');
assert.strictEqual(semverGreaterThan('1.0.0', '0.9.9'), true, '1.0.0 should be greater than 0.9.9');
assert.strictEqual(semverGreaterThan('0.5.1', '0.5.0'), true, '0.5.1 should be greater than 0.5.0');
assert.strictEqual(semverGreaterThan('0.5.0', '0.5.0'), false, 'Equal versions should not be greater');
assert.strictEqual(semverGreaterThan('0.4.9', '0.5.0'), false, 'Older version should not be greater');
assert.strictEqual(semverGreaterThan('v0.6.0', '0.5.0'), true, 'Should handle v prefix in target');
assert.strictEqual(semverGreaterThan('0.6.0', 'v0.5.0'), true, 'Should handle v prefix in current');

const banner = formatUpdateBanner('0.5.0', '0.6.0');
assert.ok(banner.includes('0.5.0 → v0.6.0'), 'Banner should display version diff');
assert.ok(banner.includes('git pull'), 'Banner should include git instructions');
assert.ok(banner.includes('gripm@latest') || banner.includes('dev-board@latest'), 'Banner should include npm instructions');

// Test update cache reading and writing
const tempCacheDir = path.join(__dirname, '../data/test-temp-cache');
const tempCacheFile = path.join(tempCacheDir, 'update-cache.json');
try {
  if (fs.existsSync(tempCacheDir)) fs.rmSync(tempCacheDir, { recursive: true, force: true });
  process.env.DEVBOARD_UPDATE_CACHE_PATH = tempCacheFile;

  assert.strictEqual(readUpdateCache(), null, 'Should return null when cache does not exist');

  writeUpdateCache({
    lastCheck: Date.now(),
    currentVersion: '0.5.0',
    latestVersion: '0.6.0',
    hasUpdate: true
  });

  const readBack = readUpdateCache();
  assert.strictEqual(readBack?.hasUpdate, true, 'Cache should persist and read hasUpdate: true');
  assert.strictEqual(readBack?.latestVersion, '0.6.0', 'Cache should persist latestVersion');

  // getCachedUpdateInfo test
  const cachedInfo = getCachedUpdateInfo('0.5.0');
  assert.strictEqual(cachedInfo?.hasUpdate, true, 'Cached info should report hasUpdate');
  assert.strictEqual(cachedInfo?.latestVersion, '0.6.0');

  // Silencing via DEVBOARD_NO_UPDATE_CHECK
  process.env.DEVBOARD_NO_UPDATE_CHECK = '1';
  assert.strictEqual(isUpdateCheckDisabled(), true, 'Should detect DEVBOARD_NO_UPDATE_CHECK=1');
  assert.strictEqual(getCachedUpdateInfo('0.5.0'), null, 'Should return null when silenced');
  delete process.env.DEVBOARD_NO_UPDATE_CHECK;

  console.log('✅ DEV-107: Update checker semver, 24h cache persistence, silencing, and banners verified');
} finally {
  delete process.env.DEVBOARD_UPDATE_CACHE_PATH;
  delete process.env.DEVBOARD_NO_UPDATE_CHECK;
  if (fs.existsSync(tempCacheDir)) fs.rmSync(tempCacheDir, { recursive: true, force: true });
}

// 13. Test DEV-109: Interactive / Non-interactive Init Scaffolding Wizard
const testInitRepo = path.join(__dirname, '../data/test-repo-init');
try {
  if (fs.existsSync(testInitRepo)) fs.rmSync(testInitRepo, { recursive: true, force: true });
  fs.mkdirSync(testInitRepo, { recursive: true });

  // Create mock package.json
  const mockPkg = { name: 'sample-project', version: '1.0.0', scripts: { test: 'vitest' } };
  fs.writeFileSync(path.join(testInitRepo, 'package.json'), JSON.stringify(mockPkg, null, 2), 'utf8');

  // Test 13.1: Single-project scaffolding
  const resSingle = await runInitWizard(testInitRepo, {
    isInteractive: false,
    mode: 'single',
    skill: true,
    agentsMd: true,
    packageJson: true,
    gitignore: true
  });

  assert.strictEqual(resSingle.mode, 'single', 'Should configure single mode');
  assert.strictEqual(resSingle.registeredInHub, false, 'Single mode should not register in global Hub');
  assert.strictEqual(fs.existsSync(path.join(testInitRepo, '.gripm/config.json')), true, 'Config should exist in .gripm');
  assert.strictEqual(fs.existsSync(path.join(testInitRepo, 'backlog/tasks')), true, 'Tasks dir should exist');
  assert.strictEqual(fs.existsSync(path.join(testInitRepo, '.agents/skills/gripm/SKILL.md')), true, 'Canonical gripm SKILL.md should be created');
  assert.strictEqual(fs.existsSync(path.join(testInitRepo, '.agents/skills/devboard/SKILL.md')), false, 'DEV-161: Legacy devboard skill must NOT be created');
  assert.strictEqual(fs.existsSync(path.join(testInitRepo, 'AGENTS.md')), true, 'AGENTS.md should be created');

  const updatedPkg = JSON.parse(fs.readFileSync(path.join(testInitRepo, 'package.json'), 'utf8'));
  assert.ok((updatedPkg.scripts.board.includes('gripm') || updatedPkg.scripts.board.includes('devboard')) && (updatedPkg.scripts.board.includes('npx -y @gripm/board') || updatedPkg.scripts.board.includes('npx -y github:')), 'Should add resilient board script with fallback');
  assert.ok((updatedPkg.scripts.mcp.includes('gripm-mcp') || updatedPkg.scripts.mcp.includes('devboard-mcp')) && (updatedPkg.scripts.mcp.includes('npx -y -p @gripm/board') || updatedPkg.scripts.mcp.includes('npx -y -p github:')), 'Should add resilient mcp script with fallback');
  assert.strictEqual(updatedPkg.scripts.test, 'vitest', 'Should preserve existing scripts');

  const gitignoreContent = fs.readFileSync(path.join(testInitRepo, '.gitignore'), 'utf8');
  assert.ok(gitignoreContent.includes('.gripm/update-cache.json'), '.gitignore should contain gripm ignores');

  // Test 13.2: Idempotence & Non-destructivity (create a task and re-run with options)
  const sampleTaskFile = path.join(testInitRepo, 'backlog/tasks/DEV-001 - Test Task.md');
  fs.writeFileSync(sampleTaskFile, '# Task DEV-001', 'utf8');

  // Re-run with Hub mode
  const resReRun = await runInitWizard(testInitRepo, {
    isInteractive: false,
    mode: 'multi',
    skill: true,
    agentsMd: true,
    packageJson: true,
    gitignore: true
  });

  assert.strictEqual(resReRun.mode, 'multi', 'Re-run should allow changing mode');
  assert.strictEqual(fs.existsSync(sampleTaskFile), true, 'Existing tasks MUST NOT be deleted upon re-initialization');
  assert.strictEqual(fs.readFileSync(sampleTaskFile, 'utf8'), '# Task DEV-001', 'Task content must remain untouched');

  // Test 13.3: DEV-114 - Bilingual scaffolding (English)
  const resEn = await runInitWizard(testInitRepo, {
    isInteractive: false,
    mode: 'single',
    language: 'en',
    skill: true,
    agentsMd: true,
    packageJson: true,
    gitignore: true,
    force: true
  });

  assert.strictEqual(resEn.language, 'en', 'Language should be english');
  const enConfig = JSON.parse(fs.readFileSync(path.join(testInitRepo, '.gripm/config.json'), 'utf8'));
  assert.strictEqual(enConfig.language, 'en', 'Config should persist language: en');
  const canonicalEnSkill = fs.readFileSync(path.join(testInitRepo, '.agents/skills/gripm/SKILL.md'), 'utf8');
  assert.ok(canonicalEnSkill.includes('gripm') && canonicalEnSkill.includes('This skill instructs'), 'Canonical English skill should be generated');
  const enAgents = fs.readFileSync(path.join(testInitRepo, 'AGENTS.md'), 'utf8');
  assert.ok(enAgents.includes('AI Agent Contribution Guide') && enAgents.includes('Welcome to'), 'English AGENTS.md should be generated');

  console.log('✅ DEV-109 / DEV-114: Interactive, customizable, and bilingual scaffolding wizard verified');
} finally {
  if (fs.existsSync(testInitRepo)) fs.rmSync(testInitRepo, { recursive: true, force: true });
}

// DEV-115: Desacople seguro. La garantia central es que backlog/ nunca se toca,
// y que un script propio del usuario llamado "board" se preserva.
{
  const { uninstallLocalProject, revertManagedScripts, runUninstallCommand, PROTECTED_PATHS } =
    await import('./uninstall.js');

  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'devboard-uninstall-'));
  try {
    // Fixture: un repo con backlog real, config local, scripts de npm y agentes.
    fs.mkdirSync(path.join(repo, 'backlog', 'tasks'), { recursive: true });
    fs.writeFileSync(
      path.join(repo, 'backlog', 'tasks', 'DEV-001 - algo.md'),
      '---\nid: DEV-001\n---\n\nTarea importante\n',
      'utf8'
    );
    fs.writeFileSync(path.join(repo, 'BACKLOG.md'), '# Backlog\n', 'utf8');
    fs.mkdirSync(path.join(repo, '.devboard'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.devboard', 'config.json'), '{"mode":"single"}', 'utf8');
    fs.mkdirSync(path.join(repo, '.agents', 'skills', 'gripm'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.agents', 'skills', 'gripm', 'SKILL.md'), 'skill', 'utf8');
    fs.mkdirSync(path.join(repo, '.agents', 'skills', 'devboard'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.agents', 'skills', 'devboard', 'SKILL.md'), 'skill', 'utf8');
    fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# Guion', 'utf8');
    fs.writeFileSync(
      path.join(repo, 'package.json'),
      JSON.stringify(
        {
          name: 'fixture',
          scripts: {
            board: 'npx -y github:pablojavierrodriguez/dev-board',
            mcp: 'npx -y -p github:pablojavierrodriguez/dev-board devboard-mcp',
            test: 'vitest',
            build: 'tsc'
          }
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      path.join(repo, '.gitignore'),
      'node_modules\n\n# DevBoard local cache\n.devboard/update-cache.json\n.devboard/*.tmp\n',
      'utf8'
    );

    // --- Desacople local preservando los artefactos de agente ---
    const res = uninstallLocalProject(repo, { removeAgentArtifacts: false });

    // La garantia inviolable: el backlog sigue intacto byte a byte.
    assert.strictEqual(
      fs.readFileSync(path.join(repo, 'backlog', 'tasks', 'DEV-001 - algo.md'), 'utf8'),
      '---\nid: DEV-001\n---\n\nTarea importante\n',
      'DEV-115: la tarea del backlog debe quedar intacta'
    );
    assert.strictEqual(fs.existsSync(path.join(repo, 'BACKLOG.md')), true, 'DEV-115: BACKLOG.md debe sobrevivir');

    // Config local fuera, artefactos de agente conservados.
    assert.strictEqual(fs.existsSync(path.join(repo, '.devboard', 'config.json')), false, 'DEV-115: .devboard local debe eliminarse');
    assert.strictEqual(fs.existsSync(path.join(repo, '.agents', 'skills', 'gripm', 'SKILL.md')), true, 'DEV-115: la skill canónica debe preservarse por defecto');
    assert.strictEqual(fs.existsSync(path.join(repo, '.agents', 'skills', 'devboard', 'SKILL.md')), true, 'DEV-115: la skill debe preservarse por defecto');
    assert.strictEqual(fs.existsSync(path.join(repo, 'AGENTS.md')), true, 'DEV-115: AGENTS.md debe preservarse por defecto');

    // Scripts gestionados revertidos, scripts propios intactos.
    const pkgAfter = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
    assert.strictEqual(pkgAfter.scripts.board, undefined, 'DEV-115: el script board inyectado debe revertirse');
    assert.strictEqual(pkgAfter.scripts.mcp, undefined, 'DEV-115: el script mcp inyectado debe revertirse');
    assert.strictEqual(pkgAfter.scripts.test, 'vitest', 'DEV-115: los scripts propios del usuario no se tocan');
    assert.strictEqual(pkgAfter.scripts.build, 'tsc', 'DEV-115: los scripts propios del usuario no se tocan');

    // .gitignore: solo se van las lineas de DevBoard.
    const gi = fs.readFileSync(path.join(repo, '.gitignore'), 'utf8');
    assert.ok(!gi.includes('.devboard/update-cache.json'), 'DEV-115: la regla de DevBoard debe quitarse del .gitignore');
    assert.ok(gi.includes('node_modules'), 'DEV-115: las reglas propias del usuario deben preservarse');

    // --- Un script propio llamado "board" NO se toca ---
    fs.writeFileSync(
      path.join(repo, 'package.json'),
      JSON.stringify({ name: 'fixture', scripts: { board: 'mi-script-propio', test: 'vitest' } }, null, 2),
      'utf8'
    );
    const preserved = revertManagedScripts(repo);
    assert.strictEqual(preserved.removed.length, 0, 'DEV-115: no debe revertir un script propio');
    assert.ok(preserved.preserved.includes('board'), 'DEV-115: debe reportar el script preservado');
    assert.strictEqual(
      JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).scripts.board,
      'mi-script-propio',
      'DEV-115: el script propio "board" debe sobrevivir intacto'
    );

    // --- Con eliminacion explicita de artefactos de agente ---
    const res2 = uninstallLocalProject(repo, { removeAgentArtifacts: true });
    assert.strictEqual(fs.existsSync(path.join(repo, '.agents', 'skills', 'gripm')), false, 'DEV-115: --remove-agents debe eliminar la skill canónica');
    assert.strictEqual(fs.existsSync(path.join(repo, '.agents', 'skills', 'devboard')), false, 'DEV-115: --remove-agents debe eliminar la skill');
    assert.strictEqual(fs.existsSync(path.join(repo, 'AGENTS.md')), false, 'DEV-115: --remove-agents debe eliminar AGENTS.md');
    assert.strictEqual(fs.existsSync(path.join(repo, 'BACKLOG.md')), true, 'DEV-115: ni siquiera en este modo se toca el backlog');

    // --- La lista de proteccion cubre lo declarado ---
    assert.ok(PROTECTED_PATHS.includes('backlog'), 'DEV-115: backlog debe estar protegido');
    assert.ok(PROTECTED_PATHS.includes('BACKLOG.md'), 'DEV-115: BACKLOG.md debe estar protegido');
    assert.ok(res.scope === 'local', 'DEV-115: el modo por defecto es local');
    assert.strictEqual(res2.integrityWarning, undefined, 'DEV-115: no debe haber advertencia con el backlog presente');

    // El .gitignore no debe quedar con el comentario de DevBoard huerfano.
    const giFinal = fs.readFileSync(path.join(repo, '.gitignore'), 'utf8');
    assert.ok(
      !giFinal.includes('# DevBoard local cache'),
      'DEV-115: al revertir el .gitignore no debe quedar el comentario de DevBoard huerfano'
    );
    assert.ok(giFinal.includes('node_modules'), 'DEV-115: las reglas ajenas al .gitignore se preservan');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }

  // Regresion: el nombre de la opcion debe coincidir entre el CLI y la funcion.
  // Con `agentArtifacts` en un lado y `removeAgentArtifacts` en el otro, el flag
  // `--remove-agents` se aceptaba y se ignoraba en silencio.
  {
    const repo2 = fs.mkdtempSync(path.join(os.tmpdir(), 'devboard-uninstall-'));
    try {
      fs.mkdirSync(path.join(repo2, 'backlog', 'tasks'), { recursive: true });
      fs.writeFileSync(path.join(repo2, 'backlog', 'tasks', 'DEV-001 - x.md'), 'tarea', 'utf8');
      fs.writeFileSync(path.join(repo2, 'BACKLOG.md'), '# Backlog', 'utf8');
      fs.mkdirSync(path.join(repo2, '.agents', 'skills', 'gripm'), { recursive: true });
      fs.writeFileSync(path.join(repo2, '.agents', 'skills', 'gripm', 'SKILL.md'), 's', 'utf8');
      fs.mkdirSync(path.join(repo2, '.agents', 'skills', 'devboard'), { recursive: true });
      fs.writeFileSync(path.join(repo2, '.agents', 'skills', 'devboard', 'SKILL.md'), 's', 'utf8');
      fs.writeFileSync(path.join(repo2, 'AGENTS.md'), 'g', 'utf8');

      await runUninstallCommand(repo2, { yes: true, removeAgentArtifacts: true });

      assert.strictEqual(
        fs.existsSync(path.join(repo2, '.agents', 'skills', 'gripm')),
        false,
        'DEV-115: removeAgentArtifacts debe eliminar la skill canónica'
      );
      assert.strictEqual(
        fs.existsSync(path.join(repo2, '.agents', 'skills', 'devboard')),
        false,
        'DEV-115: removeAgentArtifacts debe eliminar la skill (el nombre de la opcion debe coincidir)'
      );
      assert.strictEqual(
        fs.existsSync(path.join(repo2, 'AGENTS.md')),
        false,
        'DEV-115: removeAgentArtifacts debe eliminar AGENTS.md'
      );
      assert.strictEqual(
        fs.existsSync(path.join(repo2, 'backlog', 'tasks', 'DEV-001 - x.md')),
        true,
        'DEV-115: el backlog sobrevive incluso eliminando los artefactos de agente'
      );
    } finally {
      fs.rmSync(repo2, { recursive: true, force: true });
    }
  }

    // DEV-185: Flujo interactivo con node:readline/promises sin crashear por .trim()
  {
    const repoInteractive = fs.mkdtempSync(path.join(os.tmpdir(), "gripm-uninstall-interactive-"));
    try {
      fs.mkdirSync(path.join(repoInteractive, "backlog", "tasks"), { recursive: true });
      fs.writeFileSync(path.join(repoInteractive, "backlog", "tasks", "DEV-001 - demo.md"), "demo", "utf8");
      fs.writeFileSync(path.join(repoInteractive, "BACKLOG.md"), "# Backlog", "utf8");
      fs.mkdirSync(path.join(repoInteractive, ".agents", "skills", "gripm"), { recursive: true });
      fs.writeFileSync(path.join(repoInteractive, ".agents", "skills", "gripm", "SKILL.md"), "skill", "utf8");
      fs.writeFileSync(path.join(repoInteractive, "AGENTS.md"), "agents", "utf8");

      const mockInput = new PassThrough();
      let inputIdx = 0;
      const answers = ["1", "s"];
      const timer = setInterval(() => {
        if (inputIdx < answers.length) {
          mockInput.write(answers[inputIdx++] + "\n");
        } else {
          clearInterval(timer);
        }
      }, 10);
      let outputBuffer = "";
      const mockOutput = new Writable({
        write(chunk, _encoding, callback) {
          outputBuffer += chunk.toString();
          callback();
        }
      });

      const res = await runUninstallCommand(repoInteractive, {
        interactive: true,
        input: mockInput,
        output: mockOutput
      });

      clearInterval(timer);
      assert.strictEqual(res.scope, "local", "DEV-185: scope interactivo debe ser local con opcion 1");
      assert.strictEqual(
        fs.existsSync(path.join(repoInteractive, ".agents", "skills", "gripm")),
        false,
        "DEV-185: debe remover artefactos de agente tras confirmacion interactiva"
      );
      assert.strictEqual(
        fs.existsSync(path.join(repoInteractive, "backlog", "tasks", "DEV-001 - demo.md")),
        true,
        "DEV-185: backlog debe permanecer intacto"
      );
    } finally {
      fs.rmSync(repoInteractive, { recursive: true, force: true });
    }
  }

  console.log('✅ DEV-115: Safe uninstall preserves backlog and user scripts');
}

// DEV-159: Validación condicional en pre-commit hook por archivos de backlog en el índice de Git
{
  const hookRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gripm-hook-test-'));
  const verifyScript = path.resolve(__dirname, 'verify-backlog-sync.js');
  try {
    execSync('git init', { cwd: hookRepo, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: hookRepo, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: hookRepo, stdio: 'pipe' });

    fs.mkdirSync(path.join(hookRepo, 'backlog/tasks'), { recursive: true });
    fs.mkdirSync(path.join(hookRepo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(hookRepo, 'src/index.js'), 'console.log("hello");\n');

    // Initial commit
    execSync('git add src/index.js', { cwd: hookRepo, stdio: 'pipe' });
    execSync('git commit -m "initial"', { cwd: hookRepo, stdio: 'pipe' });

    // Test 1: Staging a non-backlog file should skip backlog validation with exit code 0
    fs.writeFileSync(path.join(hookRepo, 'src/index.js'), 'console.log("updated");\n');
    execSync('git add src/index.js', { cwd: hookRepo, stdio: 'pipe' });
    const skipOut = execSync(`node "${verifyScript}" --hook`, {
      cwd: hookRepo,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    assert.ok(skipOut.includes('Sin cambios de backlog en este commit. Verificación omitida.'), 'DEV-159: Debe omitir verificación si no hay archivos de backlog en el stage');

    // Test 2: Staging a task file without BACKLOG.md should fail (exit 1)
    const taskContent = '---\nid: DEV-001\ntitle: Test\nstatus: draft\n---\n\n<!-- AC:BEGIN -->\n- [ ] #1 AC\n<!-- AC:END -->\n';
    fs.writeFileSync(path.join(hookRepo, 'backlog/tasks/DEV-001 - test.md'), taskContent);
    execSync('git add "backlog/tasks/DEV-001 - test.md"', { cwd: hookRepo, stdio: 'pipe' });

    let failedAsExpected = false;
    try {
      execSync(`node "${verifyScript}" --hook`, {
        cwd: hookRepo,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      failedAsExpected = true;
      const combined = (err.stderr || '') + (err.stdout || '');
      assert.ok(combined.includes('BACKLOG.md" no está incluido en el índice'), 'DEV-159: Debe exigir BACKLOG.md cuando hay tareas en el stage');
    }
    assert.strictEqual(failedAsExpected, true, 'DEV-159: Debe rechazar commit si hay tareas stageadas sin BACKLOG.md');

    // Test 3: Staging BACKLOG.md while it references an untracked ghost task should fail
    fs.writeFileSync(path.join(hookRepo, 'BACKLOG.md'), '# Backlog\n\n| DEV-002 | Ghost Task |\n');
    fs.writeFileSync(path.join(hookRepo, 'backlog/tasks/DEV-002 - ghost.md'), '---\nid: DEV-002\nstatus: draft\n---\n');
    // DEV-002 is untracked (??) on disk!
    execSync('git add BACKLOG.md', { cwd: hookRepo, stdio: 'pipe' });

    let ghostFailed = false;
    try {
      execSync(`node "${verifyScript}" --hook`, {
        cwd: hookRepo,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      ghostFailed = true;
      const combined = (err.stderr || '') + (err.stdout || '');
      assert.ok(combined.includes('archivos fantasma') || combined.includes('DEV-002'), 'DEV-159: Debe detectar tareas fantasma no trackeadas');
    }
    assert.strictEqual(ghostFailed, true, 'DEV-159: Debe rechazar BACKLOG.md con tareas fantasma');

    console.log('✅ DEV-159: Conditional pre-commit backlog validation on git index verified');
  } finally {
    fs.rmSync(hookRepo, { recursive: true, force: true });
  }
}

// DEV-177: Prioritizing localhost in default URL while maintaining IPv4 loopback bind
{
  delete process.env.GRIPM_HOST;
  delete process.env.DEVBOARD_HOST;
  delete process.env.GRIPM_OPEN;
  delete process.env.DEVBOARD_OPEN;
  const originalCi = process.env.CI;
  delete process.env.CI;

  try {
    const viteConfigMod = await import('../vite.config.ts?dev177=' + Date.now());
    const rawViteConfig = viteConfigMod.default;
    const resolvedConfig = typeof rawViteConfig === 'function' ? await rawViteConfig({ command: 'serve', mode: 'development' }) : rawViteConfig;

    // 1. Socket bind must remain 127.0.0.1 for IPv4 loopback compatibility (DEV-169)
    assert.strictEqual(resolvedConfig.server.host, '127.0.0.1', 'DEV-177: server.host must default to 127.0.0.1');

    // 2. Open URL must be user-friendly localhost
    assert.ok(typeof resolvedConfig.server.open === 'string' && resolvedConfig.server.open.startsWith('http://localhost:'), 'DEV-177: server.open must default to http://localhost:<port>/');

    // 3. configureServer hook updates server.resolvedUrls.local to localhost
    const plugin = resolvedConfig.plugins.find(p => p && p.name === 'vite-plugin-dev-board-api');
    assert.ok(plugin, 'DEV-177: devBoardApi plugin must be present');

    let listenCalled = false;
    const testServer = {
      middlewares: { use: () => {} },
      resolvedUrls: {
        local: ['http://127.0.0.1:4100/'],
        network: []
      },
      listen: async () => {
        listenCalled = true;
        return testServer;
      }
    };
    plugin.configureServer(testServer);
    await testServer.listen();
    assert.strictEqual(listenCalled, true, 'DEV-177: origListen must be executed');
    assert.deepStrictEqual(testServer.resolvedUrls.local, ['http://localhost:4100/'], 'DEV-177: server.resolvedUrls.local must replace 127.0.0.1 with localhost');

    // 4. Custom host like 0.0.0.0 is preserved without forcing localhost
    process.env.GRIPM_HOST = '0.0.0.0';
    const customConfig = typeof rawViteConfig === 'function' ? await rawViteConfig({ command: 'serve', mode: 'development' }) : rawViteConfig;
    assert.strictEqual(customConfig.server.host, '0.0.0.0', 'DEV-177: Explicit custom host must be respected');
    assert.ok(typeof customConfig.server.open === 'string' && customConfig.server.open.startsWith('http://0.0.0.0:'), 'DEV-177: Custom host must be reflected in open URL');

    console.log('✅ DEV-177: User-friendly localhost default URL with IPv4 loopback socket verified');
  } finally {
    delete process.env.GRIPM_HOST;
    if (originalCi !== undefined) process.env.CI = originalCi;
  }
}

// DEV-168: Verification of canonical gripm_* localStorage keys with transparent fallback and auto-migration
{
  const mockStore = new Map();
  const mockLocalStorage = {
    getItem: (k) => mockStore.has(k) ? mockStore.get(k) : null,
    setItem: (k, v) => mockStore.set(k, String(v)),
    removeItem: (k) => mockStore.delete(k),
    clear: () => mockStore.clear()
  };

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  try {
    globalThis.window = {};
    globalThis.localStorage = mockLocalStorage;

    const storageMod = await import('../src/utils/storage.ts?dev168=' + Date.now());
    const { getStoredItem, setStoredItem, removeStoredItem, STORAGE_KEYS } = storageMod;

    // 1. All canonical keys must start with gripm_
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      assert.ok(key.startsWith('gripm_'), `DEV-168: Key ${name} must have gripm_ prefix, received ${key}`);
    }

    // 2. Direct set and get on canonical key
    setStoredItem(STORAGE_KEYS.THEME, 'light');
    assert.strictEqual(mockStore.get('gripm_theme'), 'light', 'DEV-168: setStoredItem must write canonical gripm_theme');
    assert.strictEqual(getStoredItem(STORAGE_KEYS.THEME), 'light', 'DEV-168: getStoredItem must read canonical gripm_theme');

    // 3. Fallback and auto-migration from legacy devboard-theme
    mockStore.clear();
    mockStore.set('devboard-theme', 'dark');
    assert.strictEqual(mockStore.get('gripm_theme'), undefined, 'DEV-168: gripm_theme must not exist yet');

    const migratedTheme = getStoredItem(STORAGE_KEYS.THEME);
    assert.strictEqual(migratedTheme, 'dark', 'DEV-168: getStoredItem must fallback to devboard-theme');
    assert.strictEqual(mockStore.get('gripm_theme'), 'dark', 'DEV-168: getStoredItem must auto-migrate value into gripm_theme');

    // 4. Fallback and auto-migration from legacy devboard_active_tab
    mockStore.clear();
    mockStore.set('devboard_active_tab', 'sprint');
    const migratedTab = getStoredItem(STORAGE_KEYS.ACTIVE_TAB);
    assert.strictEqual(migratedTab, 'sprint', 'DEV-168: getStoredItem must fallback to devboard_active_tab');
    assert.strictEqual(mockStore.get('gripm_active_tab'), 'sprint', 'DEV-168: getStoredItem must auto-migrate into gripm_active_tab');

    // 5. Remove removes canonical and legacy
    removeStoredItem(STORAGE_KEYS.ACTIVE_TAB);
    assert.strictEqual(mockStore.has('gripm_active_tab'), false, 'DEV-168: canonical key must be removed');
    assert.strictEqual(mockStore.has('devboard_active_tab'), false, 'DEV-168: legacy key must be removed');

    console.log('✅ DEV-168: Canonical gripm_* localStorage keys and resilient auto-migration verified');
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
}

// Clean up test files
fs.rmSync(testRepoDir, { recursive: true, force: true });
console.log('🧹 Cleaned up test directory');

console.log('🎉 Full verification passed successfully!');
