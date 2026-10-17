import { useState, useEffect, useMemo, useRef, useLayoutEffect, type FC } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Check,
  Layers,
  Edit3,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  GripVertical,
  Plus,
  Target,
  Calendar,
  Play,
  CheckCircle2,
  Eye,
  EyeOff,
  Columns3,
  CheckSquare,
  User,
  Bookmark,
  RotateCcw,
  ScrollText,
  X,
  Zap,
  AlertTriangle,
  Rocket
} from 'lucide-react';
import type { BacklogItem, ItemStatus, Priority, Sprint, GripmConfig } from '../types';
import { typeConfig, priorityConfig, cleanParentTitle } from './ItemCard';
import { ConfirmModal } from './ConfirmModal';
import { SprintModal } from './SprintModal';
import { CompleteSprintModal } from './CompleteSprintModal';
import { useTranslation } from '../utils/i18n';
import { useStatusMeta } from '../utils/useStatusMeta';
import { getStoredItem, setStoredItem, STORAGE_KEYS } from '../utils/storage';
import { fetchRetros, updateItem, deleteItem, bulkUpdateItems } from '../api';
import {
  ALL_OPTIONAL_COLS,
  DEFAULT_COLS,
  normalizeVisibleCols,
  type OptionalCol,
} from '../utils/sprintVisibleCols';

const normalizePriorityNum = (p?: string): number => {
  if (!p) return 2;
  const lower = String(p).toLowerCase().trim();
  if (lower === 'p0' || lower === 'urgent') return 0;
  if (lower === 'p1' || lower === 'high') return 1;
  if (lower === 'p2' || lower === 'medium') return 2;
  if (lower === 'p3' || lower === 'low') return 3;
  return 2;
};

const normalizeStatusNum = (s?: string): number => {
  if (!s) return 99;
  const sOrder: Record<string, number> = {
    ideas: 0,
    backlog: 1,
    draft: 2,
    doing: 3,
    in_progress: 3,
    review: 4,
    testing_qa: 5,
    ready: 6,
    finish: 7,
    done: 8,
    dismissed: 9,
    cancelled: 10
  };
  return sOrder[s.toLowerCase().trim()] ?? 99;
};

interface SprintViewProps {
  items: BacklogItem[];
  allItems?: BacklogItem[];
  sprints?: Sprint[];
  onClickItem: (item: BacklogItem) => void;
  onUpdateStatus: (id: string, newStatus: ItemStatus) => void;
  onUpdatePriority: (id: string, newPriority: Priority) => void;
  onUpdateSprint?: (id: string, newSprint: string) => void;
  onReorderItem?: (draggedId: string, targetSprint: string, targetIndex: number) => void;
  onCreateSprint?: (sprintData: Partial<Sprint>) => Promise<void>;
  onUpdateSprintMeta?: (id: string, sprintData: Partial<Sprint>) => Promise<void>;
  onDeleteSprint?: (id: string) => Promise<void>;
  onStartSprint?: (sprint: Sprint) => Promise<void>;
  onCompleteSprint?: (sprint: Sprint, destinationSprintName: string, retroData?: any) => Promise<void>;
  onCreateTaskFromAction?: (title: string) => Promise<void>;
  onDeleteItem: (id: string) => void;
  availableSprints?: string[];
  availableReleases?: string[];
  rankingEnabled?: boolean;
  projectId?: string;
  config?: GripmConfig;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type GroupBy = 'sprint' | 'priority' | 'module' | 'none' | 'epic';


export const SprintView: FC<SprintViewProps> = ({
  items,
  allItems,
  sprints = [],
  onClickItem,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateSprint,
  onReorderItem,
  onCreateSprint,
  onUpdateSprintMeta,
  onDeleteSprint,
  onStartSprint,
  onCompleteSprint,
  onCreateTaskFromAction,
  onDeleteItem,
  availableSprints = [],
  availableReleases = [],
  rankingEnabled = true,
  projectId,
  config,
  onShowToast
}) => {
  const { t, isEs } = useTranslation();
  const hierarchyItems = allItems || items;
  const getStatusMeta = useStatusMeta();
  const isEstimationEnabled = config?.estimation?.enabled !== false;
  const [groupBy, setGroupBy] = useState<GroupBy>('sprint');
  const [sortBy, setSortBy] = useState<'order' | 'priority' | 'code' | 'status'>('order');
  const [sortAsc, setSortAsc] = useState(true);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<BacklogItem | null>(null);

  // DEV-277: Selección múltiple en Backlog y barra de acciones masivas
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setLocalToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setLocalToast(null);
    }, 3500);
  };

  // Retrospectivas vinculadas a sprints (DEV-080)
  const [retros, setRetros] = useState<any[]>([]);
  const [selectedRetro, setSelectedRetro] = useState<{ title: string; date: string; content: string; sprintName: string } | null>(null);

  useEffect(() => {
    // DEV-222: pasa por el adaptador. Antes era un fetch hardcodeado a /api/retros,
    // que en la sandbox web devolvía 404 en cada carga y quedaba silenciado por el
    // catch. El adaptador sandbox responde lista vacía.
    fetchRetros(projectId)
      .then((d) => {
        if (d?.retros) setRetros(d.retros);
      })
      .catch(() => {});
  }, [projectId]);

  // Lista unificada de sprints disponibles (provistos o derivados de sprints oficiales)
  const allAvailableSprints = useMemo(() => {
    const set = new Set<string>();
    if (availableSprints && availableSprints.length > 0) {
      availableSprints.forEach((s) => set.add(s));
    }
    sprints.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availableSprints, sprints]);

  const activeSprints = useMemo(() => {
    const nonCompleted = sprints.filter((s) => s.status !== 'completed' && Boolean(s.name)).map((s) => s.name);
    if (nonCompleted.length > 0) {
      return Array.from(new Set(nonCompleted)).sort();
    }
    return allAvailableSprints;
  }, [sprints, allAvailableSprints]);

  // DEV-277: Lista unificada de releases disponibles para asignación masiva
  const allAvailableReleases = useMemo(() => {
    const set = new Set<string>();
    if (availableReleases && availableReleases.length > 0) {
      availableReleases.forEach((r) => r && set.add(r));
    }
    const pool = allItems || items;
    pool.forEach((it) => {
      const r = it.release || it.targetRelease;
      if (r && !r.toLowerCase().includes('sprint')) set.add(r);
      if (Array.isArray(it.releases)) {
        it.releases.forEach((rel) => {
          if (rel && !rel.toLowerCase().includes('sprint')) set.add(rel);
        });
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availableReleases, allItems, items]);

  const [rowMenuState, setRowMenuState] = useState<{
    itemId: string;
    top: number;
    left: number;
    group: { key: string; items: BacklogItem[] };
    rowIdx: number;
    sprintSubmenuOpen?: boolean;
  } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rowMenuState) return;
    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      if (rowMenuRef.current && rowMenuRef.current.contains(e.target as Node)) {
        return; // Click/touch inside portal: allow button onClick to execute
      }
      setRowMenuState(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRowMenuState(null);
    };
    const handleScroll = (e: Event) => {
      if (rowMenuRef.current && (rowMenuRef.current === e.target || rowMenuRef.current.contains(e.target as Node))) {
        return; // Don't close when scrolling inside menu
      }
      setRowMenuState(null);
    };
    const handleResize = () => {
      setRowMenuState(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [rowMenuState]);

  const handleTransferSprint = (itemId: string, newSprint: string) => {
    const existing = items.find((it) => it.id === itemId);
    const curSprint = existing ? (existing.sprint || existing.targetSprint || '') : '';
    if (curSprint === newSprint) return;
    if (onUpdateSprint) {
      onUpdateSprint(itemId, newSprint);
    } else {
      updateItem(itemId, {
        sprint: newSprint,
        targetSprint: newSprint,
        sprints: newSprint ? [newSprint] : []
      });
    }
  };

  const handleMoveItemToTop = (item: BacklogItem, group: { key: string; items: BacklogItem[] }) => {
    const targetSprintVal = group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar' ? '' : group.key;
    if (onReorderItem) {
      onReorderItem(item.id, targetSprintVal, 0);
      setSortBy('order');
    } else {
      const firstOrder = group.items[0]?.order ?? 10;
      updateItem(item.id, { order: firstOrder - 10 });
    }
  };

  const handleMoveItemToBottom = (item: BacklogItem, group: { key: string; items: BacklogItem[] }) => {
    const targetSprintVal = group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar' ? '' : group.key;
    if (onReorderItem) {
      onReorderItem(item.id, targetSprintVal, group.items.length);
      setSortBy('order');
    } else {
      const lastOrder = group.items[group.items.length - 1]?.order ?? (group.items.length * 10);
      updateItem(item.id, { order: lastOrder + 10 });
    }
  };
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetRow, setDropTargetRow] = useState<{ itemId: string; position: 'before' | 'after' } | null>(null);
  const [activeDropGroup, setActiveDropGroup] = useState<string | null>(null);

  // Sprints Modals & Lifecycle State (DEV-055)
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);

  // DEV-051, DEV-078 & DEV-079: Column visibility popover
  // DEV-256: catálogo y normalización del estado persistido viven en utils/ para ser testeables.
  const [visibleCols, setVisibleCols] = useState<Set<OptionalCol>>(() => {
    try {
      const saved = getStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS);
      if (saved) {
        return normalizeVisibleCols(JSON.parse(saved) as string[]);
      }
    } catch {}
    return new Set<OptionalCol>(DEFAULT_COLS);
  });
  const [colsPopoverOpen, setColsPopoverOpen] = useState(false);
  const colsPopoverRef = useRef<HTMLDivElement>(null);

  const toggleCol = (col: OptionalCol) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      setStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colsPopoverRef.current && !colsPopoverRef.current.contains(e.target as Node)) {
        setColsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [showCompletedSprints, setShowCompletedSprints] = useState<boolean>(() => {
    try {
      const saved = getStoredItem(STORAGE_KEYS.SPRINTVIEW_SHOW_COMPLETED);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.SPRINTVIEW_SHOW_COMPLETED, JSON.stringify(showCompletedSprints));
  }, [showCompletedSprints]);

  // Suggested Sprint Name (Sprint N+1)
  const suggestedSprintName = useMemo(() => {
    const allNames = Array.from(new Set([
      ...allAvailableSprints,
      ...items.map((i) => i.sprint || i.targetSprint || '')
    ]));
    let maxNum = 0;
    for (const name of allNames) {
      const match = name.match(/sprint\s*(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return `Sprint ${maxNum + 1}`;
  }, [allAvailableSprints, items]);

  const completedSprintsCount = useMemo(() => {
    if (groupBy !== 'sprint') return 0;
    const completedSet = new Set<string>();
    sprints.filter((s) => s.status === 'completed').forEach((s) => completedSet.add(s.name.toLowerCase().trim()));

    // Incluir también cualquier grupo de sprint con 100% de tareas terminadas
    const sprintGroups = new Map<string, BacklogItem[]>();
    for (const it of items) {
      const sp = it.sprint || it.targetSprint;
      if (sp && typeof sp === 'string' && sp.trim() && sp.toLowerCase() !== 'backlog' && !sp.toLowerCase().includes('sin sprint') && sp !== '-') {
        const k = sp.trim().toLowerCase();
        if (!sprintGroups.has(k)) sprintGroups.set(k, []);
        sprintGroups.get(k)!.push(it);
      }
    }
    for (const [k, list] of sprintGroups.entries()) {
      if (list.length > 0 && list.every((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish')) {
        completedSet.add(k);
      }
    }
    return completedSet.size;
  }, [groupBy, sprints, items]);

  // Grouping logic with natural sorting and deterministic tie-breakers (DEV-063)
  const groupedData = useMemo(() => {
    // Sort items inside groups with deterministic tie-breaker
    const sorted = [...items].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'order') {
        diff = (a.order ?? 9999) - (b.order ?? 9999);
      } else if (sortBy === 'priority') {
        diff = normalizePriorityNum(a.priority) - normalizePriorityNum(b.priority);
      } else if (sortBy === 'status') {
        diff = normalizeStatusNum(a.status) - normalizeStatusNum(b.status);
      } else if (sortBy === 'code') {
        diff = a.code.localeCompare(b.code, undefined, { numeric: true });
      }

      // Tie-breaker secundario determinista estricto
      if (diff === 0) {
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      }

      return sortAsc ? diff : -diff;
    });

    if (groupBy === 'none') {
      return [{ key: 'Todos los ítems', items: sorted }];
    }

    const groups = new Map<string, BacklogItem[]>();

    for (const it of sorted) {
      let key = 'Sin Asignar';
      if (groupBy === 'sprint') {
        key = it.sprint || it.targetSprint || 'Backlog';
      } else if (groupBy === 'priority') {
        key = it.priority.toUpperCase();
      } else if (groupBy === 'module') {
        key = it.module || 'General / Core';
      } else if (groupBy === 'epic') {
        const parent = it.parentId
          ? hierarchyItems.find(candidate => candidate.id === it.parentId || candidate.code === it.parentId)
          : undefined;
        key = parent
          ? `${parent.code || parent.id} · ${parent.title}`
          : it.epic || it.module || 'Sin Épica';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(it);
    }

    // DEV-036 & DEV-055: Include known empty sprints (only from official sprints list, NOT from task fields)
    if (groupBy === 'sprint') {
      for (const sp of sprints) {
        if (sp.name && !groups.has(sp.name)) {
          groups.set(sp.name, []);
        }
      }
    }

    let result = Array.from(groups.entries()).map(([key, list]) => ({ key, items: list }));

    // DEV-033 & DEV-055: Ordenamiento cronológico de Sprints y filtros de ciclo de vida
    if (groupBy === 'sprint') {
      // Filtrar sprints que no deben aparecer
      result = result.filter((g) => {
        const isNoSprint = g.key === 'Backlog' || g.key.includes('Sin Sprint') || g.key === 'Sin Asignar';
        if (isNoSprint) return true;

        const spObj = sprints.find((s) => s.name?.toLowerCase().trim() === g.key.toLowerCase().trim() || s.id === g.key);
        const isAllDone = g.items.length > 0 && g.items.every((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish');
        const isCompleted = spObj ? spObj.status === 'completed' : isAllDone;

        // Excluir sprints completados si showCompletedSprints es false
        if (!showCompletedSprints && isCompleted) return false;

        return true;
      });

      result.sort((a, b) => {
        const isNoSprintA = a.key === 'Backlog' || a.key.includes('Sin Sprint') || a.key === 'Sin Asignar';
        const isNoSprintB = b.key === 'Backlog' || b.key.includes('Sin Sprint') || b.key === 'Sin Asignar';
        if (isNoSprintA) return 1;
        if (isNoSprintB) return -1;

        const spA = sprints.find((s) => s.name === a.key || s.id === a.key);
        const spB = sprints.find((s) => s.name === b.key || s.id === b.key);

        const dateA = spA?.startDate || spA?.createdAt;
        const dateB = spB?.startDate || spB?.createdAt;
        if (dateA && dateB && dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }

        return a.key.localeCompare(b.key, undefined, { numeric: true });
      });
    } else if (groupBy === 'priority') {
      const pOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
      result.sort((a, b) => (pOrder[a.key] ?? 99) - (pOrder[b.key] ?? 99));
    } else if (groupBy === 'module') {
      result.sort((a, b) => a.key.localeCompare(b.key));
    }

    return result;
  }, [items, hierarchyItems, groupBy, sortBy, sortAsc, sprints, showCompletedSprints]);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollSnapshotRef = useRef<{
    clickedEl?: HTMLElement;
    clickedTop?: number;
    windowTop: number;
    containerTop: number;
  } | null>(null);

  const toggleSort = (field: 'order' | 'priority' | 'code' | 'status', e?: React.MouseEvent) => {
    // Capturar posición del elemento clickeado y scroll del viewport (DEV-063)
    const el = e?.currentTarget as HTMLElement | undefined;
    scrollSnapshotRef.current = {
      clickedEl: el,
      clickedTop: el ? el.getBoundingClientRect().top : undefined,
      windowTop: window.scrollY || document.documentElement.scrollTop || 0,
      containerTop: containerRef.current ? containerRef.current.scrollTop : 0
    };

    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  // Anclaje visual inmediato sin saltos de scroll ni layout shifts (DEV-063)
  useLayoutEffect(() => {
    if (scrollSnapshotRef.current) {
      const { clickedEl, clickedTop, windowTop, containerTop } = scrollSnapshotRef.current;
      scrollSnapshotRef.current = null;

      // 1. Si el usuario clickeó un header en una tabla específica, mantenerlo exactamente en el mismo punto de la pantalla
      if (clickedEl && typeof clickedTop === 'number' && document.body.contains(clickedEl)) {
        const newTop = clickedEl.getBoundingClientRect().top;
        const delta = newTop - clickedTop;
        if (Math.abs(delta) > 0.5) {
          window.scrollBy({ top: delta, behavior: 'instant' as ScrollBehavior });
        }
      } else {
        // 2. Si no hay referencia de elemento, restaurar la posición previa
        if (containerRef.current && containerRef.current.scrollTop !== containerTop) {
          containerRef.current.scrollTop = containerTop;
        }
        if ((window.scrollY || document.documentElement.scrollTop || 0) !== windowTop) {
          window.scrollTo({ top: windowTop, behavior: 'instant' as ScrollBehavior });
        }
      }
    }
  }, [sortBy, sortAsc]);

  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedKeys(new Set());
  };

  const collapseAll = () => {
    setCollapsedKeys(new Set(groupedData.map((g) => g.key)));
  };

  // DEV-277: Manejadores de selección múltiple
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  };

  const handleRowShiftClick = (clickedId: string, _currentGroupItems?: BacklogItem[]) => {
    if (!lastSelectedId) {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.add(clickedId);
        return next;
      });
      setLastSelectedId(clickedId);
      return;
    }

    const allFlatItems = groupedData.flatMap((g) => g.items);
    const lastIdx = allFlatItems.findIndex((i) => i.id === lastSelectedId);
    const currentIdx = allFlatItems.findIndex((i) => i.id === clickedId);

    if (lastIdx === -1 || currentIdx === -1) {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.add(clickedId);
        return next;
      });
      setLastSelectedId(clickedId);
      return;
    }

    const start = Math.min(lastIdx, currentIdx);
    const end = Math.max(lastIdx, currentIdx);
    const itemsInRange = allFlatItems.slice(start, end + 1);

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      itemsInRange.forEach((i) => next.add(i.id));
      return next;
    });
    setLastSelectedId(clickedId);
  };

  const handleToggleSelectGroup = (groupItems: BacklogItem[]) => {
    if (groupItems.length === 0) return;
    const allGroupSelected = groupItems.every((i) => selectedItemIds.has(i.id));
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (allGroupSelected) {
        groupItems.forEach((i) => next.delete(i.id));
      } else {
        groupItems.forEach((i) => next.add(i.id));
      }
      return next;
    });
    if (!allGroupSelected) {
      setLastSelectedId(groupItems[groupItems.length - 1]?.id || null);
    }
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
    setLastSelectedId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        selectedItemIds.size > 0 &&
        !confirmBulkDeleteOpen &&
        !itemToDelete &&
        !sprintModalOpen &&
        !completingSprint &&
        !sprintToDelete &&
        !selectedRetro
      ) {
        handleDeselectAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedItemIds.size,
    confirmBulkDeleteOpen,
    itemToDelete,
    sprintModalOpen,
    completingSprint,
    sprintToDelete,
    selectedRetro
  ]);

  // DEV-277: Acciones Masivas
  const handleBulkMoveTop = async () => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      for (const group of groupedData) {
        const groupSelected = group.items.filter((it) => selectedItemIds.has(it.id));
        if (groupSelected.length === 0) continue;
        const groupUnselected = group.items.filter((it) => !selectedItemIds.has(it.id));
        const targetSprintVal =
          group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar'
            ? ''
            : group.key;

        if (onReorderItem) {
          for (let i = 0; i < groupSelected.length; i++) {
            await onReorderItem(groupSelected[i].id, targetSprintVal, i);
          }
        } else {
          const reordered = [...groupSelected, ...groupUnselected];
          const patches = reordered.map((it, i) => ({ id: it.id, order: (i + 1) * 10 }));
          await bulkUpdateItems(patches);
        }
      }
      setSortBy('order');
      setSortAsc(true);
      showNotification(
        isEs ? `Se movieron ${count} tareas al inicio` : `Moved ${count} tasks to top`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message || 'Error al mover tareas', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkMoveBottom = async () => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      for (const group of groupedData) {
        const groupSelected = group.items.filter((it) => selectedItemIds.has(it.id));
        if (groupSelected.length === 0) continue;
        const groupUnselected = group.items.filter((it) => !selectedItemIds.has(it.id));
        const targetSprintVal =
          group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar'
            ? ''
            : group.key;

        if (onReorderItem) {
          const baseIndex = groupUnselected.length;
          for (let i = 0; i < groupSelected.length; i++) {
            await onReorderItem(groupSelected[i].id, targetSprintVal, baseIndex + i);
          }
        } else {
          const reordered = [...groupUnselected, ...groupSelected];
          const patches = reordered.map((it, i) => ({ id: it.id, order: (i + 1) * 10 }));
          await bulkUpdateItems(patches);
        }
      }
      setSortBy('order');
      setSortAsc(true);
      showNotification(
        isEs ? `Se movieron ${count} tareas al final` : `Moved ${count} tasks to bottom`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message || 'Error al mover tareas', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkAssignSprint = async (newSprint: string) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      if (onUpdateSprint) {
        for (const id of ids) {
          await onUpdateSprint(id, newSprint);
        }
      } else {
        await bulkUpdateItems(ids.map((id) => ({
          id,
          sprint: newSprint,
          targetSprint: newSprint,
          sprints: newSprint ? [newSprint] : []
        })));
      }
      showNotification(
        isEs
          ? `Se asignaron ${count} tareas a ${newSprint || 'Backlog'}`
          : `Assigned ${count} tasks to ${newSprint || 'Backlog'}`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al asignar sprint', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkAssignRelease = async (newRelease: string) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      await bulkUpdateItems(ids.map((id) => ({
        id,
        release: newRelease,
        targetRelease: newRelease,
        releases: newRelease ? [newRelease] : []
      })));
      showNotification(
        isEs
          ? `Se asignaron ${count} tareas a ${newRelease ? (newRelease.startsWith('v') ? newRelease : `v${newRelease}`) : 'Sin Release'}`
          : `Assigned ${count} tasks to ${newRelease ? (newRelease.startsWith('v') ? newRelease : `v${newRelease}`) : 'No Release'}`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al asignar release', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkChangeStatus = async (newStatus: ItemStatus) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      if (onUpdateStatus) {
        for (const id of ids) {
          await onUpdateStatus(id, newStatus);
        }
      } else {
        await bulkUpdateItems(ids.map((id) => ({ id, status: newStatus })));
      }
      showNotification(
        isEs
          ? `Se cambió el estado de ${count} tareas a ${newStatus}`
          : `Updated status of ${count} tasks to ${newStatus}`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al cambiar estado', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkChangePriority = async (newPriority: Priority) => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      if (onUpdatePriority) {
        for (const id of ids) {
          await onUpdatePriority(id, newPriority);
        }
      } else {
        await bulkUpdateItems(ids.map((id) => ({ id, priority: newPriority })));
      }
      showNotification(
        isEs
          ? `Se cambió la prioridad de ${count} tareas a ${newPriority.toUpperCase()}`
          : `Updated priority of ${count} tasks to ${newPriority.toUpperCase()}`,
        'success'
      );
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al cambiar prioridad', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    const count = selectedItemIds.size;
    try {
      const ids = Array.from(selectedItemIds);
      for (const id of ids) {
        if (onDeleteItem) {
          await onDeleteItem(id);
        } else {
          await deleteItem(id);
        }
      }
      showNotification(
        isEs ? `Se movieron ${count} tareas a la papelera` : `Moved ${count} tasks to trash`,
        'info'
      );
      setConfirmBulkDeleteOpen(false);
      handleDeselectAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar tareas', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 p-4 sm:p-6 max-w-[1680px] mx-auto"
      style={{ overflowAnchor: 'none' }}
    >
      {/* Controls: Group By + Collapse/Expand + Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">{t('sprint.groupBy')}</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-0.5 rounded-lg">
            {(
              [
                { id: 'sprint', label: t('sprint.groupBySprint') },
                { id: 'priority', label: t('sprint.groupByPriority') },
                { id: 'module', label: t('sprint.groupByModule') },
                { id: 'epic', label: t('sprint.groupByEpic') },
                { id: 'none', label: t('sprint.groupByNone') },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                onClick={() => setGroupBy(g.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${groupBy === g.id
                  ? 'bg-white dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-200 border border-slate-200 dark:border-indigo-500/30 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {groupBy !== 'none' && (
            <div className="flex items-center gap-1 ml-1 border-l border-slate-200 dark:border-white/10 pl-2">
              <button
                onClick={expandAll}
                title="Expandir todos los bloques"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{t('sprint.expandAll')}</span>
              </button>
              <button
                onClick={collapseAll}
                title="Colapsar todos los bloques"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <Minimize2 className="w-3 h-3" />
                <span>{t('sprint.collapseAll')}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {groupBy === 'sprint' && completedSprintsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCompletedSprints(!showCompletedSprints)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showCompletedSprints
                  ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/20'
                  : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-slate-200 dark:border-white/10'
              }`}
              title={showCompletedSprints ? t('sprint.hideCompleted') : t('sprint.showCompleted', { count: completedSprintsCount })}
            >
              {showCompletedSprints ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showCompletedSprints ? t('sprint.hideCompleted') : t('sprint.showCompleted', { count: completedSprintsCount })}</span>
            </button>
          )}

          {onCreateSprint && (
            <button
              type="button"
              onClick={() => {
                setEditingSprint(null);
                setSprintModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:shadow transition-all"
              title={t('sprint.newSprint')}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('sprint.newSprint')}</span>
            </button>
          )}
          {/* DEV-051: Column Visibility Popover */}
          <div className="relative" ref={colsPopoverRef}>
            <button
              type="button"
              onClick={() => setColsPopoverOpen(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                colsPopoverOpen
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                  : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              }`}
              title={t('sprint.columns')}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>{t('sprint.columns')}</span>
              {visibleCols.size < ALL_OPTIONAL_COLS.length && (
                <span className="ml-0.5 px-1 py-px rounded bg-indigo-500 text-white text-[9px] font-bold leading-none">
                  {ALL_OPTIONAL_COLS.length - visibleCols.size}
                </span>
              )}
            </button>

            {colsPopoverOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-white dark:bg-[#131c2f] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 pb-1">{t('sprint.optionalCols')}</p>
                {([
                  { id: 'tipo', label: t('sprint.colType') },
                  { id: 'estado', label: t('sprint.colStatus') },
                  { id: 'modulo', label: t('sprint.colModule') },
                  { id: 'release', label: t('sprint.colRelease') },
                  { id: 'sprint', label: t('sprint.colSprint') },
                  { id: 'acProgress', label: t('sprint.colCriteria') },
                  { id: 'assignees', label: t('sprint.colAssignee') },
                  { id: 'labels', label: t('sprint.colLabels') },
                  { id: 'parent', label: t('sprint.colParent') },
                  { id: 'estimate', label: t('itemModal.estimateLabel') }
                ] as { id: OptionalCol; label: string }[]).map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleCols.has(col.id)}
                      onChange={() => toggleCol(col.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">{col.label}</span>
                  </label>
                ))}
                <div className="border-t border-slate-100 dark:border-white/[0.05] pt-1 mt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      const allCols = new Set<OptionalCol>(ALL_OPTIONAL_COLS);
                      setVisibleCols(allCols);
                      setStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS, JSON.stringify(Array.from(allCols)));
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors"
                  >
                    {t('sprint.showAll')}
                  </button>
                  <button
                    onClick={() => {
                      const defCols = new Set<OptionalCol>(DEFAULT_COLS);
                      setVisibleCols(defCols);
                      setStoredItem(STORAGE_KEYS.BACKLOG_VISIBLE_COLS, JSON.stringify(Array.from(defCols)));
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>{t('sprint.resetDefaults')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {t('sprint.itemsInView', { count: items.length })}
          </div>
        </div>

      </div>

      {/* Tables by Group */}
      <div className="space-y-4">
        {groupedData.map((group) => {
          const doneCount = group.items.filter((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish').length;
          const progressPercent = group.items.length > 0 ? Math.round((doneCount / group.items.length) * 100) : 0;
          const isCollapsed = collapsedKeys.has(group.key);
          const isDropTarget = activeDropGroup === group.key;
          const isBacklogGroup = group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar';
          const allGroupSelected = group.items.length > 0 && group.items.every((i) => selectedItemIds.has(i.id));
          const someGroupSelected = group.items.some((i) => selectedItemIds.has(i.id)) && !allGroupSelected;
          const sprintObjRaw = groupBy === 'sprint' ? sprints.find((s) => s.name?.toLowerCase().trim() === group.key.toLowerCase().trim() || s.id === group.key) : undefined;
          const isGroupAllDone = group.items.length > 0 && group.items.every((i) => i.status === 'done' || i.status === 'ready' || i.status === 'finish');
          const hasDoingOrReview = group.items.some((i) => i.status === 'doing' || i.status === 'review');
          const fallbackStatus = isGroupAllDone ? 'completed' : (hasDoingOrReview ? 'active' : 'planned');

          const sprintObj: Sprint | undefined = (groupBy === 'sprint' && !isBacklogGroup) ? {
            id: sprintObjRaw?.id || `sprint-${group.key.toLowerCase().trim().replace(/^sprint[-\s_]*/i, '').replace(/[^a-z0-9_-]/g, '-')}`,
            projectId: sprintObjRaw?.projectId || projectId || '',
            name: sprintObjRaw?.name || group.key,
            status: (sprintObjRaw?.status || fallbackStatus) as any,
            goal: sprintObjRaw?.goal || '',
            createdAt: sprintObjRaw?.createdAt || '',
            startDate: sprintObjRaw?.startDate,
            endDate: sprintObjRaw?.endDate,
            durationWeeks: sprintObjRaw?.durationWeeks,
            completedAt: sprintObjRaw?.completedAt
          } : undefined;

          return (
            <div
              key={group.key}
              onDragOver={(e) => {
                if (groupBy === 'sprint' && onUpdateSprint) {
                  e.preventDefault();
                  setActiveDropGroup((prev) => (prev === group.key ? prev : group.key));
                }
              }}
              onDragLeave={() => {
                if (activeDropGroup === group.key) setActiveDropGroup(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedItemId && groupBy === 'sprint') {
                  const targetSprintVal = isBacklogGroup ? '' : group.key;
                  if (onReorderItem) {
                    onReorderItem(draggedItemId, targetSprintVal, group.items.length);
                    setSortBy('order');
                  } else if (onUpdateSprint) {
                    onUpdateSprint(draggedItemId, targetSprintVal);
                  }
                }
                setActiveDropGroup(null);
                setDraggedItemId(null);
                setDropTargetRow(null);
              }}
              className={`glass-panel rounded-2xl overflow-hidden border transition-all ${isDropTarget
                ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/[0.03]'
                : 'border-slate-200 dark:border-white/[0.07]'
                }`}
            >
              {/* Group Header (Clickable to Toggle Collapse) */}
              <div
                onClick={() => toggleCollapse(group.key)}
                className="px-4 py-3 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors gap-3"
              >
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  {/* Real control: the header row itself stays a plain div because it
                      hosts action buttons, which must not be nested inside a button.
                      This toggle carries the keyboard and screen-reader contract. */}
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? (isEs ? `Expandir ${group.key}` : `Expand ${group.key}`) : (isEs ? `Colapsar ${group.key}` : `Collapse ${group.key}`)}
                    title={isCollapsed ? (isEs ? `Expandir ${group.key}` : `Expand ${group.key}`) : (isEs ? `Colapsar ${group.key}` : `Collapse ${group.key}`)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(group.key);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Master Checkbox in Group Header (DEV-277) */}
                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      disabled={group.items.length === 0}
                      ref={(el) => {
                        if (el) el.indeterminate = someGroupSelected;
                      }}
                      checked={allGroupSelected}
                      onChange={() => handleToggleSelectGroup(group.items)}
                      aria-label={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
                      title={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer hover:border-indigo-400 active:scale-95 transition-all disabled:opacity-40"
                    />
                  </div>

                  <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {group.key === 'Todos los ítems'
                      ? t('sprintView.allItems')
                      : group.key === 'Sin Asignar'
                      ? t('sprintView.unassigned')
                      : group.key === 'Sin Épica'
                      ? t('sprintView.noEpic')
                      : group.key}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-200 dark:bg-white/[0.05] text-slate-700 dark:text-slate-400 shrink-0">
                    {group.items.length} {group.items.length === 1 ? t('sprintView.itemSingle') : t('sprintView.itemPlural')}
                  </span>

                  {/* Story Points Rollup (DEV-139) */}
                  {isEstimationEnabled && (() => {
                    let totalNum = 0;
                    let doneNum = 0;
                    let hasNumbers = false;
                    const tshirts: Record<string, number> = {};
                    let hasTshirts = false;

                    for (const it of group.items) {
                      if (it.estimate !== undefined && it.estimate !== null && it.estimate !== '') {
                        const num = Number(it.estimate);
                        if (!isNaN(num) && typeof it.estimate !== 'boolean') {
                          hasNumbers = true;
                          totalNum += num;
                          if (it.status === 'done' || it.status === 'ready') {
                            doneNum += num;
                          }
                        } else {
                          hasTshirts = true;
                          const val = String(it.estimate).toUpperCase();
                          tshirts[val] = (tshirts[val] || 0) + 1;
                        }
                      }
                    }

                    if (hasNumbers) {
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20 shrink-0"
                          title={`${doneNum} de ${totalNum} Story Points completados`}
                        >
                          <Zap className="w-3 h-3 text-indigo-500" />
                          <span>{doneNum}/{totalNum} SP</span>
                        </span>
                      );
                    }
                    if (hasTshirts) {
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20 shrink-0"
                          title="Estimación T-shirt"
                        >
                          <Zap className="w-3 h-3 text-indigo-500" />
                          <span>{Object.entries(tshirts).map(([k, v]) => `${v}${k}`).join(', ')}</span>
                        </span>
                      );
                    }
                    return null;
                  })()}

                  {/* Status Badge */}
                  {sprintObj && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide border shrink-0 ${
                        sprintObj.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                          : sprintObj.status === 'completed'
                          ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                      }`}
                    >
                      {sprintObj.status === 'active' && '🟢 Activo'}
                      {sprintObj.status === 'completed' && '⚪ Completado'}
                      {sprintObj.status === 'planned' && '🟡 Planificado'}
                    </span>
                  )}

                  {/* Dates */}
                  {sprintObj?.startDate && sprintObj?.endDate && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {sprintObj.startDate} → {sprintObj.endDate}
                    </span>
                  )}

                  {/* Goal */}
                  {sprintObj?.goal && (
                    <span
                      className="hidden md:inline-block text-xs text-slate-500 dark:text-slate-400 italic font-normal truncate max-w-xs xl:max-w-md"
                      title={sprintObj.goal}
                    >
                      "{sprintObj.goal}"
                    </span>
                  )}

                  {isCollapsed && (
                    <span className="text-[11px] text-slate-400 font-mono italic">
                      (colapsado)
                    </span>
                  )}
                  {isDropTarget && (
                    <span className="text-[11px] font-semibold text-indigo-500 animate-pulse">
                      Suelta aquí para asignar a {group.key}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Sprint Actions */}
                  {sprintObj && (
                    <div className="flex items-center gap-1.5">
                      {sprintObj.status === 'planned' && onStartSprint && (
                        <button
                          type="button"
                          onClick={() => onStartSprint(sprintObj)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
                          title={t('sprintView.startSprintTooltip')}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">{t('sprintView.startSprint')}</span>
                        </button>
                      )}

                      {sprintObj.status === 'active' && onCompleteSprint && (
                        <button
                          type="button"
                          onClick={() => setCompletingSprint(sprintObj)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
                          title={t('sprintView.completeSprintTooltip')}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('sprintView.completeSprint')}</span>
                        </button>
                      )}

                      {/* DEV-080: Ver Retrospectiva en Sprints Completados */}
                      {sprintObj.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            const match = retros.find(r => 
                              r.sprintId === sprintObj.id || 
                              r.sprintId.includes(sprintObj.name.toLowerCase().replace(/[^a-z0-9]/g, '-')) || 
                              (r.title && r.title.toLowerCase().includes(sprintObj.name.toLowerCase())) ||
                              (r.content && r.content.toLowerCase().includes(sprintObj.name.toLowerCase()))
                            );
                            if (match) {
                              setSelectedRetro({ ...match, sprintName: sprintObj.name });
                            } else {
                              setSelectedRetro({
                                title: t('sprintView.retroModalTitle', { name: sprintObj.name }),
                                date: sprintObj.completedAt || '',
                                content: t('sprintView.noRetroRecorded', { name: sprintObj.name }),
                                sprintName: sprintObj.name
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shadow-xs"
                          title={t('sprintView.viewRetroTooltip')}
                        >
                          <ScrollText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('sprintView.viewRetro')}</span>
                        </button>
                      )}

                      {onUpdateSprintMeta && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSprint(sprintObj);
                            setSprintModalOpen(true);
                          }}
                          title={t('sprintView.editSprintTooltip')}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDeleteSprint && (
                        <button
                          type="button"
                          onClick={() => setSprintToDelete(sprintObj)}
                          title={t('sprintView.deleteSprintTooltip')}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {!isBacklogGroup && (
                    <>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{doneCount}</span>
                        <span>/</span>
                        <span>{group.items.length}</span>
                        <span className="text-slate-400">({progressPercent}%)</span>
                      </div>
                      <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Table Body or Empty Drop Zone (Visible only when expanded) */}
              {!isCollapsed && (
                group.items.length === 0 ? (
                  <div className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-white/10 m-4 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-white/[0.01]">
                    <Target className="w-8 h-8 text-indigo-400/60 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('sprint.emptySprint')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('sprint.dragDropHint', { name: group.key })}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" style={{ overflowAnchor: 'none' }}>
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] text-slate-500 dark:text-slate-400 font-mono text-xs">
                          {/* Master Checkbox Column in Table (DEV-277) */}
                          <th className="py-2.5 px-3 w-8" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                disabled={group.items.length === 0}
                                ref={(el) => {
                                  if (el) el.indeterminate = someGroupSelected;
                                }}
                                checked={allGroupSelected}
                                onChange={() => handleToggleSelectGroup(group.items)}
                                aria-label={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
                                title={isEs ? `Seleccionar todas las tareas de ${group.key}` : `Select all tasks in ${group.key}`}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer hover:border-indigo-400 active:scale-95 transition-all disabled:opacity-40"
                              />
                            </div>
                          </th>
                          <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors w-14" onClick={(e) => toggleSort('order', e)} title="Ordenar por Ranking / Orden">
                            <div className="flex items-center gap-1">
                              <span className={sortBy === 'order' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>#</span>
                              <ArrowUpDown className={`w-3 h-3 ${sortBy === 'order' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                            </div>
                          </th>
                          <th className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={(e) => toggleSort('priority', e)}>
                            <div className="flex items-center gap-1">
                              <span className={sortBy === 'priority' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>{t('sprint.colPriority')}</span>
                              <ArrowUpDown className={`w-3 h-3 ${sortBy === 'priority' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                            </div>
                          </th>
                          <th className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={(e) => toggleSort('code', e)}>
                            <div className="flex items-center gap-1">
                              <span className={sortBy === 'code' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>{t('sprint.colCode')}</span>
                              <ArrowUpDown className={`w-3 h-3 ${sortBy === 'code' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                            </div>
                          </th>
                          <th className="py-2.5 px-4 min-w-[200px] max-w-md xl:max-w-xl">{t('sprint.colTitle')}</th>
                          {visibleCols.has('tipo') && <th className="py-2.5 px-4">{t('sprint.colType')}</th>}
                          {visibleCols.has('estado') && (
                            <th className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={(e) => toggleSort('status', e)}>
                              <div className="flex items-center gap-1">
                                <span className={sortBy === 'status' ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}>{t('sprint.colStatus')}</span>
                                <ArrowUpDown className={`w-3 h-3 ${sortBy === 'status' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400/60'}`} />
                              </div>
                            </th>
                          )}
                          {visibleCols.has('modulo') && <th className="py-2.5 px-4">{t('sprint.colModule')}</th>}
                          {visibleCols.has('release') && <th className="py-2.5 px-4">{t('sprint.colRelease')}</th>}
                          {visibleCols.has('sprint') && <th className="py-2.5 px-4">{t('sprint.colSprint')}</th>}
                          {visibleCols.has('acProgress') && <th className="py-2.5 px-4">{t('sprint.colCriteria')}</th>}
                          {visibleCols.has('assignees') && <th className="py-2.5 px-4">{t('sprint.colAssignee')}</th>}
                          {visibleCols.has('labels') && <th className="py-2.5 px-4">{t('sprint.colLabels')}</th>}
                          {visibleCols.has('parent') && <th className="py-2.5 px-4">{t('sprint.colParent')}</th>}
                          {visibleCols.has('estimate') && <th className="py-2.5 px-4 text-center">{t('itemModal.estimateLabel')}</th>}
                          <th className="py-2.5 px-4 text-right">{t('sprint.colActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                        {group.items.map((item, rowIdx) => {
                          const typeInfo = typeConfig[item.type] || typeConfig.feature;
                          const TypeIcon = typeInfo.icon;
                          const pInfo = priorityConfig[item.priority] || priorityConfig.p2;
                          const sInfo = getStatusMeta(item.status);
                          const parentItem = item.parentId
                            ? hierarchyItems.find(candidate => candidate.id === item.parentId || candidate.code === item.parentId)
                            : undefined;
                          const rawRelease = item.release || item.targetRelease;
                          const releaseVal = rawRelease && !rawRelease.toLowerCase().includes('sprint') ? rawRelease : undefined;
                          const isBeingDragged = draggedItemId === item.id;
                          const isDropTargetRow = dropTargetRow?.itemId === item.id;
                          const isSelected = selectedItemIds.has(item.id);

                          return (
                            <tr
                              key={item.id}
                              draggable={rankingEnabled && Boolean(onReorderItem || onUpdateSprint)}
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', item.id);
                                setDraggedItemId(item.id);
                              }}
                              onDragEnd={() => {
                                setDraggedItemId(null);
                                setDropTargetRow(null);
                                setActiveDropGroup(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedItemId && draggedItemId !== item.id) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const isUpper = e.clientY < rect.top + rect.height / 2;
                                  const nextPos: 'before' | 'after' = isUpper ? 'before' : 'after';
                                  setDropTargetRow((prev) => (prev?.itemId === item.id && prev?.position === nextPos ? prev : { itemId: item.id, position: nextPos }));
                                }
                              }}
                              onDragLeave={(e) => {
                                if (dropTargetRow?.itemId === item.id) {
                                  const related = e.relatedTarget as Node | null;
                                  if (!e.currentTarget.contains(related)) {
                                    setDropTargetRow(null);
                                  }
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedItemId && draggedItemId !== item.id) {
                                  const isUpper = dropTargetRow?.position === 'before';
                                  const targetSprintVal = group.key === 'Backlog' || group.key.includes('Sin Sprint') || group.key === 'Sin Asignar' ? '' : group.key;
                                  const insertIdx = isUpper ? rowIdx : rowIdx + 1;
                                  if (onReorderItem) {
                                    onReorderItem(draggedItemId, targetSprintVal, insertIdx);
                                    setSortBy('order');
                                  } else if (onUpdateSprint) {
                                    onUpdateSprint(draggedItemId, targetSprintVal);
                                  }
                                }
                                setDraggedItemId(null);
                                setDropTargetRow(null);
                                setActiveDropGroup(null);
                              }}
                              className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer relative ${
                                isSelected ? 'bg-indigo-50/90 dark:bg-indigo-950/40' : ''
                              } ${isBeingDragged ? 'opacity-30 bg-indigo-500/10' : ''
                                } ${isDropTargetRow && dropTargetRow?.position === 'before'
                                  ? 'border-t-2 border-indigo-500 bg-indigo-500/[0.05]'
                                  : ''
                                } ${isDropTargetRow && dropTargetRow?.position === 'after'
                                  ? 'border-b-2 border-indigo-500 bg-indigo-500/[0.05]'
                                  : ''
                                }`}
                              onClick={(e) => {
                                if (e.shiftKey) {
                                  e.preventDefault();
                                  handleRowShiftClick(item.id, group.items);
                                  return;
                                }
                                onClickItem(item);
                              }}
                            >
                              {/* Selection Checkbox (DEV-277) */}
                              <td className="py-2.5 px-3 whitespace-nowrap w-8" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (e.shiftKey) {
                                        e.preventDefault();
                                        handleRowShiftClick(item.id, group.items);
                                      }
                                    }}
                                    onChange={() => handleToggleSelectItem(item.id)}
                                    aria-label={isEs ? `Seleccionar tarea ${item.code}` : `Select task ${item.code}`}
                                    title={isEs ? `Seleccionar tarea ${item.code}` : `Select task ${item.code}`}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer hover:border-indigo-400 active:scale-95 transition-all"
                                  />
                                </div>
                              </td>

                              {/* Grip & Ranking Column */}
                              <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1 text-slate-400">
                                  {rankingEnabled && (
                                    <span
                                      className="cursor-grab active:cursor-grabbing hover:text-indigo-500 p-0.5 rounded transition-colors"
                                      title="Arrastrar verticalmente para reordenar o mover de sprint"
                                    >
                                      <GripVertical className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                                    {item.order !== undefined ? item.order : (rowIdx + 1) * 10}
                                  </span>
                                </div>
                              </td>

                              {/* Priority Column */}
                              <td className="py-2.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={item.priority}
                                  onChange={(e) => {
                                    const newPriority = e.target.value as Priority;
                                    if (newPriority !== item.priority) {
                                      onUpdatePriority(item.id, newPriority);
                                    }
                                  }}
                                  className={`appearance-none bg-transparent border-0 text-[11px] font-mono cursor-pointer focus:outline-none ${pInfo.text}`}
                                >
                                  <option value="p0" className="bg-white dark:bg-[#0e1626] text-rose-600 dark:text-rose-400">P0 🔴</option>
                                  <option value="p1" className="bg-white dark:bg-[#0e1626] text-amber-600 dark:text-amber-400">P1 🟠</option>
                                  <option value="p2" className="bg-white dark:bg-[#0e1626] text-yellow-600 dark:text-yellow-400">P2 🟡</option>
                                  <option value="p3" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400">P3 ⚪</option>
                                </select>
                              </td>

                              {/* Code */}
                              <td className="py-2.5 px-4 whitespace-nowrap font-mono font-semibold text-slate-800 dark:text-slate-300">
                                {item.code}
                              </td>

                              {/* Title */}
                              <td className="py-2.5 px-4 min-w-[200px] max-w-md xl:max-w-xl">
                                <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1 truncate" title={item.title}>
                                  {item.title}
                                </div>
                                {(parentItem || item.parentId || item.epic) && (
                                  <div
                                    className="mt-1 flex max-w-sm items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400"
                                    title={parentItem ? `${parentItem.code || parentItem.id}: ${parentItem.title}` : item.parentId || item.epic}
                                  >
                                    <Layers className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                                    {parentItem ? (
                                      <span className="truncate flex items-center gap-1 min-w-0">
                                        <span className="font-mono opacity-80 shrink-0">{parentItem.code || parentItem.id}</span>
                                        <span className="opacity-40 shrink-0">·</span>
                                        <span className="truncate">{cleanParentTitle(parentItem.title)}</span>
                                      </span>
                                    ) : (
                                      <span className="truncate">
                                        {cleanParentTitle(item.parentId || item.epic || '')}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {item.impactedFile && (
                                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-sm">
                                    {item.impactedFile}
                                  </div>
                                )}
                              </td>

                              {/* Type */}
                              {visibleCols.has('tipo') && (
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeInfo.badge}`}>
                                    <TypeIcon className="w-3 h-3" />
                                    <span>{typeInfo.label}</span>
                                  </span>
                                </td>
                              )}

                              {/* Status */}
                              {visibleCols.has('estado') && (
                                <td className="py-2.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={item.status}
                                    onChange={(e) => {
                                      const newStatus = e.target.value as ItemStatus;
                                      if (newStatus !== item.status) {
                                        onUpdateStatus(item.id, newStatus);
                                      }
                                    }}
                                    className={`appearance-none px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer focus:outline-none ${sInfo.color}`}
                                  >
                                    <option value="ideas" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">💡 {t('status.ideas')}</option>
                                    <option value="draft" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.draft')}</option>
                                    <option value="doing" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.doing')}</option>
                                    <option value="review" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.review')}</option>
                                    <option value="ready" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.ready')}</option>
                                    <option value="done" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.done')}</option>
                                    <option value="dismissed" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.dismissed')}</option>
                                    <option value="cancelled" className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">{t('status.cancelled')}</option>
                                  </select>
                                </td>
                              )}

                              {/* Module */}
                              {visibleCols.has('modulo') && (
                                <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px]">
                                  {item.module || '-'}
                                </td>
                              )}

                              {/* Release / Versión (DEV-033: Formateo limpio sin doble v) */}
                              {visibleCols.has('release') && (
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  {releaseVal ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 font-mono text-[10px]">
                                      {releaseVal.startsWith('v') ? releaseVal : `v${releaseVal}`}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600"> - </span>
                                  )}
                                </td>
                              )}

                              {/* Sprint (visible when sprint col enabled in columns popover) */}
                              {visibleCols.has('sprint') && (
                                <td className="py-2.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {onUpdateSprint && allAvailableSprints.length > 0 ? (
                                    <select
                                      value={item.sprint || item.targetSprint || ''}
                                      onChange={(e) => {
                                        const newSprint = e.target.value;
                                        const curSprint = item.sprint || item.targetSprint || '';
                                        if (newSprint !== curSprint) {
                                          onUpdateSprint(item.id, newSprint);
                                        }
                                      }}
                                      className="appearance-none px-2 py-0.5 rounded text-[10px] font-mono border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 focus:outline-none cursor-pointer"
                                    >
                                      <option value="" className="bg-white dark:bg-[#0e1626] text-slate-500">{t('common.noSprint')}</option>
                                      {allAvailableSprints.map((sp) => (
                                        <option key={sp} value={sp} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">
                                          {sp}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    item.sprint || item.targetSprint ? (
                                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-mono text-[10px]">
                                        {item.sprint || item.targetSprint}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">{t('common.noSprint')}</span>
                                    )
                                  )}
                                </td>
                              )}

                              {/* Criterios de Aceptación (DEV-079) */}
                              {visibleCols.has('acProgress') && (
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  {item.acceptanceCriteriaList && item.acceptanceCriteriaList.length > 0 ? (
                                    (() => {
                                      const checked = item.acceptanceCriteriaList.filter((a) => a.checked).length;
                                      const total = item.acceptanceCriteriaList.length;
                                      const allDone = checked === total;
                                      return (
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                          allDone
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]'
                                        }`}>
                                          <CheckSquare className="w-2.5 h-2.5" />
                                          {checked}/{total} AC
                                        </span>
                                      );
                                    })()
                                  ) : item.acProgress ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-white/[0.05] text-slate-500 border border-slate-200 dark:border-white/[0.08]">
                                      {item.acProgress}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
                                  )}
                                </td>
                              )}

                              {/* Asignados (DEV-079) */}
                              {visibleCols.has('assignees') && (
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  {item.assignees && item.assignees.length > 0 ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {item.assignees.map(a => (
                                        <span key={a} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                                          <User className="w-2.5 h-2.5 text-slate-400" />
                                          {a}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
                                  )}
                                </td>
                              )}

                              {/* Etiquetas (DEV-079) */}
                              {visibleCols.has('labels') && (
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  {item.labels && item.labels.length > 0 ? (
                                    <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                      {item.labels.slice(0, 3).map(l => (
                                        <span key={l} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                                          #{l}
                                        </span>
                                      ))}
                                      {item.labels.length > 3 && (
                                        <span className="text-[10px] text-slate-400">+{item.labels.length - 3}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
                                  )}
                                </td>
                              )}

                              {/* Parent / Épica / Iniciativa (DEV-079, DEV-256) */}
                              {visibleCols.has('parent') && (
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  {parentItem || item.epic ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-medium">
                                      <Bookmark className="w-2.5 h-2.5" />
                                      {parentItem ? `${parentItem.code || parentItem.id} · ${cleanParentTitle(parentItem.title)}` : cleanParentTitle(item.epic || '')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
                                  )}
                                </td>
                              )}

                              {/* Estimación (DEV-139) */}
                              {visibleCols.has('estimate') && (
                                <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                  {item.estimate !== undefined && item.estimate !== null && item.estimate !== '' ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                                      <Zap className="w-3 h-3 text-indigo-500" />
                                      <span>{item.estimate}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs"> - </span>
                                  )}
                                </td>
                              )}

                              {/* Actions */}
                              <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (rowMenuState?.itemId === item.id) {
                                        setRowMenuState(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const menuWidth = 208;
                                        const left = Math.max(16, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 16));
                                        const top = rect.bottom + 4 + 280 > window.innerHeight
                                          ? Math.max(16, rect.top - 280)
                                          : rect.bottom + 4;
                                        setRowMenuState({
                                          itemId: item.id,
                                          top,
                                          left,
                                          group,
                                          rowIdx,
                                          sprintSubmenuOpen: false,
                                        });
                                      }
                                    }}
                                    aria-label={t('common.actions')}
                                    title={t('common.actions')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      rowMenuState?.itemId === item.id
                                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
                                    }`}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Mover a la Papelera"
        message={`¿Estás seguro de que deseas mover la tarea ${itemToDelete?.code} a la papelera? Podrás restaurarla desde allí en cualquier momento.`}
        detail={itemToDelete?.title}
        confirmText="Mover a la Papelera"
        variant="danger"
        onConfirm={() => {
          if (itemToDelete) onDeleteItem(itemToDelete.id);
        }}
        onClose={() => setItemToDelete(null)}
      />

      {/* Unified Row Actions Portal */}
      {rowMenuState && (() => {
        const targetItem = items.find((it) => it.id === rowMenuState.itemId);
        if (!targetItem) return null;
        const curSprint = targetItem.sprint || targetItem.targetSprint || '';
        const canMoveTop = rankingEnabled && rowMenuState.rowIdx > 0;
        const canMoveBottom = rankingEnabled && rowMenuState.rowIdx < rowMenuState.group.items.length - 1;

        return createPortal(
          <div
            ref={rowMenuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ top: rowMenuState.top, left: rowMenuState.left }}
            className="fixed w-52 max-h-96 overflow-y-auto rounded-xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/10 shadow-2xl p-1 z-[100] text-xs animate-in fade-in zoom-in-95"
          >
            {rankingEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleMoveItemToTop(targetItem, rowMenuState.group);
                    setRowMenuState(null);
                  }}
                  disabled={!canMoveTop}
                  aria-label={t('card.moveToTop')}
                  title={t('card.moveToTop')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left transition-colors"
                >
                  <ArrowUpToLine className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('card.moveToTop')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleMoveItemToBottom(targetItem, rowMenuState.group);
                    setRowMenuState(null);
                  }}
                  disabled={!canMoveBottom}
                  aria-label={t('card.moveToBottom')}
                  title={t('card.moveToBottom')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left transition-colors"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('card.moveToBottom')}</span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1" />
              </>
            )}

            {/* Sprint Assignment Submenu */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setRowMenuState((prev) =>
                    prev ? { ...prev, sprintSubmenuOpen: !prev.sprintSubmenuOpen } : null
                  );
                }}
                aria-label={t('card.assignSprint')}
                title={t('card.assignSprint')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{t('card.assignSprint')}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                    rowMenuState.sprintSubmenuOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {rowMenuState.sprintSubmenuOpen && (
                <div className="mt-1 pl-2 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-500/30 ml-2 animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      handleTransferSprint(targetItem.id, '');
                      setRowMenuState(null);
                    }}
                    aria-label={t('card.returnToBacklog')}
                    title={t('card.returnToBacklog')}
                    className={`w-full flex items-center justify-between min-w-0 px-2 py-1.5 rounded-lg text-left text-xs ${
                      !curSprint
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="truncate">{t('card.returnToBacklog')}</span>
                    {!curSprint && <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                  </button>

                  {activeSprints.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => {
                        handleTransferSprint(targetItem.id, sp);
                        setRowMenuState(null);
                      }}
                      aria-label={sp}
                      title={sp}
                      className={`w-full flex items-center justify-between min-w-0 px-2 py-1.5 rounded-lg text-left text-xs ${
                        curSprint === sp
                          ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="truncate">{sp}</span>
                      {curSprint === sp && <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1" />

            {/* Edit Item */}
            <button
              type="button"
              onClick={() => {
                onClickItem(targetItem);
                setRowMenuState(null);
              }}
              aria-label={t('common.edit')}
              title={t('common.edit')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-left transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('common.edit')}</span>
            </button>

            {/* Delete Item */}
            <button
              type="button"
              onClick={() => {
                setItemToDelete(targetItem);
                setRowMenuState(null);
              }}
              aria-label={t('common.delete')}
              title={t('common.delete')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('common.delete')}</span>
            </button>
          </div>,
          document.body
        );
      })()}

      {/* Sprint Modal (Create & Edit) (DEV-055) */}
      <SprintModal
        isOpen={sprintModalOpen}
        onClose={() => {
          setSprintModalOpen(false);
          setEditingSprint(null);
        }}
        sprint={editingSprint}
        suggestedName={suggestedSprintName}
        onSave={async (data) => {
          if (editingSprint && onUpdateSprintMeta) {
            await onUpdateSprintMeta(editingSprint.id, data);
          } else if (onCreateSprint) {
            await onCreateSprint(data);
          }
          setSprintModalOpen(false);
          setEditingSprint(null);
        }}
      />

      {/* Complete Sprint Modal (DEV-055) */}
      {completingSprint && (
        <CompleteSprintModal
          isOpen={!!completingSprint}
          onClose={() => setCompletingSprint(null)}
          sprint={completingSprint}
          sprintItems={items.filter(
            (i) => i.sprint === completingSprint.name || i.targetSprint === completingSprint.name
          )}
          availablePlannedSprints={sprints.filter(
            (s) => s.status === 'planned' && s.id !== completingSprint.id
          )}
          onCreateTaskFromAction={onCreateTaskFromAction}
          onConfirm={async (destinationSprintName, retroData) => {
            if (onCompleteSprint) {
              await onCompleteSprint(completingSprint, destinationSprintName, retroData);
            }
            setCompletingSprint(null);
          }}
        />
      )}

      {/* Delete Sprint Confirmation Modal (DEV-055) */}
      {sprintToDelete && (
        <ConfirmModal
          isOpen={!!sprintToDelete}
          title={t('sprintView.deleteSprintTitle')}
          message={t('sprintView.deleteSprintMessage', { name: sprintToDelete.name })}
          detail={t('sprintView.deleteSprintDetail')}
          confirmText={t('sprintView.deleteSprintConfirm')}
          variant="danger"
          onConfirm={async () => {
            if (onDeleteSprint && sprintToDelete) {
              await onDeleteSprint(sprintToDelete.id);
              setSprintToDelete(null);
            }
          }}
          onClose={() => setSprintToDelete(null)}
        />
      )}

      {/* Retrospective View Modal (DEV-080) */}
      {selectedRetro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#131c2f] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedRetro.title}
                  </h3>
                  {selectedRetro.date && (
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {t('sprintView.recordDate')}: {selectedRetro.date}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedRetro(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-slate-200 dark:border-white/5 max-h-[60vh] overflow-y-auto">
                {selectedRetro.content}
              </pre>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRetro(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/[0.12] transition-colors"
              >
                {t('common.close')}
              </button>{/* ux-audit-ignore UX-010: visible text label; the rule only reads attributes (upstream defect) */}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar (DEV-277) */}
      {selectedItemIds.size > 0 && createPortal(
        <div
          role="toolbar"
          aria-label={isEs ? 'Barra de acciones masivas' : 'Bulk action bar'}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-2xl rounded-2xl bg-slate-900/95 border border-slate-700 p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[95vw] overflow-x-auto text-white"
        >
          {/* Counter & Deselect */}
          <div className="flex items-center gap-2 pr-2.5 sm:pr-3 border-r border-slate-700 shrink-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold font-mono">
              {selectedItemIds.size}
            </span>
            <span className="text-xs font-medium text-slate-200 whitespace-nowrap hidden sm:inline">
              {selectedItemIds.size === 1
                ? (isEs ? '1 seleccionada' : '1 selected')
                : (isEs ? `${selectedItemIds.size} seleccionadas` : `${selectedItemIds.size} selected`)}
            </span>
            <button
              type="button"
              onClick={handleDeselectAll}
              title={isEs ? 'Desmarcar todo' : 'Deselect all'}
              aria-label={isEs ? 'Desmarcar todo' : 'Deselect all'}
              className="ml-0.5 sm:ml-1 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isEs ? 'Desmarcar' : 'Deselect'}</span>
            </button>
          </div>

          {/* Bulk Top / Bottom */}
          <div className="flex items-center gap-1 shrink-0 border-r border-slate-700 pr-2.5 sm:pr-3">
            <button
              type="button"
              disabled={isBulkProcessing}
              onClick={handleBulkMoveTop}
              title={isEs ? 'Mover seleccionadas al inicio de cada contenedor' : 'Move selected to top of container'}
              aria-label={isEs ? 'Mover seleccionadas al inicio de cada contenedor' : 'Move selected to top of container'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <ArrowUpToLine className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">{isEs ? 'Al inicio' : 'Top'}</span>
            </button>
            <button
              type="button"
              disabled={isBulkProcessing}
              onClick={handleBulkMoveBottom}
              title={isEs ? 'Mover seleccionadas al final de cada contenedor' : 'Move selected to bottom of container'}
              aria-label={isEs ? 'Mover seleccionadas al final de cada contenedor' : 'Move selected to bottom of container'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">{isEs ? 'Al final' : 'Bottom'}</span>
            </button>
          </div>

          {/* Bulk Assign Sprint */}
          <div className="relative flex items-center shrink-0">
            <select
              disabled={isBulkProcessing}
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val !== '__placeholder__') {
                  handleBulkAssignSprint(val);
                }
              }}
              title={isEs ? 'Asignar Sprint en lote' : 'Assign Sprint in bulk'}
              aria-label={isEs ? 'Asignar Sprint en lote' : 'Assign Sprint in bulk'}
              className="appearance-none bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium pl-7 pr-6 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <option value="__placeholder__" disabled hidden>
                {isEs ? 'Sprint...' : 'Sprint...'}
              </option>
              <option value="" className="bg-slate-900 text-slate-200">
                {isEs ? '← Devolver al Backlog' : '← Return to Backlog'}
              </option>
              {allAvailableSprints.map((sp) => (
                <option key={sp} value={sp} className="bg-slate-900 text-slate-200">
                  {sp}
                </option>
              ))}
            </select>
            <Target className="w-3.5 h-3.5 text-indigo-400 absolute left-2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Bulk Assign Release */}
          <div className="relative flex items-center shrink-0">
            <select
              disabled={isBulkProcessing}
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val !== '__placeholder__') {
                  handleBulkAssignRelease(val);
                }
              }}
              title={isEs ? 'Asignar Release en lote' : 'Assign Release in bulk'}
              aria-label={isEs ? 'Asignar Release en lote' : 'Assign Release in bulk'}
              className="appearance-none bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium pl-7 pr-6 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <option value="__placeholder__" disabled hidden>
                {isEs ? 'Release...' : 'Release...'}
              </option>
              <option value="" className="bg-slate-900 text-slate-200">
                {isEs ? ' - Sin Release' : ' - No Release'}
              </option>
              {allAvailableReleases.map((rel) => (
                <option key={rel} value={rel} className="bg-slate-900 text-slate-200">
                  {rel.startsWith('v') ? rel : `v${rel}`}
                </option>
              ))}
            </select>
            <Rocket className="w-3.5 h-3.5 text-emerald-400 absolute left-2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Bulk Change Status */}
          <div className="relative flex items-center shrink-0">
            <select
              disabled={isBulkProcessing}
              value=""
              onChange={(e) => {
                const val = e.target.value as ItemStatus;
                if (val && (val as string) !== '__placeholder__') {
                  handleBulkChangeStatus(val);
                }
              }}
              title={isEs ? 'Cambiar Estado en lote' : 'Change Status in bulk'}
              aria-label={isEs ? 'Cambiar Estado en lote' : 'Change Status in bulk'}
              className="appearance-none bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium pl-7 pr-6 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <option value="__placeholder__" disabled hidden>
                {isEs ? 'Estado...' : 'Status...'}
              </option>
              <option value="draft" className="bg-slate-900 text-slate-200">Draft / Borrador</option>
              <option value="doing" className="bg-slate-900 text-slate-200">Doing / En progreso</option>
              <option value="review" className="bg-slate-900 text-slate-200">Review / En revisión</option>
              <option value="ready" className="bg-slate-900 text-slate-200">Ready / Listo</option>
              <option value="done" className="bg-slate-900 text-slate-200">Done / Terminado</option>
              <option value="ideas" className="bg-slate-900 text-slate-200">Ideas 💡</option>
              <option value="dismissed" className="bg-slate-900 text-slate-200">Dismissed / Descartado</option>
              <option value="cancelled" className="bg-slate-900 text-slate-200">Cancelled / Cancelado</option>
            </select>
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 absolute left-2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Bulk Change Priority */}
          <div className="relative flex items-center shrink-0">
            <select
              disabled={isBulkProcessing}
              value=""
              onChange={(e) => {
                const val = e.target.value as Priority;
                if (val && (val as string) !== '__placeholder__') {
                  handleBulkChangePriority(val);
                }
              }}
              title={isEs ? 'Cambiar Prioridad en lote' : 'Change Priority in bulk'}
              aria-label={isEs ? 'Cambiar Prioridad en lote' : 'Change Priority in bulk'}
              className="appearance-none bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium pl-7 pr-6 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <option value="__placeholder__" disabled hidden>
                {isEs ? 'Prioridad...' : 'Priority...'}
              </option>
              <option value="p0" className="bg-slate-900 text-rose-400 font-semibold">P0 🔴 Urgente</option>
              <option value="p1" className="bg-slate-900 text-amber-400 font-semibold">P1 🟠 Alta</option>
              <option value="p2" className="bg-slate-900 text-yellow-400 font-semibold">P2 🟡 Media</option>
              <option value="p3" className="bg-slate-900 text-slate-400">P3 ⚪ Baja</option>
            </select>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 absolute left-2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Bulk Delete */}
          <button
            type="button"
            disabled={isBulkProcessing}
            onClick={() => setConfirmBulkDeleteOpen(true)}
            title={isEs ? 'Mover tareas seleccionadas a la papelera' : 'Move selected items to trash'}
            aria-label={isEs ? 'Mover tareas seleccionadas a la papelera' : 'Move selected items to trash'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-medium border border-rose-500/30 hover:border-rose-500/50 transition-colors disabled:opacity-50 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEs ? 'Eliminar' : 'Delete'}</span>
          </button>

          {/* Spinner during bulk processing */}
          {isBulkProcessing && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 animate-pulse shrink-0">
              <span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              <span className="hidden md:inline">{isEs ? 'Aplicando...' : 'Applying...'}</span>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Confirmation modal for bulk delete */}
      <ConfirmModal
        isOpen={confirmBulkDeleteOpen}
        title={isEs ? 'Mover a la Papelera' : 'Move to Trash'}
        message={
          isEs
            ? `¿Estás seguro de que deseas mover ${selectedItemIds.size} tareas a la papelera? Podrás restaurarlas desde allí en cualquier momento.`
            : `Are you sure you want to move ${selectedItemIds.size} tasks to the trash? You can restore them anytime.`
        }
        detail={items
          .filter((it) => selectedItemIds.has(it.id))
          .slice(0, 5)
          .map((it) => `${it.code}: ${it.title}`)
          .join('\n') + (selectedItemIds.size > 5 ? `\n... y ${selectedItemIds.size - 5} más` : '')}
        confirmText={isEs ? `Mover ${selectedItemIds.size} a la Papelera` : `Move ${selectedItemIds.size} to Trash`}
        variant="danger"
        onConfirm={handleBulkDelete}
        onClose={() => setConfirmBulkDeleteOpen(false)}
      />

      {/* Floating local feedback notification */}
      {localToast && createPortal(
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 bg-slate-900/95 text-white border-slate-700"
        >
          {localToast.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          {localToast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {localToast.type === 'info' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
          <span>{localToast.message}</span>
        </div>,
        document.body
      )}
    </div>
  );
};
