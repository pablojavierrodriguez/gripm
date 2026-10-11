import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { serializeBacklogMd } from './backlogMdParser.ts';

const TASKS_DIR = path.resolve(process.cwd(), 'backlog/tasks');
const TEST_ID = 'DEV-999';
const ANOMALOUS_FILENAME = 'anomalous-orphan-task-file.md';
const ANOMALOUS_PATH = path.join(TASKS_DIR, ANOMALOUS_FILENAME);

console.log('🧪 Iniciando pruebas de DEV-019 (Resiliencia) y DEV-020 (CLI y token efficiency)...');

function cleanup() {
  if (fs.existsSync(ANOMALOUS_PATH)) {
    try { fs.unlinkSync(ANOMALOUS_PATH); } catch {}
  }
  const canonicalPath = path.join(TASKS_DIR, 'DEV-999 - Tarea de prueba huérfana para resiliencia.md');
  if (fs.existsSync(canonicalPath)) {
    try { fs.unlinkSync(canonicalPath); } catch {}
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

try {
  // 1. Crear tarea con nombre anómalo sin prefijo de código en el nombre de archivo
  const testTask = {
    id: TEST_ID,
    title: 'Tarea de prueba huérfana para resiliencia',
    status: 'draft',
    priority: 'p1',
    type: 'feature',
    createdDate: '2026-09-16',
    updatedDate: '2026-09-16',
    description: 'Esta tarea tiene un nombre de archivo que no sigue el prefijo.',
    acceptanceCriteria: [{ index: 1, text: 'Debe ser encontrada por frontmatter', checked: false }]
  };

  fs.writeFileSync(ANOMALOUS_PATH, serializeBacklogMd(testTask), 'utf8');
  console.log('✅ Creado archivo anómalo:', ANOMALOUS_FILENAME);
  // 2. Verificar que gripm-cli la lista correctamente reconociendo el ID de frontmatter
  const cliOutput = execSync('node --experimental-strip-types scripts/gripm-cli.ts list --open --search "huérfana"', {
    encoding: 'utf8'
  });
  console.log('Salida CLI:\n', cliOutput);
  if (!cliOutput.includes('[DEV-999]') || !cliOutput.includes('Tarea de prueba huérfana')) {
    throw new Error('DEV-019/DEV-020 FAILED: gripm-cli no reconoció la tarea por frontmatter.');
  }
  console.log('✅ DEV-019: CLI reconoció la tarea huérfana por frontmatter YAML');

  // 3. Verificar gripm-cli con --json
  const jsonOutput = execSync('node --experimental-strip-types scripts/gripm-cli.ts list --open --search "DEV-999" --json', {
    encoding: 'utf8'
  });
  const parsed = JSON.parse(jsonOutput);
  if (!parsed.items || parsed.items.length !== 1 || parsed.items[0].id !== 'DEV-999') {
    throw new Error('DEV-020 FAILED: gripm-cli --json no retornó el ítem esperado.');
  }
  console.log('✅ DEV-020: Salida JSON estructurada validada');

  // 4. Verificar comando npm run tasks
  const npmTasksOutput = execSync('npm run tasks -- --limit 5', { encoding: 'utf8' });
  if (!npmTasksOutput.includes('Backlog:') || !npmTasksOutput.includes('DEV-')) {
    throw new Error('npm run tasks no funcionó como se esperaba.');
  }
  console.log('✅ npm run tasks ejecutado exitosamente');

  // 5. DEV-209: Verificar consistencia de --help y subcomandos de ayuda en CLI
  const helpOutput = execSync('node bin/gripm.js --help', { encoding: 'utf8' });
  if (!helpOutput.includes('Comandos:') || !helpOutput.includes('Opciones de Cockpit:') || !helpOutput.includes('--single') || !helpOutput.includes('127.0.0.1')) {
    throw new Error('DEV-209 FAILED: node bin/gripm.js --help no incluye las secciones y opciones esperadas.');
  }
  console.log('✅ DEV-209: node bin/gripm.js --help verificado con éxito');

  const mcpHelpOutput = execSync('node bin/gripm.js mcp --help', { encoding: 'utf8' });
  if (!mcpHelpOutput.includes('gripm mcp - Servidor Model Context Protocol')) {
    throw new Error('DEV-209 FAILED: node bin/gripm.js mcp --help falló.');
  }
  console.log('✅ DEV-209: node bin/gripm.js mcp --help verificado con éxito');

  const standaloneMcpHelp = execSync('node bin/gripm-mcp.js --help', { encoding: 'utf8' });
  if (!standaloneMcpHelp.includes('gripm-mcp - Servidor Model Context Protocol')) {
    throw new Error('DEV-209 FAILED: node bin/gripm-mcp.js --help falló.');
  }
  console.log('✅ DEV-209: node bin/gripm-mcp.js --help verificado con éxito');

  const playbookHelp = execSync('node bin/gripm.js playbook --help', { encoding: 'utf8' });
  if (!playbookHelp.includes('gripm playbook - Herramientas y sincronización')) {
    throw new Error('DEV-209 FAILED: node bin/gripm.js playbook --help falló.');
  }
  console.log('✅ DEV-209: node bin/gripm.js playbook --help verificado con éxito');

  const playbookSyncHelp = execSync('node bin/gripm.js playbook sync --help', { encoding: 'utf8' });
  if (!playbookSyncHelp.includes('gripm playbook sync [opciones]')) {
    throw new Error('DEV-209 FAILED: node bin/gripm.js playbook sync --help falló.');
  }
  console.log('✅ DEV-209: node bin/gripm.js playbook sync --help verificado con éxito');

  // 6. DEV-215: Verificar tolerancia de flags variantes (--h, -help) y separación de binario MCP
  for (const flag of ['--h', '-help', '-h']) {
    const mainHelpVariant = execSync(`node bin/gripm.js ${flag}`, { encoding: 'utf8' });
    if (!mainHelpVariant.includes('gripm CLI - productos locales')) {
      throw new Error(`DEV-215 FAILED: node bin/gripm.js ${flag} no desplegó la ayuda esperada.`);
    }
    const mcpHelpVariant = execSync(`node bin/gripm.js mcp ${flag}`, { encoding: 'utf8' });
    if (!mcpHelpVariant.includes('gripm mcp - Servidor Model Context Protocol')) {
      throw new Error(`DEV-215 FAILED: node bin/gripm.js mcp ${flag} no desplegó la ayuda esperada.`);
    }
    const standaloneMcpVariant = execSync(`node bin/gripm-mcp.js ${flag}`, { encoding: 'utf8' });
    if (!standaloneMcpVariant.includes('gripm-mcp - Servidor Model Context Protocol')) {
      throw new Error(`DEV-215 FAILED: node bin/gripm-mcp.js ${flag} no desplegó la ayuda esperada.`);
    }
  }

  const playbookVariant = execSync('node bin/gripm.js playbook --h', { encoding: 'utf8' });
  if (!playbookVariant.includes('gripm playbook - Herramientas y sincronización')) {
    throw new Error('DEV-215 FAILED: node bin/gripm.js playbook --h falló.');
  }

  const playbookSyncVariant = execSync('node bin/gripm.js playbook sync --h', { encoding: 'utf8' });
  if (!playbookSyncVariant.includes('gripm playbook sync [opciones]')) {
    throw new Error('DEV-215 FAILED: node bin/gripm.js playbook sync --h falló.');
  }

  if (helpOutput.includes('Gripm Suite no tiene aún un instalador')) {
    throw new Error('DEV-215 FAILED: la ayuda aún contiene la mención obsoleta a Gripm Suite.');
  }
  console.log('✅ DEV-215: Tolerancia de variantes de flags (--h, -help) y limpieza de ayuda verificadas con éxito');

  // 7. DEV-216: Cero creación preventiva de backlog/tasks en carpetas no inicializadas
  const tempNoBacklog = path.join(process.cwd(), 'data/test-no-backlog-' + Date.now());
  fs.mkdirSync(tempNoBacklog, { recursive: true });
  try {
    execSync(`node bin/gripm.js --repo "${tempNoBacklog}" --help`, { encoding: 'utf8' });
    const tasksCreated = fs.existsSync(path.join(tempNoBacklog, 'backlog/tasks'));
    if (tasksCreated) {
      throw new Error('DEV-216 FAILED: bin/gripm.js creó preventivamente backlog/tasks en el repositorio sin --init');
    }
    console.log('✅ DEV-216: bin/gripm.js no crea backlog/tasks preventivamente en consultas o arranque sin --init');
  } finally {
    if (fs.existsSync(tempNoBacklog)) {
      fs.rmSync(tempNoBacklog, { recursive: true, force: true });
    }
  }

  // 8. DEV-240: Verificación de precedencia de flags CLI --single vs --hub e interoperabilidad
  {
    const binSource = fs.readFileSync(path.join(process.cwd(), 'bin/gripm.js'), 'utf8');
    if (!binSource.includes("process.env.GRIPM_MODE = 'multi'") || !binSource.includes("process.env.GRIPM_MODE = 'single'") || !binSource.includes("delete process.env.GRIPM_MODE")) {
      throw new Error('DEV-240 FAILED: bin/gripm.js no maneja flags --single / --hub con precedencia limpia');
    }

    const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
    if (!appSource.includes('singleProject={boardData ? Boolean(boardData.singleProject) :')) {
      throw new Error('DEV-240 FAILED: src/App.tsx no prioriza boardData.singleProject para el selector');
    }

    const viteSource = fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf8');
    if (!viteSource.includes('if (!reg.activeProjectId) {') || !viteSource.includes('reg.activeProjectId = existingLocal.id;')) {
      throw new Error('DEV-240 FAILED: vite.config.ts no preserva activeProjectId al descubrir repo local');
    }

    console.log('✅ DEV-240: Banderas CLI --single / --hub y preservación de proyecto activo validadas');
  }


} finally {
  // Limpieza
  if (fs.existsSync(ANOMALOUS_PATH)) {
    fs.unlinkSync(ANOMALOUS_PATH);
  }
  // Limpiar si se renombró canónicamente
  const canonicalPath = path.join(TASKS_DIR, 'DEV-999 - Tarea de prueba huérfana para resiliencia.md');
  if (fs.existsSync(canonicalPath)) {
    fs.unlinkSync(canonicalPath);
  }
  console.log('🧹 Limpieza de archivos de prueba completada');
}

console.log('🎉 Todas las validaciones de DEV-019 y DEV-020 pasaron con éxito!');
process.exit(0);
