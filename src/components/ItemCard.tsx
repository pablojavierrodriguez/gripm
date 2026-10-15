import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation, type TranslationKey } from '../utils/i18n';
import { useStatusMeta } from '../utils/useStatusMeta';
import { 
  Bug, 
  Sparkles, 
  Wrench, 
  Palette, 
  MoreVertical, 
  Check, 
  ArchiveX, 
  Ban, 
  Trash2, 
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Edit3,
  Bot,
  Layers,
  Zap,
  Flame,
  Search,
  CheckCircle2,
  HelpCircle,
  Clock,
  Target,
  FileCode,
  Shield,
  Activity,
  Award,
  Box,
  Cpu,
  Feather,
  GitBranch,
  Terminal,
  Tag,
  Star,
  Bookmark
} from 'lucide-react';
import type { BacklogItem, ItemStatus, Priority, CustomItemTypeConfig, EstimationConfig, VisibleCardMetadata, GripmConfig } from '../types';
import { isSprintModuleActive, isReleaseModuleActive } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface ItemCardProps {
  item: BacklogItem;
  allItems?: BacklogItem[];
  isDragging?: boolean;
  onClick: () => void;
  onUpdateStatus: (id: string, newStatus: ItemStatus) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, item: BacklogItem) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  // DEV-047: Progress rollup for epics/initiatives
  epicProgress?: { done: number; total: number };
  customItemTypes?: CustomItemTypeConfig[];
  density?: 'comfortable' | 'compact';
  estimationConfig?: EstimationConfig;
  visibleCardMetadata?: VisibleCardMetadata;
  config?: GripmConfig;
  /**
   * Keyboard-accessible reordering (DEV-173, AC #3). Without it, moving a card
   * inside its column is drag-and-drop only, which a keyboard cannot perform.
   * Omitted where the card is not rendered inside a column list.
   */
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  canMoveToTop?: boolean;
  canMoveToBottom?: boolean;
  onMoveWithinColumn?: (direction: 'up' | 'down' | 'top' | 'bottom') => void;
  availableSprints?: string[];
  onAssignSprint?: (sprint: string) => void;
}

export const LUCIDE_ICONS_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  Bug,
  Wrench,
  Palette,
  Layers,
  Zap,
  Flame,
  Search,
  CheckCircle2,
  HelpCircle,
  Clock,
  Target,
  FileCode,
  Shield,
  Activity,
  Award,
  Box,
  Cpu,
  Feather,
  GitBranch,
  Terminal,
  Tag,
  Star,
  Bookmark
};

export const getIconByName = (name?: string): React.FC<{ className?: string }> => {
  if (!name) return Sparkles;
  return LUCIDE_ICONS_MAP[name] || Sparkles;
};

export const cleanParentTitle = (rawTitle: string): string => {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/^(?:(?:[a-z]{2,8}-\d+)\s*[:\-–—]\s*)?(?:épica|epica|iniciativa|epic|initiative)\s*[:\-–—]\s*/i, '')
    .trim();
};

const BASE_TYPE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; badge: string }> = {
  bug: {
    label: 'Bug',
    icon: Bug,
    color: 'text-rose-500 dark:text-rose-400',
    badge: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300'
  },
  feature: {
    label: 'Feature',
    icon: Sparkles,
    color: 'text-violet-500 dark:text-violet-400',
    badge: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-300'
  },
  tech_debt: {
    label: 'Tech Debt',
    icon: Wrench,
    color: 'text-amber-500 dark:text-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-300'
  },
  ux: {
    label: 'UX/UI',
    icon: Palette,
    color: 'text-emerald-500 dark:text-emerald-400',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300'
  },
  epic: {
    label: 'Epic',
    icon: Layers,
    color: 'text-indigo-500 dark:text-indigo-400',
    badge: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
  },
  initiative: {
    label: 'Initiative',
    icon: Zap,
    color: 'text-purple-500 dark:text-purple-400',
    badge: 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300'
  }
};

export const getItemTypeInfo = (
  type: string, 
  customTypes?: CustomItemTypeConfig[]
): { label: string; icon: React.FC<{ className?: string }>; color: string; badge: string } => {
  if (customTypes && customTypes.length > 0) {
    const found = customTypes.find(c => c.key === type);
    if (found) {
      return {
        label: found.label || found.key,
        icon: getIconByName(found.iconName),
        color: found.color || 'text-indigo-500 dark:text-indigo-400',
        badge: found.badge || 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300'
      };
    }
  }
  if (type in BASE_TYPE_CONFIG) {
    return BASE_TYPE_CONFIG[type];
  }
  return {
    label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
    icon: Sparkles,
    color: 'text-indigo-500 dark:text-indigo-400',
    badge: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300'
  };
};

export const typeConfig: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; badge: string }> = new Proxy(
  BASE_TYPE_CONFIG,
  {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return {
        label: String(prop).charAt(0).toUpperCase() + String(prop).slice(1).replace(/_/g, ' '),
        icon: Sparkles,
        color: 'text-indigo-500 dark:text-indigo-400',
        badge: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300'
      };
    }
  }
);

export const priorityConfig: Record<Priority, { label: string; dot: string; text: string }> = {
  p0: { label: 'P0 Urgent', dot: 'bg-rose-500 animate-pulse', text: 'text-rose-600 dark:text-rose-400 font-semibold' },
  p1: { label: 'P1 High', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400 font-medium' },
  p2: { label: 'P2 Medium', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  p3: { label: 'P3 Low', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' }
};


/**
 * DEV-129: Constantes de posicionamiento del menú contextual.
 * `MENU_WIDTH` replica el ancho de `w-48` del panel; se usa para alinear a la
 * derecha y para clampear contra los bordes de la ventana antes de que el panel
 * se mida en el DOM.
 */
const MENU_WIDTH = 192;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

interface MenuPosition {
  top: number;
  left: number;
}

const ItemCardComponent: React.FC<ItemCardProps> = ({
  item,
  allItems = [],
  isDragging = false,
  onClick,
  onUpdateStatus,
  onDelete,
  onDragStart,
  onDragEnd,
  onShowToast,
  epicProgress,
  customItemTypes,
  density = 'comfortable',
  estimationConfig,
  visibleCardMetadata,
  config,
  canMoveUp = false,
  canMoveDown = false,
  canMoveToTop,
  canMoveToBottom,
  onMoveWithinColumn,
  availableSprints,
  onAssignSprint
}) => {
  const { t } = useTranslation();
  const getStatusMeta = useStatusMeta();
  const isCompact = density === 'compact';
  const isSprintActive = isSprintModuleActive(config);
  const isReleaseActive = isReleaseModuleActive(config);
  const isEstimationActive = Boolean(config?.estimation?.enabled ?? estimationConfig?.enabled);
  const currentSprint = item.sprint || item.targetSprint || '';
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // DEV-129: el menú se renderiza en un portal sobre document.body, así que
  // necesita su propio ref: el de `menuRef` cubre sólo el disparador.
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const dragJustEndedRef = useRef(false);
  const parentItem = item.parentId
    ? allItems.find(candidate => candidate.id === item.parentId || candidate.code === item.parentId)
    : undefined;

  useEffect(() => {
    if (!menuOpen && !statusMenuOpen && !sprintMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = menuRef.current?.contains(target) ?? false;
      const insidePanel = menuPanelRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insidePanel) {
        setMenuOpen(false);
        setStatusMenuOpen(false);
        setSprintMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, statusMenuOpen, sprintMenuOpen]);

  /**
   * DEV-129: calcula la posición del menú a partir del rect del disparador.
   *
   * No se puede resolver subiendo el z-index: `.glass-card:hover` aplica
   * `transform`, que crea un stacking context y encierra el menú dentro de la
   * tarjeta, sin poder superar nunca a la tarjeta siguiente en orden
   * de documento. La única salida es sacar el menú del árbol de la tarjeta.
   */
  const computeMenuPosition = useCallback(() => {
    const trigger = menuRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    // El panel ya está montado en este punto, así que su alto real es conocido.
    const panelHeight = menuPanelRef.current?.getBoundingClientRect().height ?? 0;

    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = panelHeight > 0 && spaceBelow < panelHeight + MENU_GAP + VIEWPORT_MARGIN;

    const top = flipUp
      ? Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - MENU_GAP)
      : rect.bottom + MENU_GAP;

    const preferredLeft = rect.right - MENU_WIDTH;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(preferredLeft, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN)
    );

    // Bail-out por igualdad: devuelve la MISMA referencia cuando las coordenadas
    // no cambian, así React no re-renderiza. Es lo que permite que el efecto de
    // posicionamiento corra dos pasadas (medir → decidir flip) sin entrar en loop.
    setMenuPos(prev => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  }, []);

  // useLayoutEffect (no useEffect) para que la posición esté resuelta antes del
  // primer paint del menú, evitando un frame visible en una posición obsoleta.
  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return;
    }

    computeMenuPosition();

    const handleViewportChange = () => computeMenuPosition();
    // capture: true es necesario para recibir el scroll de las columnas del
    // Kanban, que ocurre en contenedores con overflow-y-auto y no en window.
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [menuOpen, statusMenuOpen, sprintMenuOpen, computeMenuPosition]);

  // Segunda pasada: recién ahora el panel está montado y se puede medir su alto
  // real, que es lo que decide si el menú se abre hacia abajo o hacia arriba.
  useLayoutEffect(() => {
    if (!menuOpen || !menuPos) return;
    computeMenuPosition();
  }, [menuOpen, menuPos, computeMenuPosition]);

  const typeInfo = getItemTypeInfo(item.type, customItemTypes);
  const priorityInfo = priorityConfig[item.priority] || priorityConfig.p2;
  const priorityLabel = t(`priority.${item.priority}` as TranslationKey) || priorityInfo.label;
  const TypeIcon = typeInfo.icon;

  const handleDragStartInternal = (e: React.DragEvent) => {
    dragJustEndedRef.current = false;
    onDragStart(e, item);
  };

  const handleDragEndInternal = (e: React.DragEvent) => {
    dragJustEndedRef.current = true;
    onDragEnd(e);
    // Suppress synthetic click fired by browser right after mouseup on drag
    window.setTimeout(() => {
      dragJustEndedRef.current = false;
    }, 200);
  };

  const handleClickInternal = (e: React.MouseEvent) => {
    if (dragJustEndedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const handleCopyAiPrompt = () => {
    let prompt = `# Tarea: [${item.code}] ${item.title}\n\n`;
    prompt += `**Proyecto:** ${item.projectId}\n`;
    prompt += `**Tipo:** ${item.type} | **Prioridad:** ${item.priority.toUpperCase()}\n`;
    const itemModules = (item.modules && item.modules.length > 0) ? item.modules : (item.module ? [item.module] : []);
    if (itemModules.length > 0) prompt += `**Módulo / Área:** ${itemModules.join(', ')}\n`;
    if (item.impactedFile) prompt += `**Archivo Impactado:** ${item.impactedFile}\n`;
    if (item.targetSprint) prompt += `**Sprint:** ${item.targetSprint}\n`;
    prompt += `\n## Descripción del Problema / Requerimiento\n${item.description || item.title}\n\n`;
    if (item.risk) prompt += `## Riesgo / Impacto\n${item.risk}\n\n`;
    if (item.fix) prompt += `## Criterio de Aceptación / Fix Propuesto\n${item.fix}\n\n`;
    prompt += `## Instrucción para el Agente\nAnaliza el código del repositorio, genera el plan de trabajo o implementa la solución paso a paso cumpliendo los criterios de aceptación descritos.`;

    navigator.clipboard.writeText(prompt);
    setMenuOpen(false);
    if (onShowToast) {
      onShowToast(`¡Prompt de ${item.code} copiado al portapapeles! 🤖`, 'success');
    }
  };

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      aria-label={item.title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClickInternal(e as unknown as React.MouseEvent);
        }
      }}
      onDragStart={handleDragStartInternal}
      onDragEnd={handleDragEndInternal}
      onClick={handleClickInternal}
      className={`group relative glass-card ${isCompact ? 'p-2' : 'p-3'} rounded-xl cursor-grab active:cursor-grabbing select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isDragging ? 'is-dragging' : ''
      }`}
    >
      {/* Top row: Code + Type Badge + Estimate Badge + Priority + Menu */}
      <div className={`flex items-center justify-between gap-1.5 min-w-0 ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* QW-1: Item Code with click-to-copy */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(item.code || item.id);
              if (onShowToast) onShowToast(t('card.codeCopied', { code: item.code }), 'success');
            }}
            title={t('card.copyCode', { code: item.code })}
            aria-label={t('card.copyCode', { code: item.code })}
            className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer active:scale-95 transition-transform"
          >
            {item.code}
          </button>

          {/* Type Badge */}
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${typeInfo.badge}`}>
            <TypeIcon className="w-3 h-3" />
            <span>{typeInfo.label}</span>
          </span>

          {/* DEV-138: Estimation Badge */}
          {isEstimationActive && visibleCardMetadata?.estimate !== false && item.estimate !== undefined && item.estimate !== null && item.estimate !== '' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 shrink-0"
              title={`${t('itemModal.estimateLabel')}: ${item.estimate}`}
            >
              <Zap className="w-2.5 h-2.5 text-indigo-500" />
              <span>{item.estimate}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Priority Pill (conditioned by visibleCardMetadata - DEV-203) */}
          {visibleCardMetadata?.priority !== false && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] text-[10px] min-w-[70px] justify-center shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot} shrink-0`} />
              <span className={`${priorityInfo.text} truncate`}>{priorityLabel}</span>
            </div>
          )}

          {/* Context Menu Button */}
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
                setStatusMenuOpen(false);
              }}
              aria-label={t('card.openMenu')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && menuPos && createPortal(
              <div
                ref={menuPanelRef}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setMenuOpen(false);
                    setStatusMenuOpen(false);
                    setSprintMenuOpen(false);
                  }
                }}
                style={{ top: menuPos.top, left: menuPos.left }}
                className="fixed w-48 rounded-xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/10 shadow-2xl p-1 z-[100] text-xs animate-in fade-in zoom-in-95"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onClick();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white text-left"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('card.editDetail')}</span>
                </button>

                {/* Copy AI Prompt Button */}
                <button
                  onClick={handleCopyAiPrompt}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 text-left font-medium"
                >
                  <Bot className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>{t('card.copyAiPrompt')}</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => {
                      setStatusMenuOpen(!statusMenuOpen);
                      setSprintMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{t('card.changeStatus')}</span>
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>

                  {statusMenuOpen && (
                    <div className={`absolute ${menuPos && menuPos.left < 180 ? 'left-full ml-1' : 'right-full mr-1'} top-0 w-44 rounded-xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/10 shadow-2xl p-1 z-50 text-xs`}>
                      {(['ideas', 'draft', 'doing', 'review', 'ready', 'done'] as ItemStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            onUpdateStatus(item.id, s);
                            setMenuOpen(false);
                            setStatusMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs ${
                            item.status === s
                              ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span>{getStatusMeta(s).label}</span>
                          {item.status === s && <Check className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submenú Asignar a Sprint (DEV-276) */}
                {isSprintActive && onAssignSprint && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setSprintMenuOpen(!sprintMenuOpen);
                        setStatusMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between min-w-0 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white text-left"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">{t('card.assignSprint')}</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>

                    {sprintMenuOpen && (
                      <div className={`absolute ${menuPos && menuPos.left < 180 ? 'left-full ml-1' : 'right-full mr-1'} top-0 w-48 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-[#0e1626] border border-slate-200 dark:border-white/10 shadow-2xl p-1 z-50 text-xs`}>
                        <button
                          onClick={() => {
                            onAssignSprint('');
                            setMenuOpen(false);
                            setSprintMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between min-w-0 px-2 py-1.5 rounded-lg text-left text-xs ${
                            !currentSprint
                              ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="truncate">{t('card.returnToBacklog')}</span>
                          {!currentSprint && <Check className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                        </button>

                        {availableSprints && availableSprints.length > 0 && (
                          <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1" />
                        )}

                        {availableSprints?.map((sp) => (
                          <button
                            key={sp}
                            onClick={() => {
                              onAssignSprint(sp);
                              setMenuOpen(false);
                              setSprintMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between min-w-0 px-2 py-1.5 rounded-lg text-left text-xs ${
                              currentSprint === sp
                                ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <span className="truncate">{sp}</span>
                            {currentSprint === sp && <Check className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1" />

                {/* DEV-173 & DEV-276: reordering without a pointer. Disabled at the
                    column edges rather than hidden, so the position in the menu
                    stays stable while arrowing through it. */}
                {onMoveWithinColumn && (canMoveUp || canMoveDown || canMoveToTop || canMoveToBottom) && (
                  <>
                    <button
                      onClick={() => {
                        onMoveWithinColumn('top');
                        setMenuOpen(false);
                      }}
                      disabled={canMoveToTop !== undefined ? !canMoveToTop : !canMoveUp}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                      <span>{t('card.moveToTop')}</span>
                    </button>

                    <button
                      onClick={() => {
                        onMoveWithinColumn('up');
                        setMenuOpen(false);
                      }}
                      disabled={!canMoveUp}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>{t('card.moveUp')}</span>
                    </button>

                    <button
                      onClick={() => {
                        onMoveWithinColumn('down');
                        setMenuOpen(false);
                      }}
                      disabled={!canMoveDown}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>{t('card.moveDown')}</span>
                    </button>

                    <button
                      onClick={() => {
                        onMoveWithinColumn('bottom');
                        setMenuOpen(false);
                      }}
                      disabled={canMoveToBottom !== undefined ? !canMoveToBottom : !canMoveDown}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>{t('card.moveToBottom')}</span>
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-white/[0.08] my-1" />
                  </>
                )}

                <button
                  onClick={() => {
                    onUpdateStatus(item.id, 'dismissed');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-600 dark:text-amber-300/90 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-left"
                >
                  <ArchiveX className="w-3.5 h-3.5" />
                  <span>{t('status.dismissed')}</span>
                </button>

                <button
                  onClick={() => {
                    onUpdateStatus(item.id, 'cancelled');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-left"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{t('status.cancelled')}</span>
                </button>

                {item.status === 'done' ? (
                  <div
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed text-left"
                    title={t('card.doneProtected')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('common.delete')}</span>
                    <span className="ml-auto text-[9px] bg-slate-100 dark:bg-white/[0.06] px-1 py-0.5 rounded font-medium text-slate-400 dark:text-slate-500">{t('card.protected')}</span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400/90 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left"
                    title={t('card.sendToTrash')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('header.trash')}</span>
                  </button>
                )}
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Item Title */}
      <h4 className={`${isCompact ? 'text-[11px] mb-1.5' : 'text-xs mb-2'} font-medium leading-snug line-clamp-2 transition-colors ${
        item.type === 'epic'
          ? 'text-indigo-900 dark:text-indigo-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'
          : item.type === 'initiative'
          ? 'text-purple-900 dark:text-purple-100 group-hover:text-purple-600 dark:group-hover:text-purple-300'
          : 'text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-200'
      }`}>
        {item.title}
      </h4>

      {/* DEV-047: Epic/Initiative Progress Rollup */}
      {(item.type === 'epic' || item.type === 'initiative') && epicProgress && epicProgress.total > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className={`font-medium ${item.type === 'epic' ? 'text-indigo-600 dark:text-indigo-400' : 'text-purple-600 dark:text-purple-400'}`}>
              {t('card.progress')}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-mono">
              {epicProgress.done}/{epicProgress.total} · {Math.round((epicProgress.done / epicProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                item.type === 'epic' ? 'bg-indigo-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.round((epicProgress.done / epicProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta Pills (Module, Sprint, Release, ACs, Parent, Blocked) */}
      <div className={`flex items-center gap-1.5 flex-wrap ${isCompact ? 'pt-0.5' : 'pt-1'} border-t border-slate-100 dark:border-white/[0.04] text-[10px] text-slate-500 dark:text-slate-400`}>
        {visibleCardMetadata?.acProgress !== false && item.acceptanceCriteriaList && item.acceptanceCriteriaList.length > 0 && (() => {
          const totalAcs = item.acceptanceCriteriaList.length;
          const checkedAcs = item.acceptanceCriteriaList.filter(ac => ac.checked).length;
          const allCompleted = totalAcs > 0 && checkedAcs === totalAcs;
          return (
            <span
              className={`px-1.5 py-0.5 rounded font-mono text-xs flex items-center gap-1 font-medium transition-colors ${
                allCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-semibold shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
              }`}
            >
              ✓ {checkedAcs}/{totalAcs} AC
            </span>
          );
        })()}

        {visibleCardMetadata?.module !== false && (() => {
          const itemModules = (item.modules && item.modules.length > 0) ? item.modules : (item.module ? [item.module] : []);
          if (itemModules.length === 0) return null;
          return itemModules.map((mod) => (
            <span
              key={mod}
              title={`Módulo: ${mod}`}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.05] text-slate-700 dark:text-slate-300 truncate max-w-[130px]"
            >
              {mod}
            </span>
          ));
        })()}

        {isSprintActive && visibleCardMetadata?.sprint !== false && (item.sprint || item.targetSprint) && (
          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300/90 border border-indigo-200 dark:border-indigo-500/20 truncate max-w-[120px]">
            {item.sprint || item.targetSprint}
          </span>
        )}

        {isReleaseActive && visibleCardMetadata?.release !== false && (() => {
          const rel = item.release || item.targetRelease;
          if (!rel || rel.toLowerCase().includes('sprint')) return null;
          return (
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300/90 border border-emerald-200 dark:border-emerald-500/20 font-mono">
              {rel.startsWith('v') ? rel : `v${rel}`}
            </span>
          );
        })()}

        {visibleCardMetadata?.parent !== false && (parentItem || item.parentId || item.epic) && (
          <span
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.07] text-xs flex items-center gap-1 min-w-0 max-w-full"
            title={parentItem ? `${parentItem.code || parentItem.id}: ${parentItem.title}` : t('card.parentTask', { id: item.parentId || item.epic || '' })}
          >
            <Layers className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
            {parentItem ? (
              <span className="truncate flex items-center gap-1 min-w-0">
                <span className="font-mono opacity-80 shrink-0">{parentItem.code || parentItem.id}</span>
                <span className="opacity-40 shrink-0">·</span>
                <span className="truncate">{cleanParentTitle(parentItem.title)}</span>
              </span>
            ) : (
              <span className="truncate font-mono">
                {cleanParentTitle(item.parentId || item.epic || '')}
              </span>
            )}
          </span>
        )}

        {visibleCardMetadata?.blocked !== false && item.blockedBy && item.blockedBy.length > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-medium text-[9px] flex items-center gap-1" title={t('card.blockedBy', { tasks: item.blockedBy.join(', ') })}>
            ⛔ {t('card.blockedBy', { tasks: item.blockedBy.join(', ') })}
          </span>
        )}

        {visibleCardMetadata?.blocked !== false && item.blocks && item.blocks.length > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-medium text-[9px] flex items-center gap-1" title={t('card.blocks', { tasks: item.blocks.join(', ') })}>
            ⚠️ {t('card.blocks', { tasks: item.blocks.join(', ') })}
          </span>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('card.moveToTrash')}
        message={t('itemModal.deletePrompt', { code: item.code })}
        detail={item.title}
        confirmText={t('card.moveToTrash')}
        variant="danger"
        onConfirm={() => onDelete(item.id)}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export const ItemCard = memo(ItemCardComponent);
