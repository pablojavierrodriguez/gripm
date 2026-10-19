import seed from './demo-backlog.json' with { type: 'json' };
import type { BacklogItem, BoardData, GripmConfig, Project, Release, Sprint } from '../types';
import type { GripmApi } from './types';
import { getStoredJSON, removeStoredItem, setStoredJSON, STORAGE_KEYS } from '../utils/storage.ts';

/**
 * DEV-222 - Adaptador en memoria de la sandbox web.
 *
 * Gripm es local-first: el tablero habla con un daemon por HTTP. Desplegado como
 * estático en Vercel no hay daemon, así que `dist/` sirve y **todos** los `/api/*`
 * dan 404 siempre. Este adaptador es lo que permite que la app funcione igual:
 * implementa el mismo contrato sobre un `BoardData` en memoria.
 *
 * El dataset semilla es el mismo `src/data/demo-backlog.json` que consume el daemon
 * para el proyecto demo, no una copia: un fixture paralelo divergiría en la
 * primera iteración sin que nadie lo note.
 *
 * Persistencia: las mutaciones se escriben en localStorage, así que lo que el
 * visitante haga en la demo sobrevive a la recarga. `resetSandbox()` vuelve al
 * dataset original.
 */

/**
 * Config por defecto de la demo. Todos los tabs visibles: es una vidriera.
 *
 * **Sin `locale` a propósito.** `App.tsx:238` solo llama a `setLanguage()` si `cfg.locale`
 * viene definido; si se deja vacío, manda `getInitialLanguage()` (`src/utils/i18n.tsx:14`),
 * que resuelve en este orden: preferencia guardada → `navigator.language` → español por
 * defecto. Hardcodear `'en'` acá pisaba esa detección y forzaba inglés a un visitante
 * hispanohablante.
 */
const SANDBOX_CONFIG: GripmConfig = {
  theme: 'dark',
  density: 'comfortable',
  methodology: 'kanban',
  defaultView: 'kanban',
  mode: 'single',
  enabledTabs: { kanban: true, sprint: true, release: true },
  modulesList: [
    'Colaboración',
    'Design System',
    'Documentación',
    'Ingesta CSV',
    'Notificaciones',
  ],
};

const DEMO_PROJECT_ID = 'demo';

/**
 * `BoardData.sprints` es opcional en el contrato porque no todos los proyectos lo
 * tienen. En la sandbox no es opcional: siempre hay una lista, y hacer que el tipo
 * interno lo fuera obligaría a proteger 12 accesos con `?? []`.
 */
type SandboxState = Omit<BoardData, 'sprints'> & { sprints: Sprint[] };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Construye el `BoardData` inicial desde el JSON semilla.
 *
 * El archivo guarda un `project` suelto, no `projects[]`: se envuelve para
 * cumplir la forma de `BoardData`.
 */
function boardFromSeed(): SandboxState {
  return {
    projects: [clone(seed.project) as unknown as Project],
    activeProjectId: DEMO_PROJECT_ID,
    singleProject: true,
    items: clone(seed.items) as unknown as BacklogItem[],
    releases: clone(seed.releases) as unknown as Release[],
    sprints: clone((seed as { sprints?: Sprint[] }).sprints ?? []) as Sprint[],
    lastUpdated: seed.lastUpdated ?? now(),
  };
}

let state: SandboxState = getStoredJSON<SandboxState>(STORAGE_KEYS.SANDBOX_BOARD) ?? boardFromSeed();
let config: GripmConfig = getStoredJSON<GripmConfig>(STORAGE_KEYS.SANDBOX_CONFIG) ?? { ...SANDBOX_CONFIG };

function persist(): void {
  state.lastUpdated = now();
  setStoredJSON(STORAGE_KEYS.SANDBOX_BOARD, state);
}

function findItem(id: string): BacklogItem | undefined {
  return state.items.find((it) => it.id === id || it.code === id);
}

function requireItem(id: string): BacklogItem {
  const item = findItem(id);
  if (!item) throw new Error(`Sandbox: ítem inexistente "${id}"`);
  return item;
}

/** Siguiente correlativo del prefijo del proyecto: DEMO-008, DEMO-009, ... */
function nextCode(prefix: string): string {
  const max = state.items.reduce((acc, it) => {
    const m = new RegExp(`^${prefix}-(\\d+)$`).exec(it.code);
    return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function activeProject(): Project | undefined {
  return state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0];
}

/**
 * Garantiza el invariante de un solo sprint activo, igual que hace el daemon en
 * `server/routes/api.ts:1024`.
 */
function demoteOtherActiveSprints(sprintId: string): void {
  state.sprints = state.sprints.map((s) =>
    s.id !== sprintId && s.status === 'active' ? { ...s, status: 'planned' } : s,
  );
}

/**
 * DEV-222 - Restablece la demo al dataset semilla y borra la persistencia.
 * Es lo que tiene que pasar detrás del botón "Reset demo".
 */
export function resetSandbox(): void {
  removeStoredItem(STORAGE_KEYS.SANDBOX_BOARD);
  removeStoredItem(STORAGE_KEYS.SANDBOX_CONFIG);
  state = boardFromSeed();
  config = { ...SANDBOX_CONFIG };
}

export const sandboxAdapter: GripmApi = {
  // --- Tablero -------------------------------------------------------------
  async fetchBoardData() {
    return clone(state);
  },

  // --- Ítems ---------------------------------------------------------------
  async createItem(item) {
    const project = (item.projectId ? state.projects.find((p) => p.id === item.projectId) : undefined) ?? activeProject();
    const prefix = project?.codePrefix ?? 'TASK';
    // `Partial<BacklogItem>` deja `title` opcional, pero es obligatorio en el
    // dominio: se valida acá en vez de dejar que un ítem sin título llegue al tablero.
    if (!item.title || !item.title.trim()) {
      throw new Error('Sandbox: el título es obligatorio');
    }
    const created: BacklogItem = {
      ...clone(item),
      title: item.title.trim(),
      description: item.description ?? '',
      type: item.type ?? 'feature',
      priority: item.priority ?? 'p2',
      status: item.status ?? 'draft',
      id: `sandbox-item-${now()}-${state.items.length}`,
      code: item.code || nextCode(prefix),
      projectId: project?.id ?? DEMO_PROJECT_ID,
      order: state.items.length + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    state.items = [...state.items, created];
    persist();
    return clone(created);
  },

  async updateItem(id, updates) {
    const existing = requireItem(id);
    const updated: BacklogItem = { ...existing, ...clone(updates), id: existing.id, code: existing.code, updatedAt: now() };
    state.items = state.items.map((it) => (it.id === existing.id ? updated : it));
    persist();
    return clone(updated);
  },

  /** Borrado lógico (DEV-049): el ítem sale de las vistas activas pero sigue en el array. */
  async deleteItem(id) {
    const existing = requireItem(id);
    state.items = state.items.map((it) =>
      it.id === existing.id
        ? { ...it, isDeleted: true, deletedAt: now(), previousStatus: it.previousStatus || it.status }
        : it,
    );
    persist();
    return true;
  },

  async restoreItem(id) {
    const existing = requireItem(id);
    const restored: BacklogItem = {
      ...existing,
      status: existing.previousStatus || existing.status,
      isDeleted: undefined,
      deletedAt: undefined,
      previousStatus: undefined,
      updatedAt: now(),
    };
    state.items = state.items.map((it) => (it.id === existing.id ? restored : it));
    persist();
    return true;
  },

  /** Purga física: acá sí desaparece del array. */
  async purgeItem(id) {
    const existing = requireItem(id);
    state.items = state.items.filter((it) => it.id !== existing.id);
    persist();
    return true;
  },

  async bulkUpdateItems(items) {
    let count = 0;
    for (const patch of items) {
      if (!patch?.id) continue;
      const target = findItem(patch.id);
      if (!target) continue;
      const { id: _ignoredId, code: _ignoredCode, ...rest } = patch;
      state.items = state.items.map((it) =>
        it.id === target.id ? { ...it, ...clone(rest), id: it.id, code: it.code, updatedAt: now() } : it,
      );
      count += 1;
    }
    persist();
    return count;
  },

  // --- Proyectos -----------------------------------------------------------
  async createProject(project) {
    const created = {
      storageType: 'json' as const,
      createdAt: now(),
      ...clone(project),
      id: project.id || `sandbox-project-${state.projects.length + 1}`,
    } as Project;
    state.projects = [...state.projects, created];
    persist();
    return clone(created);
  },

  async updateProject(id, updates) {
    const project = state.projects.find((p) => p.id === id);
    if (!project) throw new Error(`Sandbox: proyecto inexistente "${id}"`);
    const updated = { ...project, ...clone(updates), id: project.id };
    state.projects = state.projects.map((p) => (p.id === id ? updated : p));
    persist();
    return clone(updated);
  },

  /** Borra el proyecto y sus ítems, releases y sprints: no dejar huérfanos. */
  async deleteProject(id) {
    state.projects = state.projects.filter((p) => p.id !== id);
    state.items = state.items.filter((it) => it.projectId !== id);
    state.releases = state.releases.filter((r) => r.projectId !== id);
    state.sprints = state.sprints.filter((s) => s.projectId !== id);
    if (state.activeProjectId === id) state.activeProjectId = state.projects[0]?.id;
    persist();
    return true;
  },

  async setActiveProjectApi(projectId) {
    if (!state.projects.some((p) => p.id === projectId)) return false;
    state.activeProjectId = projectId;
    persist();
    return true;
  },

  /** Devuelve la demo al estado semilla en vez de pegarle al daemon. */
  async restoreDemoProject() {
    resetSandbox();
    return { ok: true, projects: clone(state.projects) };
  },

  // --- Releases ------------------------------------------------------------
  async createRelease(release, itemCodes) {
    const created: Release = {
      projectId: state.activeProjectId ?? DEMO_PROJECT_ID,
      version: '0.0.0',
      date: now().slice(0, 10),
      title: '',
      summary: '',
      markdownContent: '',
      createdAt: now(),
      ...clone(release),
      id: release.id || `sandbox-release-${now()}`,
      itemCodes: clone(itemCodes),
    } as Release;
    state.releases = [...state.releases, created];
    persist();
    return clone(created);
  },

  /** La sandbox no tiene markdown legado que sincronizar: el estado ya es el canónico. */
  async syncLegacyReleases() {
    return { ok: true, releases: clone(state.releases), count: state.releases.length };
  },

  async deleteReleaseApi(id) {
    state.releases = state.releases.filter((r) => r.id !== id);
    persist();
    return true;
  },

  // --- Sprints -------------------------------------------------------------
  async fetchSprints(projectId) {
    const target = projectId ?? state.activeProjectId;
    return clone(state.sprints.filter((s) => s.projectId === target || !s.projectId));
  },

  async createSprint(sprint) {
    const created: Sprint = {
      projectId: state.activeProjectId ?? DEMO_PROJECT_ID,
      name: `Sprint ${state.sprints.length + 1}`,
      status: 'planned',
      createdAt: now(),
      ...clone(sprint),
      id: sprint.id || `sandbox-sprint-${now()}`,
    } as Sprint;
    if (created.status === 'active') demoteOtherActiveSprints(created.id);
    state.sprints = [...state.sprints, created];
    persist();
    return clone(created);
  },

  async updateSprint(id, updates) {
    const sprint = state.sprints.find((s) => s.id === id);
    if (!sprint) throw new Error(`Sandbox: sprint inexistente "${id}"`);
    if (updates.status === 'completed') updates.completedAt = now();
    if (updates.status === 'active') demoteOtherActiveSprints(sprint.id);
    const updated = { ...sprint, ...clone(updates), id: sprint.id };
    state.sprints = state.sprints.map((s) => (s.id === id ? updated : s));
    persist();
    return clone(updated);
  },

  async deleteSprint(id, projectId) {
    const target = projectId ?? state.activeProjectId;
    const sprint = state.sprints.find((s) => s.id === id && (s.projectId === target || !s.projectId));
    if (!sprint) return true;
    state.sprints = state.sprints.filter((s) => s.id !== sprint.id);
    // Desasociar en vez de dejar ítems apuntando a un sprint que ya no existe.
    state.items = state.items.map((it) =>
      (it.sprint === sprint.name || it.targetSprint === sprint.name)
        ? { ...it, sprint: '', targetSprint: '', sprints: [], updatedAt: now() }
        : it,
    );
    persist();
    return true;
  },

  // --- Importación y exportación ------------------------------------------
  /**
   * No hay documentos en disco que reimportar: el estado en memoria ya es el
   * canónico. Reporta 0 importados en vez de fingir una importación exitosa.
   */
  async triggerResync(projectId) {
    const project = state.projects.find((p) => p.id === (projectId ?? state.activeProjectId));
    return {
      ok: true,
      projectId: project?.id ?? DEMO_PROJECT_ID,
      projectName: project?.name ?? 'Sandbox',
      importedCount: 0,
      releasesCount: state.releases.length,
      storageType: 'json',
    };
  },

  async importLegacyBacklog(params) {
    const incoming = params.items ?? [];
    const projectId = params.projectId;
    const project = state.projects.find((p) => p.id === projectId);
    const prefix = project?.codePrefix ?? 'TASK';
    let n = 0;
    const added: BacklogItem[] = incoming.map((raw) => {
      const item = clone(raw) as BacklogItem;
      n += 1;
      return {
        ...item,
        title: item.title?.trim() || '(sin título)',
        description: item.description ?? '',
        type: item.type ?? 'feature',
        priority: item.priority ?? 'p2',
        status: item.status ?? 'draft',
        id: item.id || `sandbox-imported-${now()}-${n}`,
        code: item.code || `${prefix}-${String(state.items.length + n).padStart(3, '0')}`,
        projectId,
        order: state.items.length + n,
        createdAt: item.createdAt || now(),
        updatedAt: now(),
      };
    });
    state.items = [...state.items, ...added];
    persist();
    return { ok: true, importedCount: added.length, items: clone(added) };
  },

  /** Sin conversión real: en la sandbox el JSON ya es el formato de almacenamiento. */
  async convertProjectToMd(projectId) {
    const name = state.projects.find((p) => p.id === (projectId ?? state.activeProjectId))?.name ?? 'proyecto';
    return {
      ok: true,
      message: `Sandbox: "${name}" ya vive en JSON en memoria, no hay Backlog.md que escribir`,
      convertedCount: state.items.length,
    };
  },

  async convertProjectToJson(projectId) {
    const name = state.projects.find((p) => p.id === (projectId ?? state.activeProjectId))?.name ?? 'proyecto';
    return {
      ok: true,
      message: `Sandbox: "${name}" ya está en JSON`,
      savedPath: `localStorage[${STORAGE_KEYS.SANDBOX_BOARD}]`,
    };
  },

  async exportProjectJson(projectId) {
    const project = state.projects.find((p) => p.id === (projectId ?? state.activeProjectId));
    if (!project) throw new Error(`Sandbox: proyecto inexistente "${projectId}"`);
    return {
      ok: true,
      project: clone(project),
      data: {
        items: clone(state.items.filter((it) => it.projectId === project.id)),
        releases: clone(state.releases.filter((r) => r.projectId === project.id)),
        sprints: clone(state.sprints.filter((s) => s.projectId === project.id)),
      },
    };
  },

  /** Markdown de un solo archivo para que la demo muestre la exportación real. */
  async exportMonolithicMd(projectId) {
    const project = state.projects.find((p) => p.id === (projectId ?? state.activeProjectId));
    const items = state.items.filter((it) => it.projectId === project?.id);
    const lines = [`# ${project?.name ?? 'Backlog'}`, ''];
    for (const it of items) {
      const sprint = it.sprint || it.targetSprint || 'Sin Sprint';
      lines.push(`## ${it.code} - ${it.title}`, '');
      lines.push(`- **Estado:** ${it.status}`);
      lines.push(`- **Prioridad:** ${it.priority}`);
      lines.push(`- **Tipo:** ${it.type}`);
      lines.push(`- **Sprint:** ${sprint}`, '');
    }
    return { ok: true, content: lines.join('\n') };
  },

  // --- Configuración -------------------------------------------------------
  async fetchSettings() {
    return clone(config);
  },

  async saveSettings(next) {
    config = clone(next);
    setStoredJSON(STORAGE_KEYS.SANDBOX_CONFIG, config);
    return clone(config);
  },

  // Sin daemon no hay dónde buscar retrospectivas: se responde vacío en vez de
  // dejar que la vista dispare un fetch a /api/retros que da 404 en cada carga.
  async fetchRetros() {
    return { retros: [] };
  },

  // --- Sistema de archivos -------------------------------------------------
  // La sandbox no tiene daemon ni disco. Ambos flujos se disparan desde modales
  // que piden un `repoPath`, así que en la demo web son inalcanzables; si alguno
  // llegara a ejecutarse, un error explícito es mejor que un `false` mudo.
  async browseDirectory(): Promise<never> {
    throw new Error('Sandbox: la exploración de carpetas requiere el daemon local (gripm).');
  },

  async detectPathStorage(): Promise<never> {
    throw new Error('Sandbox: la detección de almacenamiento requiere el daemon local (gripm).');
  },

  // --- Eventos -------------------------------------------------------------
  /**
   * No abre `EventSource` a propósito.
   *
   * En la demo web `/api/events` da 404 y el reconectador del adapter HTTP
   * serían 20 reintentos por minuto por sesión, para siempre.
   *
   * Tampoco emite eventos por las mutaciones propias: `App.tsx:365-367` trata
   * `backlog_changed` como "el tablero cambió en disco" y refresca con un toast.
   * Emitirlo tras cada escritura propia mostraría un mensaje falso en cada clic.
   */
  subscribeToBoardEvents() {
    return () => {};
  },
};