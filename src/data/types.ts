import type { BacklogItem, BoardData, Project, Release, StorageType, GripmConfig, Sprint } from '../types';

/**
 * DEV-222 — Contrato de la capa de datos.
 *
 * Esta interfaz es la frontera entre el tablero y el almacenamiento. Hay dos
 * implementaciones: `httpAdapter` (daemon local) y `sandboxAdapter` (memoria +
 * LocalStorage, para la demo web sin servidor). La UI no sabe cuál está activa.
 *
 * Regla de agregación: todo método nuevo que se le agregue a `httpAdapter` tiene que
 * entrar acá, o TypeScript no va a detectar que falta una implementación en sandbox.
 */
export interface FsBrowseResult {
  ok: boolean;
  currentPath: string;
  parentPath: string | null;
  folders: Array<{ name: string; path: string; isGit: boolean; hasBacklog: boolean }>;
  isGit: boolean;
  hasBacklog: boolean;
  hasGripm: boolean;
  warning?: string;
}

export type BoardEventType = 'connected' | 'disconnected' | 'backlog_changed';

export interface BoardEvent {
  type: BoardEventType;
  data: any;
}

export interface GripmApi {
  // --- Tablero -------------------------------------------------------------
  fetchBoardData(): Promise<BoardData>;

  // --- Ítems ---------------------------------------------------------------
  createItem(item: Partial<BacklogItem>): Promise<BacklogItem>;
  updateItem(
    id: string,
    updates: Partial<BacklogItem> & { expectedMtime?: number; force?: boolean },
  ): Promise<BacklogItem>;
  deleteItem(id: string): Promise<boolean>;
  restoreItem(id: string): Promise<boolean>;
  purgeItem(id: string): Promise<boolean>;
  bulkUpdateItems(items: Array<Partial<BacklogItem>>): Promise<number>;

  // --- Proyectos -----------------------------------------------------------
  createProject(project: Partial<Project>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<boolean>;
  setActiveProjectApi(projectId: string): Promise<boolean>;
  restoreDemoProject(): Promise<{ ok: boolean; projects: Project[] }>;

  // --- Releases ------------------------------------------------------------
  createRelease(release: Partial<Release>, itemCodes: string[]): Promise<Release>;
  syncLegacyReleases(projectId?: string): Promise<{ ok: boolean; releases: Release[]; count: number }>;
  deleteReleaseApi(id: string): Promise<boolean>;

  // --- Sprints -------------------------------------------------------------
  fetchSprints(projectId?: string): Promise<Sprint[]>;
  createSprint(sprint: Partial<Sprint>): Promise<Sprint>;
  updateSprint(id: string, updates: Partial<Sprint>): Promise<Sprint>;
  deleteSprint(id: string, projectId?: string): Promise<boolean>;

  // --- Importación y exportación ------------------------------------------
  triggerResync(projectId?: string): Promise<{
    ok: boolean;
    projectId: string;
    projectName: string;
    importedCount: number;
    releasesCount: number;
    storageType?: string;
  }>;
  importLegacyBacklog(params: {
    projectId: string;
    content?: string;
    items?: any[];
    defaultMilestone?: string;
  }): Promise<{ ok: boolean; importedCount: number; items: BacklogItem[] }>;
  convertProjectToMd(projectId: string): Promise<{ ok: boolean; message: string; convertedCount: number }>;
  convertProjectToJson(projectId: string): Promise<{ ok: boolean; message: string; savedPath: string }>;
  exportProjectJson(projectId: string): Promise<{ ok: boolean; project: Project; data: any }>;
  exportMonolithicMd(
    projectId: string,
    save?: boolean,
  ): Promise<{ ok: boolean; content: string; savedPath?: string }>;

  // --- Configuración -------------------------------------------------------
  fetchSettings(projectId?: string): Promise<GripmConfig>;
  saveSettings(config: GripmConfig, projectId?: string): Promise<GripmConfig>;

  // --- Retrospectivas ------------------------------------------------------
  /**
   * Retrospectivas vinculadas a sprints (DEV-080).
   *
   * Entra al contrato porque `SprintView.tsx` la pedía con un `fetch()`
   * hardcodeado que esquivaba el adaptador: en sandbox web eso era un request a
   * `/api/retros` que da 404 en cada carga de la vista Sprint, silenciado por
   * un `.catch(() => {})`.
   */
  fetchRetros(projectId?: string): Promise<{ retros?: any[] }>;

  // --- Sistema de archivos (solo tiene sentido con daemon) -----------------
  browseDirectory(dir?: string): Promise<FsBrowseResult>;
  detectPathStorage(repoPath: string): Promise<{
    ok: boolean;
    exists: boolean;
    isGit: boolean;
    normalizedPath: string;
    storageType: StorageType;
    backlogDir: string;
  }>;

  /**
   * Suscripción a eventos de cambio del tablero.
   *
   * La implementación HTTP abre un `EventSource` con reconexión. En modo sandbox
   * **debe** ser un no-op que devuelva la función de limpieza sin abrir nada: un
   * EventSource reconectando contra un 404 son 20 reintentos por minuto por sesión.
   */
  subscribeToBoardEvents(onEvent: (event: BoardEvent) => void): () => void;
}