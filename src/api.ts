import { getActiveApi } from './data/runtime';
import { ensureAdapter } from './data/detect';
import type { BoardEvent, BoardEventType, FsBrowseResult, GripmApi as GripmApiShape } from './data/types';

/**
 * DEV-222 - Fachada pública de la capa de datos.
 *
 * Antes de DEV-222 este archivo contenía la implementación HTTP completa. Ahora es
 * una re-exportación con nombre desde el adaptador activo, de modo que la UI siga
 * importando igual (`import { fetchBoardData } from './api'`) sin enterarse de si
 * detrás hay un daemon local o el dataset en memoria de la sandbox.
 *
 * Cada punto de entrada espera `ensureAdapter()`. El probe corre una sola vez y se
 * cachea, así que el costo después del primero es nulo, pero **sí** tiene que pasar
 * antes del primer render: sin esto la app puede pintar el tablero con
 * `boardData === null` mientras el probe decide, que es exactamente la pantalla
 * vacía que este ítem viene a eliminar.
 *
 * Las firmas se toman del contrato vía `Parameters<>`: si el contrato deriva, esto
 * es un error de compilación y no una discrepancia silenciosa.
 */
export type { BoardEvent, BoardEventType, FsBrowseResult };

/** Espera la resolución del adaptador y delega. */
async function withAdapter<T>(fn: (api: GripmApiShape) => Promise<T>): Promise<T> {
  await ensureAdapter();
  return fn(getActiveApi());
}

// --- Tablero ---------------------------------------------------------------
export const fetchBoardData = () => withAdapter((api) => api.fetchBoardData());

// --- Ítems -----------------------------------------------------------------
export const createItem = (item: Parameters<GripmApiShape['createItem']>[0]) =>
  withAdapter((api) => api.createItem(item));
export const updateItem = (id: string, updates: Parameters<GripmApiShape['updateItem']>[1]) =>
  withAdapter((api) => api.updateItem(id, updates));
export const deleteItem = (id: string) => withAdapter((api) => api.deleteItem(id));
export const restoreItem = (id: string) => withAdapter((api) => api.restoreItem(id));
export const purgeItem = (id: string) => withAdapter((api) => api.purgeItem(id));
export const bulkUpdateItems = (items: Parameters<GripmApiShape['bulkUpdateItems']>[0]) =>
  withAdapter((api) => api.bulkUpdateItems(items));

// --- Proyectos -------------------------------------------------------------
export const createProject = (project: Parameters<GripmApiShape['createProject']>[0]) =>
  withAdapter((api) => api.createProject(project));
export const updateProject = (id: string, updates: Parameters<GripmApiShape['updateProject']>[1]) =>
  withAdapter((api) => api.updateProject(id, updates));
export const deleteProject = (id: string) => withAdapter((api) => api.deleteProject(id));
export const setActiveProjectApi = (projectId: string) =>
  withAdapter((api) => api.setActiveProjectApi(projectId));
export const restoreDemoProject = () => withAdapter((api) => api.restoreDemoProject());

// --- Releases --------------------------------------------------------------
export const createRelease = (release: Parameters<GripmApiShape['createRelease']>[0], itemCodes: string[]) =>
  withAdapter((api) => api.createRelease(release, itemCodes));
export const syncLegacyReleases = (projectId?: string) =>
  withAdapter((api) => api.syncLegacyReleases(projectId));
export const deleteReleaseApi = (id: string) => withAdapter((api) => api.deleteReleaseApi(id));

// --- Sprints ---------------------------------------------------------------
export const fetchSprints = (projectId?: string) => withAdapter((api) => api.fetchSprints(projectId));
export const createSprint = (sprint: Parameters<GripmApiShape['createSprint']>[0]) =>
  withAdapter((api) => api.createSprint(sprint));
export const updateSprint = (id: string, updates: Parameters<GripmApiShape['updateSprint']>[1]) =>
  withAdapter((api) => api.updateSprint(id, updates));
export const deleteSprint = (id: string, projectId?: string) =>
  withAdapter((api) => api.deleteSprint(id, projectId));

// --- Importación y exportación --------------------------------------------
export const triggerResync = (projectId?: string) => withAdapter((api) => api.triggerResync(projectId));
export const importLegacyBacklog = (params: Parameters<GripmApiShape['importLegacyBacklog']>[0]) =>
  withAdapter((api) => api.importLegacyBacklog(params));
export const convertProjectToMd = (projectId: string) =>
  withAdapter((api) => api.convertProjectToMd(projectId));
export const convertProjectToJson = (projectId: string) =>
  withAdapter((api) => api.convertProjectToJson(projectId));
export const exportProjectJson = (projectId: string) =>
  withAdapter((api) => api.exportProjectJson(projectId));
export const exportMonolithicMd = (projectId: string, save = false) =>
  withAdapter((api) => api.exportMonolithicMd(projectId, save));

// --- Configuración ---------------------------------------------------------
export const fetchSettings = (projectId?: string) => withAdapter((api) => api.fetchSettings(projectId));
export const saveSettings = (config: Parameters<GripmApiShape['saveSettings']>[0], projectId?: string) =>
  withAdapter((api) => api.saveSettings(config, projectId));

// --- Retrospectivas -------------------------------------------------------
export const fetchRetros = (projectId?: string) => withAdapter((api) => api.fetchRetros(projectId));

// --- Sistema de archivos ---------------------------------------------------
export const browseDirectory = (dir?: string): Promise<FsBrowseResult> =>
  withAdapter((api) => api.browseDirectory(dir));
export const detectPathStorage = (repoPath: string) =>
  withAdapter((api) => api.detectPathStorage(repoPath));

// --- Eventos ---------------------------------------------------------------
/**
 * Suscripción perezosa: si el probe todavía no resolvió, no se abre `EventSource`
 * todavía. Si la app cae en modo sandbox, el adaptador elegido devuelve un no-op y
 * no se abre ninguna conexión contra un 404.
 */
export const subscribeToBoardEvents = (onEvent: (event: BoardEvent) => void): (() => void) => {
  let inner: (() => void) | null = null;
  let cancelled = false;

  void ensureAdapter().then(() => {
    if (cancelled) return;
    inner = getActiveApi().subscribeToBoardEvents(onEvent);
  });

  return () => {
    cancelled = true;
    inner?.();
  };
};