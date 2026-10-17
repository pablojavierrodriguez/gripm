import type { BacklogItem, FilterState, ItemStatus } from '../types';

/**
 * Normaliza cualquier alias histórico o variante al estado canónico (DEV-049 / STATE_MACHINE).
 */
export function normalizeCanonicalStatus(status: ItemStatus | string): ItemStatus {
  switch (status) {
    case 'ideas':
      return 'ideas';
    case 'draft':
    case 'backlog':
      return 'draft';
    case 'doing':
    case 'in_progress':
      return 'doing';
    case 'blocked':
      return 'blocked';
    case 'review':
    case 'testing_qa':
      return 'review';
    case 'ready':
    case 'finish':
      return 'ready';
    case 'done':
      return 'done';
    case 'dismissed':
    case 'cancelled':
      return 'dismissed';
    default:
      return status as ItemStatus;
  }
}

/**
 * Recopila la lista única y ordenada de módulos disponibles, considerando tanto
 * la configuración explícita (config.modulesList) como las tareas existentes (item.module e item.modules) (DEV-303, AC #2).
 */
export function getAvailableModules(items: BacklogItem[] = [], modulesList?: string[]): string[] {
  const set = new Set<string>();

  if (modulesList && Array.isArray(modulesList)) {
    for (const m of modulesList) {
      if (m && typeof m === 'string' && m.trim()) {
        set.add(m.trim());
      }
    }
  }

  if (items && Array.isArray(items)) {
    for (const it of items) {
      if (it.module && typeof it.module === 'string' && it.module.trim()) {
        set.add(it.module.trim());
      }
      if (it.modules && Array.isArray(it.modules)) {
        for (const m of it.modules) {
          if (m && typeof m === 'string' && m.trim()) {
            set.add(m.trim());
          }
        }
      }
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Verifica si un ítem coincide con un filtro de módulo individual o multi-módulo (DEV-287 / DEV-303).
 */
export function itemMatchesModule(
  it: { module?: string; modules?: string[] },
  filterModule?: string
): boolean {
  if (!filterModule || filterModule === 'all') return true;
  const target = filterModule.trim();
  if (it.module && it.module.trim() === target) return true;
  if (it.modules && Array.isArray(it.modules)) {
    return it.modules.some((m) => m && m.trim() === target);
  }
  return false;
}

/**
 * Predicado puro que determina si un BacklogItem coincide con el FilterState activo (DEV-303, AC #1 y #2).
 * Soporta de forma unificada:
 * - Inclusiones de ciclo de vida (ideas, archivados, flujo activo).
 * - Búsqueda de texto en título, código, descripción y módulos (tanto singular como array).
 * - Multi-selección de tipos y prioridades.
 * - Multi-selección de sprints (filters.sprints) y sprint singular (filters.sprint), reconociendo
 *   item.sprint, item.targetSprint y el array item.sprints, así como 'backlog' / 'no_sprint'.
 * - Multi-selección de releases (filters.releases) y release singular (filters.release), reconociendo
 *   item.release, item.targetRelease, item.milestone y el array item.releases.
 * - Multi-selección de módulos (filters.modules) y módulo singular (filters.module), reconociendo
 *   tanto item.module como item.modules.
 * - Multi-selección de estimaciones (filters.estimates).
 */
export function itemMatchesFilters(item: BacklogItem, filters: FilterState): boolean {
  // 1. Soft-delete check (los eliminados sólo van a la Papelera)
  if (item.isDeleted) return false;

  const isDismissedOrCancelled = item.status === 'dismissed' || item.status === 'cancelled';
  const canonicalStatus = normalizeCanonicalStatus(item.status);

  // 2. Estado del ciclo de vida
  if (canonicalStatus === 'ideas') {
    if (!filters.includeIdeas && !filters.statuses?.includes('ideas')) {
      return false;
    }
  } else if (filters.statuses && filters.statuses.length > 0) {
    if (!filters.statuses.includes(canonicalStatus) && !filters.statuses.includes(item.status)) {
      return false;
    }
  } else {
    // Si la lista de estados está vacía, excluir descartados por defecto
    if (isDismissedOrCancelled && !filters.includeDismissedCancelled) {
      return false;
    }
  }

  // 3. Búsqueda por texto (insensible a mayúsculas/minúsculas)
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const matchTitle = Boolean(item.title && item.title.toLowerCase().includes(q));
    const matchCode = Boolean(item.code && item.code.toLowerCase().includes(q));
    const matchModule = Boolean(item.module && item.module.toLowerCase().includes(q));
    const matchModules = Boolean(
      item.modules && Array.isArray(item.modules) && item.modules.some((m) => m && m.toLowerCase().includes(q))
    );
    const matchDesc = Boolean(item.description && item.description.toLowerCase().includes(q));

    if (!matchTitle && !matchCode && !matchModule && !matchModules && !matchDesc) {
      return false;
    }
  }

  // 4. Tipos (multiselect y singular)
  if (filters.types && filters.types.length > 0) {
    if (!filters.types.includes(item.type)) return false;
  } else if (filters.type && filters.type !== 'all' && item.type !== filters.type) {
    return false;
  }

  // 5. Prioridades (multiselect y singular)
  if (filters.priorities && filters.priorities.length > 0) {
    if (!filters.priorities.includes(item.priority)) return false;
  } else if (filters.priority && filters.priority !== 'all' && item.priority !== filters.priority) {
    return false;
  }

  // 6. Sprints (multiselect y singular)
  const itemSprints: string[] = [];
  if (item.sprint && item.sprint.trim()) itemSprints.push(item.sprint.trim());
  if (item.targetSprint && item.targetSprint.trim() && !itemSprints.includes(item.targetSprint.trim())) {
    itemSprints.push(item.targetSprint.trim());
  }
  if (item.sprints && Array.isArray(item.sprints)) {
    for (const sp of item.sprints) {
      if (sp && sp.trim() && !itemSprints.includes(sp.trim())) {
        itemSprints.push(sp.trim());
      }
    }
  }
  const hasNoSprint = itemSprints.length === 0;

  if (filters.sprints && filters.sprints.length > 0) {
    const activeSprintFilters = filters.sprints.filter((sp) => sp && sp !== 'all');
    if (activeSprintFilters.length > 0) {
      const matchesAnySprint = activeSprintFilters.some((sp) => {
        if (sp === 'backlog' || sp === 'no_sprint') return hasNoSprint;
        return itemSprints.includes(sp.trim());
      });
      if (!matchesAnySprint) return false;
    }
  } else if (filters.sprint && filters.sprint !== 'all') {
    if (filters.sprint === 'no_sprint' || filters.sprint === 'backlog') {
      if (!hasNoSprint) return false;
    } else {
      if (!itemSprints.includes(filters.sprint.trim())) return false;
    }
  }

  // 7. Releases (multiselect y singular)
  const itemReleases: string[] = [];
  const addRel = (r?: string) => {
    if (!r) return;
    const trimmed = r.trim();
    if (!trimmed) return;
    if (!itemReleases.includes(trimmed)) itemReleases.push(trimmed);
    const normalized = trimmed.startsWith('v') ? trimmed.slice(1) : `v${trimmed}`;
    if (!itemReleases.includes(normalized)) itemReleases.push(normalized);
  };

  addRel(item.release);
  addRel(item.targetRelease);
  addRel(item.milestone);
  if (item.releases && Array.isArray(item.releases)) {
    for (const r of item.releases) addRel(r);
  }

  if (filters.releases && filters.releases.length > 0) {
    const activeReleaseFilters = filters.releases.filter((r) => r && r !== 'all');
    if (activeReleaseFilters.length > 0) {
      const matchesAnyRelease = activeReleaseFilters.some((r) => {
        const trimmed = r.trim();
        const normalized = trimmed.startsWith('v') ? trimmed.slice(1) : `v${trimmed}`;
        return itemReleases.includes(trimmed) || itemReleases.includes(normalized);
      });
      if (!matchesAnyRelease) return false;
    }
  } else if (filters.release && filters.release !== 'all') {
    const trimmed = filters.release.trim();
    const normalized = trimmed.startsWith('v') ? trimmed.slice(1) : `v${trimmed}`;
    if (!itemReleases.includes(trimmed) && !itemReleases.includes(normalized)) {
      return false;
    }
  }

  // 8. Módulos (multiselect y singular, considerando item.module e item.modules)
  const itemModules: string[] = [];
  if (item.module && item.module.trim()) itemModules.push(item.module.trim());
  if (item.modules && Array.isArray(item.modules)) {
    for (const m of item.modules) {
      if (m && typeof m === 'string' && m.trim() && !itemModules.includes(m.trim())) {
        itemModules.push(m.trim());
      }
    }
  }

  if (filters.modules && filters.modules.length > 0) {
    const activeModuleFilters = filters.modules.filter((m) => m && m !== 'all');
    if (activeModuleFilters.length > 0) {
      const matchesAnyModule = activeModuleFilters.some((m) => itemModules.includes(m.trim()));
      if (!matchesAnyModule) return false;
    }
  } else if (filters.module && filters.module !== 'all') {
    if (!itemModules.includes(filters.module.trim())) return false;
  }

  // 9. Estimaciones (multiselect)
  if (filters.estimates && filters.estimates.length > 0) {
    if (item.estimate === undefined || !filters.estimates.some((e) => String(e) === String(item.estimate))) {
      return false;
    }
  }

  return true;
}

/**
 * Filtra un conjunto de BacklogItems usando el predicado puro itemMatchesFilters.
 */
export function filterItems(items: BacklogItem[], filters: FilterState): BacklogItem[] {
  return items.filter((item) => itemMatchesFilters(item, filters));
}
