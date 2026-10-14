import type { GripmApi, FsBrowseResult, BoardEvent } from './types';

const API_BASE = '/api';

/**
 * DEV-222 — Implementación HTTP de la capa de datos.
 *
 * Es el código que vivía en `src/api.ts`, movido sin cambios de comportamiento:
 * esta es la ruta con daemon local y es la que debe seguir siendo la referencia.
 * El cuerpo se copió literal, incluidos los mensajes de error, para que extraer la
 * interfaz no separe en dos los textos que ve el usuario.
 */
export const httpAdapter: GripmApi = {
  async fetchBoardData() {
    const res = await fetch(`${API_BASE}/data`);
    if (!res.ok) {
      throw new Error(`Error fetching board data: ${res.statusText}`);
    }
    return res.json();
  },

  async createItem(item) {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      throw new Error(`Error creating item: ${res.statusText}`);
    }
    const data = await res.json();
    return data.item;
  },

  async updateItem(id, updates) {
    const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.status === 409) {
      const errorData = await res.json().catch(() => ({}));
      const err: any = new Error(errorData.message || 'Conflict: item modificado en disco externamente');
      err.status = 409;
      err.conflict = true;
      err.currentMtime = errorData.currentMtime;
      err.currentItem = errorData.currentItem;
      throw err;
    }
    if (!res.ok) {
      throw new Error(`Error updating item: ${res.statusText}`);
    }
    const data = await res.json();
    return data.item;
  },

  async deleteItem(id) {
    const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error deleting item: ${res.statusText}`);
    }
    return true;
  },

  // DEV-049: Restore a soft-deleted item to its previous status
  async restoreItem(id) {
    const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}/restore`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      throw new Error(`Error restoring item: ${res.statusText}`);
    }
    return true;
  },

  // DEV-049: Physically purge an item (irreversible, moves to archive/)
  async purgeItem(id) {
    const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}?purge=true`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Error purging item: ${res.statusText}`);
    }
    return true;
  },

  async bulkUpdateItems(items) {
    const res = await fetch(`${API_BASE}/items/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      throw new Error(`Error bulk updating items: ${res.statusText}`);
    }
    const data = await res.json();
    return data.count;
  },

  async createProject(project) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) {
      throw new Error(`Error creating project: ${res.statusText}`);
    }
    const data = await res.json();
    return data.project;
  },

  async updateProject(id, updates) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error(`Error updating project: ${res.statusText}`);
    }
    const data = await res.json();
    return data.project;
  },

  async deleteProject(id) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Error deleting project: ${res.statusText}`);
    }
    return true;
  },

  async createRelease(release, itemCodes) {
    const res = await fetch(`${API_BASE}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...release, itemCodes }),
    });
    if (!res.ok) {
      throw new Error(`Error creating release: ${res.statusText}`);
    }
    const data = await res.json();
    return data.release;
  },

  async syncLegacyReleases(projectId) {
    const res = await fetch(`${API_BASE}/releases/sync-legacy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) {
      throw new Error(`Error sincronizando releases: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteReleaseApi(id) {
    const res = await fetch(`${API_BASE}/releases/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  async triggerResync(projectId) {
    const res = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error syncing docs: ${res.statusText}`);
    }
    return await res.json();
  },

  async convertProjectToMd(projectId) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/convert-to-md`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error convirtiendo a Backlog.md: ${res.statusText}`);
    }
    return res.json();
  },

  async convertProjectToJson(projectId) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/convert-to-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error convirtiendo a JSON: ${res.statusText}`);
    }
    return res.json();
  },

  async exportProjectJson(projectId) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/export-json`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error exportando JSON: ${res.statusText}`);
    }
    return res.json();
  },

  async exportMonolithicMd(projectId, save = false) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/export-monolithic-md${save ? '?save=true' : ''}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error exportando BACKLOG.md: ${res.statusText}`);
    }
    return res.json();
  },

  async restoreDemoProject() {
    const res = await fetch(`${API_BASE}/projects/restore-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error restaurando demo: ${res.statusText}`);
    }
    return res.json();
  },

  async browseDirectory(dir): Promise<FsBrowseResult> {
    const query = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    const res = await fetch(`${API_BASE}/fs/browse${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error explorando directorios: ${res.statusText}`);
    }
    return res.json();
  },

  async detectPathStorage(repoPath) {
    const res = await fetch(`${API_BASE}/projects/detect-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error detectando ruta: ${res.statusText}`);
    }
    return res.json();
  },

  subscribeToBoardEvents(onEvent) {
    let es: EventSource | null = null;
    let reconnectTimer: any = null;
    let isClosed = false;

    function connect() {
      if (isClosed) return;
      try {
        es = new EventSource(`${API_BASE}/events`);

        es.onopen = () => {
          onEvent({ type: 'connected', data: null });
        };

        es.addEventListener('backlog_changed', (evt: any) => {
          try {
            const data = JSON.parse(evt.data);
            onEvent({ type: 'backlog_changed', data });
          } catch {
            onEvent({ type: 'backlog_changed', data: null });
          }
        });

        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          onEvent({ type: 'disconnected', data: null });
          if (!isClosed) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };
      } catch {
        onEvent({ type: 'disconnected', data: null });
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      isClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) {
        es.close();
        es = null;
      }
    };
  },

  async importLegacyBacklog(params) {
    const res = await fetch(`${API_BASE}/import/legacy-md`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error importing legacy backlog: ${res.statusText}`);
    }
    return res.json();
  },

  async fetchSettings(projectId) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`${API_BASE}/settings${query}`);
    if (!res.ok) {
      throw new Error(`Error fetching settings: ${res.statusText}`);
    }
    const data = await res.json();
    return data.config;
  },

  async saveSettings(config, projectId) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, projectId }),
    });
    if (!res.ok) {
      throw new Error(`Error saving settings: ${res.statusText}`);
    }
    const data = await res.json();
    return data.config;
  },

  async fetchRetros(projectId) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`${API_BASE}/retros${query}`);
    if (!res.ok) {
      throw new Error(`Error fetching retros: ${res.statusText}`);
    }
    return res.json();
  },

  async setActiveProjectApi(projectId) {
    try {
      const res = await fetch(`${API_BASE}/projects/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchSprints(projectId) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`${API_BASE}/sprints${query}`);
    if (!res.ok) {
      throw new Error(`Error fetching sprints: ${res.statusText}`);
    }
    const data = await res.json();
    return data.sprints || [];
  },

  async createSprint(sprint) {
    const res = await fetch(`${API_BASE}/sprints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sprint),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error creating sprint: ${res.statusText}`);
    }
    const data = await res.json();
    return data.sprint;
  },

  async updateSprint(id, updates) {
    const res = await fetch(`${API_BASE}/sprints/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error updating sprint: ${res.statusText}`);
    }
    const data = await res.json();
    return data.sprint;
  },

  async deleteSprint(id, projectId) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`${API_BASE}/sprints/${encodeURIComponent(id)}${query}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error deleting sprint: ${res.statusText}`);
    }
    return true;
  },
};

export type { BoardEvent };