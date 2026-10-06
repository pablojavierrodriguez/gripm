import { useState, useEffect, useLayoutEffect, useRef, type FC } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Sparkles,
  CheckSquare,
  Plus,
  Trash,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sliders,
  Code,
  Layers,
  Link,
  ShieldAlert,
  History,
  Tag,
  User
} from 'lucide-react';
import type { BacklogItem, ItemStatus, ItemType, Priority, Project, AcceptanceCriterion, DevBoardConfig, Sprint, Release } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useTranslation } from '../utils/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BacklogItem | null; // null means create new item
  defaultStatus?: ItemStatus;
  defaultSprint?: string;
  projects: Project[];
  availableModules: string[];
  availableSprints?: string[];
  availableReleases?: string[];
  sprints?: Sprint[];
  releases?: Release[];
  onSave: (itemData: Partial<BacklogItem> & { expectedMtime?: number; force?: boolean }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  activeProjectId?: string;
  config?: DevBoardConfig;
  allItems?: BacklogItem[];
}

/**
 * DEV-126: Ejemplos de Criterio de Aceptación según el Tipo del ítem.
 *
 * Un único ejemplo fijo no sirve: el mismo texto de ayuda induce a redactar
 * siempre el mismo tipo de criterio ("se mantiene estable...", "no debe
 * romper..."), que es exactamente lo contrario de un AC. En cambio, cuando el
 * ejemplo se deriva del Tipo, el usuario ve en cada ítem cómo se redacta un
 * criterio *de esa clase de trabajo*, y el ejemplo se transforma solo al cambiar
 * el Tipo en la sidebar.
 *
 * Cada plantilla recibe el título (o el módulo) ya recortado, y degrada a una
 * redacción genérica cuando el ítem todavía no tiene título, de modo que nunca
 * se rendericen comillas vacías o frases sin verbo.
 */
const AC_EXAMPLES_BY_TYPE: Record<string, (ref: string) => string> = {
  bug: (r) =>
    r
      ? `Dado que el usuario intenta «${r}», el sistema responde correctamente, sin errores ni saltos de contenido.`
      : 'Dado que el usuario ejecuta un flujo no previsto, el sistema responde correctamente, sin errores ni saltos de contenido.',
  feature: (r) =>
    r
      ? `«${r}» queda disponible para el usuario sin pasos manuales, y el resultado se persiste.`
      : 'La funcionalidad queda disponible para el usuario sin pasos manuales, y el resultado se persiste.',
  tech_debt: (r) =>
    r
      ? `El módulo «${r}» queda sin dependencias obsoletas y la suite de tests sigue pasando en verde.`
      : 'El módulo afectado queda sin dependencias obsoletas y la suite de tests sigue pasando en verde.',
  ux: (r) =>
    r
      ? `Al interactuar con «${r}», la interfaz se mantiene legible y sin saltos de layout, en móvil y escritorio.`
      : 'Al interactuar con el elemento, la interfaz se mantiene legible y sin saltos de layout, en móvil y escritorio.',
  epic: (r) =>
    r
      ? `«${r}» se resuelve de punta a punta, con estados y roles bien definidos.`
      : 'El flujo completo se resuelve de punta a punta, con estados y roles bien definidos.',
  initiative: (r) =>
    r
      ? `«${r}» se da por completado cuando existe un impacto medible en el equipo o el producto.`
      : 'El objetivo estratégico se da por completado cuando existe un impacto medible en el equipo o el producto.'
};

const AC_EXAMPLE_FALLBACK = (r: string): string =>
  r
    ? `Describe un resultado observable y verificable sobre «${r}», en una sola frase.`
    : 'Describe un resultado observable y verificable, en una sola frase.';

// Patrón Proxy defensivo (AGENTS.md § Soberanía y Tipos Dinámicos): ItemType admite
// tipos personalizados del usuario, así que cualquier clave arbitraria debe devolver un
// ejemplo válido en lugar de romper el render del placeholder. El target del Proxy es
// una función para conservar la firma invocable del resolvedor.
const acExampleForType = new Proxy(
  (() => AC_EXAMPLE_FALLBACK) as unknown as (type: string) => (ref: string) => string,
  {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && typeof AC_EXAMPLES_BY_TYPE[prop] === 'function') {
        return AC_EXAMPLES_BY_TYPE[prop];
      }
      return Reflect.get(target, prop);
    }
  }
);

/** Recorta el texto de referencia para que el placeholder nunca desborde el input. */
const buildCriterionExample = (type: ItemType, title: string, module: string): string => {
  const raw = (title || module || '').trim().replace(/\s+/g, ' ');
  const ref = raw.length > 40 ? `${raw.slice(0, 40).trimEnd()}…` : raw;
  return acExampleForType(type)(ref);
};

export const ItemModal: FC<ItemModalProps> = ({
  isOpen,
  onClose,
  item,
  defaultStatus = 'draft',
  defaultSprint = '',
  projects,
  availableModules,
  availableSprints = [],
  availableReleases = [],
  sprints = [],
  releases = [],
  onSave,
  onDelete,
  activeProjectId,
  config,
  allItems = []
}) => {
  const { t } = useTranslation();
  const isEditing = !!item;

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [projectId, setProjectId] = useState(activeProjectId || projects[0]?.id || '');
  const [type, setType] = useState<ItemType>('feature');
  const [priority, setPriority] = useState<Priority>('p2');
  const [status, setStatus] = useState<ItemStatus>(defaultStatus);
  const [module, setModule] = useState('');
  const [impactedFile, setImpactedFile] = useState('');
  const [sprint, setSprint] = useState('');
  const [release, setRelease] = useState('');
  const [selectedReleases, setSelectedReleases] = useState<string[]>([]);
  const [parentId, setParentId] = useState('');
  const [blocks, setBlocks] = useState<string[]>([]);
  const [blockedBy, setBlockedBy] = useState<string[]>([]);
  const [relatedTo, setRelatedTo] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [risk, setRisk] = useState('');
  const [fix, setFix] = useState('');
  const [implementationPlan, setImplementationPlan] = useState('');
  const [acceptanceCriteriaList, setAcceptanceCriteriaList] = useState<AcceptanceCriterion[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [assigneeInput, setAssigneeInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictItem, setConflictItem] = useState<BacklogItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Accordion expansion states
  const [acExpanded, setAcExpanded] = useState(true);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [riskFixExpanded, setRiskFixExpanded] = useState(false);
  const [relationsExpanded, setRelationsExpanded] = useState(false);
  const [customSprintMode, setCustomSprintMode] = useState(false);
  const [customReleaseMode, setCustomReleaseMode] = useState(false);
  const [customReleaseInput, setCustomReleaseInput] = useState('');

  const currentId = item?.id || '';
  const currentCode = item?.code || '';
  const otherItems = (allItems || []).filter(it => it.id !== currentId && it.code !== currentCode);
  const candidateParents = otherItems.filter(it => it.type === 'epic' || it.type === 'initiative' || it.type === 'feature');
  const availableLabels = Array.from(new Set(allItems.flatMap(it => it.labels || []))).filter(Boolean);
  const availableAssignees = Array.from(new Set(allItems.flatMap(it => it.assignees || []))).filter(Boolean);

  const populateFromItem = (source: BacklogItem) => {
    setTitle(source.title || '');
    setCode(source.code || '');
    setProjectId(source.projectId || activeProjectId || projects[0]?.id || '');
    setType(source.type || 'feature');
    setPriority(source.priority || 'p2');
    setStatus(source.status || 'draft');
    setModule(source.module || '');
    setImpactedFile(source.impactedFile || '');
    const sVal = source.sprint || source.targetSprint || (source.sprints && source.sprints.length > 0 ? source.sprints[source.sprints.length - 1] : '') || '';
    const rawRVal = source.release || source.targetRelease || '';
    const rVal = rawRVal.toLowerCase().includes('sprint') ? '' : rawRVal;
    setSprint(sVal);
    setRelease(rVal);
    const rels = (source.releases && source.releases.length > 0 ? source.releases : (rVal ? [rVal] : [])).filter(r => !r.toLowerCase().includes('sprint'));
    setSelectedReleases(rels);
    setCustomReleaseMode(false);
    setCustomReleaseInput('');
    setParentId(source.parentId || '');
    setBlocks(source.blocks || []);
    setBlockedBy(source.blockedBy || []);
    setRelatedTo(source.relatedTo || []);
    setDescription(source.description || '');
    setRisk(source.risk || '');
    setFix(source.fix || '');
    setImplementationPlan(source.implementationPlan || '');
    setAcceptanceCriteriaList(source.acceptanceCriteriaList || []);
    setLabels(source.labels || []);
    setLabelInput('');
    setAssignees(source.assignees || []);
    setAssigneeInput('');
    setAcExpanded(true);
    setPlanExpanded(Boolean(source.implementationPlan?.trim()));
    setRiskFixExpanded(Boolean(source.risk?.trim() || source.fix?.trim()));
    setRelationsExpanded(Boolean(source.parentId || (source.blocks && source.blocks.length > 0) || (source.blockedBy && source.blockedBy.length > 0) || (source.relatedTo && source.relatedTo.length > 0)));
  };

  const prevIsOpenRef = useRef(false);
  const prevItemIdRef = useRef<string | null>(null);

  // Initialize form ONLY when modal opens or target item changes, never on live background syncs.
  // DEV-126: useLayoutEffect (not useEffect) so the form is populated BEFORE the browser paints.
  // With useEffect, the modal painted one frame with the previous session's residual state
  // and only repainted afterwards, producing a visible ~1s content jump on every open.
  useLayoutEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      prevItemIdRef.current = null;
      return;
    }

    const currentItemId = item ? item.id : null;
    const isJustOpening = !prevIsOpenRef.current;
    const isDifferentItem = isJustOpening || prevItemIdRef.current !== currentItemId;

    if (isDifferentItem) {
      prevIsOpenRef.current = true;
      prevItemIdRef.current = currentItemId;

      setFormError(null);
      setConflictItem(null);
      setShowDeleteConfirm(false);
      if (item) {
        populateFromItem(item);
      } else {
        // New item defaults
        setTitle('');
        setCode('');
        setProjectId(activeProjectId || projects[0]?.id || '');
        setType('feature');
        setPriority('p2');
        setStatus(defaultStatus);
        setModule('');
        setImpactedFile('');
        setSprint(defaultSprint || '');
        setRelease('');
        setSelectedReleases([]);
        setCustomReleaseMode(false);
        setCustomReleaseInput('');
        setParentId('');
        setBlocks([]);
        setBlockedBy([]);
        setRelatedTo([]);
        setDescription('');
        setRisk('');
        setFix('');
        setImplementationPlan('');
        setAcceptanceCriteriaList([]);
        setLabels([]);
        setLabelInput('');
        setAssignees([]);
        setAssigneeInput('');
        setAcExpanded(true);
        setPlanExpanded(false);
        setRiskFixExpanded(false);
        setRelationsExpanded(false);
      }
    }
  }, [isOpen, item, defaultStatus, defaultSprint, activeProjectId]);

  // Keyboard shortcut listener: Esc closes, Cmd+Enter saves
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape is owned by useFocusTrap. ConfirmModal renders on top of this
      // dialog, so a second handler would close both on a single keypress.
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleFormSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, code, projectId, type, priority, status, module, impactedFile, sprint, release, description, risk, fix, implementationPlan, acceptanceCriteriaList, labels, assignees, showDeleteConfirm]);

  const handleAddLabel = (val?: string) => {
    const raw = (val !== undefined ? val : labelInput).trim();
    if (!raw) return;
    const parts = raw.split(',').map(s => s.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
    const newLabels = Array.from(new Set([...labels, ...parts]));
    setLabels(newLabels);
    setLabelInput('');
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(l => l !== labelToRemove));
  };

  const handleAddAssignee = (val?: string) => {
    const raw = (val !== undefined ? val : assigneeInput).trim();
    if (!raw) return;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const newAssignees = Array.from(new Set([...assignees, ...parts]));
    setAssignees(newAssignees);
    setAssigneeInput('');
  };

  const handleRemoveAssignee = (assigneeToRemove: string) => {
    setAssignees(assignees.filter(a => a !== assigneeToRemove));
  };

  const handleFormSubmit = async (force = false) => {
    if (!title.trim()) {
      setFormError('Por favor especifica un título para el ítem');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await onSave({
        id: item?.id,
        title: title.trim(),
        code: code.trim() || undefined,
        projectId,
        type,
        priority,
        status,
        module: module.trim() || undefined,
        impactedFile: impactedFile.trim() || undefined,
        sprint: sprint.trim(),
        release: selectedReleases[0] ? selectedReleases[0].trim() : (release.trim() || ''),
        targetSprint: sprint.trim(),
        targetRelease: selectedReleases[0] ? selectedReleases[0].trim() : (release.trim() || ''),
        releases: selectedReleases.length > 0 ? selectedReleases : (release.trim() ? [release.trim()] : []),
        milestone: selectedReleases[0] ? selectedReleases[0].trim() : (release.trim() || ''),
        sprints: sprint.trim() ? [sprint.trim()] : [],
        parentId: parentId.trim() || undefined,
        blocks: blocks.length > 0 ? blocks : undefined,
        blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
        relatedTo: relatedTo.length > 0 ? relatedTo : undefined,
        description: description.trim(),
        risk: risk.trim() || undefined,
        fix: fix.trim() || undefined,
        implementationPlan: implementationPlan.trim() || undefined,
        acceptanceCriteriaList,
        labels: labels.filter(Boolean),
        assignees: assignees.filter(Boolean),
        expectedMtime: item?.mtime,
        force
      });
      setConflictItem(null);
      onClose();
    } catch (err: any) {
      if (err.status === 409 && err.currentItem) {
        setConflictItem(err.currentItem);
        setFormError('Conflicto detectado: la tarea fue modificada en disco por otro proceso o agente.');
      } else {
        setFormError(`Error al guardar: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCriterion = () => {
    const nextIndex = acceptanceCriteriaList.length > 0 
      ? Math.max(...acceptanceCriteriaList.map(c => c.index)) + 1 
      : 1;
    setAcceptanceCriteriaList([
      ...acceptanceCriteriaList,
      { index: nextIndex, text: '', checked: false }
    ]);
  };

  const handleUpdateCriterionText = (index: number, text: string) => {
    setAcceptanceCriteriaList(
      acceptanceCriteriaList.map(c => c.index === index ? { ...c, text } : c)
    );
  };

  const handleToggleCriterion = (index: number) => {
    setAcceptanceCriteriaList(
      acceptanceCriteriaList.map(c => c.index === index ? { ...c, checked: !c.checked } : c)
    );
  };

  const handleRemoveCriterion = (index: number) => {
    setAcceptanceCriteriaList(
      acceptanceCriteriaList.filter(c => c.index !== index)
    );
  };

  if (!isOpen) return null;

  const acChecked = acceptanceCriteriaList.filter(c => c.checked).length;
  const acTotal = acceptanceCriteriaList.length;
  // El ejemplo del AC se recalcula con el Tipo, el Título y el Módulo actuales (DEV-126).
  const criterionExample = buildCriterionExample(type, title, module);
  const planExample = impactedFile.trim()
    ? `1. Modificar ${impactedFile.trim()}...&#10;2. Ajustar tipos, contrato de datos y tests...&#10;3. Ejecutar tsc, npm test y backlog:check...`
    : '1. Modificar el archivo afectado...&#10;2. Ajustar tipos, contrato de datos y tests...&#10;3. Ejecutar tsc, npm test y backlog:check...';

  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-6xl glass-panel rounded-t-2xl sm:rounded-2xl border-t sm:border shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile bottom-sheet handle */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isEditing ? `${t('itemModal.editTitle')} ${item.code}` : t('itemModal.createTitle')}
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {isEditing ? t('itemModal.editSubtitle') : t('itemModal.createSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            title={`${t('common.close')} (Esc)`}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - 2-Column Linear-style Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {conflictItem && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs flex flex-col gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">{t('itemModal.conflictNotice')}</span> {t('itemModal.conflictDesc')}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    populateFromItem(conflictItem);
                    setConflictItem(null);
                    setFormError(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('itemModal.reloadDisk')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFormSubmit(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 dark:text-slate-950 font-semibold text-xs transition-colors"
                >
                  {t('itemModal.overwriteAnyway')}
                </button>
              </div>
            </div>
          )}

          {formError && !conflictItem && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (67%): Main Content */}
            <div className="lg:col-span-8 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('itemModal.titleLabel')} <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('itemModal.titlePlaceholder')}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-base text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('itemModal.reqDescription')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const bddTemplate = `\n\n**COMO** [rol del usuario]\n**QUIERO** [capacidad o acción]\n**PARA** [beneficio o valor de negocio]\n`;
                      setDescription(prev => prev.trim() ? `${prev}\n${bddTemplate}` : bddTemplate.trimStart());
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-colors"
                    title={t('itemModal.addBddStoryTitle')}
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>{t('itemModal.addBddStory')}</span>
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder={t('itemModal.descriptionPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 leading-relaxed font-sans resize-y"
                />
              </div>

              {/* SECTION: Acceptance Criteria Accordion */}
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] overflow-hidden transition-all">
                <div 
                  onClick={() => setAcExpanded(!acExpanded)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('itemModal.acTitle')}</span>
                    
                    {acTotal === 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-50 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 font-mono">
                        {t('itemModal.acCountZero')}
                      </span>
                    ) : acChecked === acTotal ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                        ✓ {t('itemModal.acCompleted', { checked: acChecked, total: acTotal })}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-medium">
                        {t('itemModal.acCompleted', { checked: acChecked, total: acTotal })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddCriterion();
                        if (!acExpanded) setAcExpanded(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('itemModal.acAddCriterion')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIndex = acceptanceCriteriaList.length > 0 
                          ? Math.max(...acceptanceCriteriaList.map(a => a.index)) + 1 
                          : 1;
                        setAcceptanceCriteriaList([
                          ...acceptanceCriteriaList,
                          {
                            index: nextIndex,
                            text: 'DADO [contexto inicial], CUANDO [evento o acción], ENTONCES [resultado esperado]',
                            checked: false
                          }
                        ]);
                        if (!acExpanded) setAcExpanded(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium transition-colors"
                      title={t('itemModal.acAddBddTitle')}
                    >
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>{t('itemModal.acAddBdd')}</span>
                    </button>
                    <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${acExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </div>
                </div>

                {acExpanded && (
                  <div className="p-3.5 border-t border-slate-200 dark:border-white/[0.06] space-y-2 bg-slate-50 dark:bg-black/10">
                    {acceptanceCriteriaList.length === 0 ? (
                      <p className="text-[11px] text-slate-600 dark:text-slate-500 italic py-1">
                        {t('itemModal.acNoneDefined')}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {acceptanceCriteriaList.map((ac) => (
                          <div key={ac.index} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={ac.checked}
                              onChange={() => handleToggleCriterion(ac.index)}
                              className="rounded border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-500 shrink-0">#{ac.index}</span>
                            <input
                              type="text"
                              value={ac.text}
                              onChange={(e) => handleUpdateCriterionText(ac.index, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCriterion();
                                }
                              }}
                              placeholder={criterionExample}
                              className={`flex-1 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:bg-slate-100 dark:focus:bg-white/[0.05] transition-all ${
                                ac.checked ? 'line-through text-slate-600 dark:text-slate-500' : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCriterion(ac.index)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title={t('itemModal.acDeleteTitle')}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION: Plan de Implementación & Plan Guard Accordion */}
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] overflow-hidden transition-all">
                <div 
                  onClick={() => setPlanExpanded(!planExpanded)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('itemModal.planGuardTitle')}</span>
                    
                    {implementationPlan.trim() ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono">
                        {t('itemModal.planDrafted')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-50 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 font-mono">
                        {t('itemModal.planNone')}
                      </span>
                    )}
                  </div>

                  <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${planExpanded ? 'rotate-0' : '-rotate-90'}`} />
                </div>

                {planExpanded && (
                  <div className="p-3.5 border-t border-slate-200 dark:border-white/[0.06] space-y-2 bg-slate-50 dark:bg-black/10">
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                      {t('itemModal.planNotice')}
                    </p>
                    <textarea
                      value={implementationPlan}
                      onChange={(e) => setImplementationPlan(e.target.value)}
                      rows={5}
                      placeholder={planExample}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-y"
                    />
                  </div>
                )}
              </div>

              {/* DEV-048: Relaciones y Dependencias (Jerarquías y Bloqueos) */}
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRelationsExpanded(!relationsExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t('itemModal.relationsTitle')}
                    </span>
                    {(parentId || blocks.length > 0 || blockedBy.length > 0 || relatedTo.length > 0) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono">
                        {[
                          parentId ? `1 ${t('itemModal.relationsParent').split(' ')[1] || 'padre'}` : null,
                          blocks.length > 0 ? `${blocks.length} ${t('itemModal.relationsBlocks').split(' ')[0] || 'bloquea'}` : null,
                          blockedBy.length > 0 ? `${blockedBy.length} ${t('itemModal.relationsBlockedBy').split(' ')[0] || 'bloqueado'}` : null,
                          relatedTo.length > 0 ? `${relatedTo.length} enlaces` : null
                        ].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  {relationsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  )}
                </button>

                {relationsExpanded && (
                  <div className="p-4 border-t border-slate-200 dark:border-white/[0.06] space-y-4 bg-slate-50 dark:bg-black/10 text-xs">
                    {/* 1. Jerarquía Vertical (Padre Único) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{t('itemModal.relationsParent')}</span>
                      </label>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-1.5">
                        {t('itemModal.relationsParentDesc')}
                      </p>
                      <div className="relative">
                        <select
                          value={parentId}
                          onChange={(e) => setParentId(e.target.value)}
                          className="appearance-none w-full px-3 py-2 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="" className="bg-white dark:bg-[#0e1626]">{t('itemModal.relationsNoParent')}</option>
                          {candidateParents.map((cand) => (
                            <option key={cand.id} value={cand.code || cand.id} className="bg-white dark:bg-[#0e1626]">
                              [{cand.type.toUpperCase()}] {cand.code || cand.id}: {cand.title.slice(0, 50)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* 2. Bloqueado Por (Blocked By) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>{t('itemModal.relationsBlockedBy')}</span>
                        </label>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('itemModal.relationsBlockedByDesc')}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-1">
                          <select
                            className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500/50"
                            defaultValue=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !blockedBy.includes(val)) {
                                setBlockedBy([...blockedBy, val]);
                              }
                              e.target.value = '';
                            }}
                          >
                            <option value="" className="bg-white dark:bg-[#0e1626]">{t('itemModal.relationsAddBlocker')}</option>
                            {otherItems.filter(it => !blockedBy.includes(it.code || it.id)).map(it => (
                              <option key={it.id} value={it.code || it.id} className="bg-white dark:bg-[#0e1626]">
                                {it.code || it.id} - {it.title.slice(0, 45)} ({it.status})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      {blockedBy.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {blockedBy.map(bCode => (
                            <span key={bCode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[11px]">
                              <span>⛔ {bCode}</span>
                              <button
                                type="button"
                                onClick={() => setBlockedBy(blockedBy.filter(c => c !== bCode))}
                                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-white ml-0.5"
                                title={t('itemModal.relationsRemoveBlocker')}
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Bloquea A (Blocks) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{t('itemModal.relationsBlocks')}</span>
                        </label>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('itemModal.relationsBlocksDesc')}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-1">
                          <select
                            className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500/50"
                            defaultValue=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !blocks.includes(val)) {
                                setBlocks([...blocks, val]);
                              }
                              e.target.value = '';
                            }}
                          >
                            <option value="" className="bg-white dark:bg-[#0e1626]">{t('itemModal.relationsAddBlocked')}</option>
                            {otherItems.filter(it => !blocks.includes(it.code || it.id)).map(it => (
                              <option key={it.id} value={it.code || it.id} className="bg-white dark:bg-[#0e1626]">
                                {it.code || it.id} - {it.title.slice(0, 45)} ({it.status})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      {blocks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {blocks.map(bCode => (
                            <span key={bCode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px]">
                              <span>⚠️ {bCode}</span>
                              <button
                                type="button"
                                onClick={() => setBlocks(blocks.filter(c => c !== bCode))}
                                className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-white ml-0.5"
                                title={t('itemModal.relationsRemoveBlocks')}
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Relacionado Con (Related To) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{t('itemModal.relationsRelatedTo')}</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-1">
                          <select
                            className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                            defaultValue=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !relatedTo.includes(val)) {
                                setRelatedTo([...relatedTo, val]);
                              }
                              e.target.value = '';
                            }}
                          >
                            <option value="" className="bg-white dark:bg-[#0e1626]">{t('itemModal.relationsAddRelated')}</option>
                            {otherItems.filter(it => !relatedTo.includes(it.code || it.id)).map(it => (
                              <option key={it.id} value={it.code || it.id} className="bg-white dark:bg-[#0e1626]">
                                {it.code || it.id} - {it.title.slice(0, 45)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      {relatedTo.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {relatedTo.map(rCode => (
                            <span key={rCode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[11px]">
                              <span>🔗 {rCode}</span>
                              <button
                                type="button"
                                onClick={() => setRelatedTo(relatedTo.filter(c => c !== rCode))}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white ml-0.5"
                                title={t('itemModal.relationsRemoveBlocks')}
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (33%): Sidebar "Atributos del Ítem" */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] p-4 space-y-3.5 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex items-center pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('itemModal.sidebarTitle')}</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{t('itemModal.statusLabel')}</label>
                  <div className="relative">
                    <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ItemStatus)}
                    className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 font-medium"
                    >
                    <option value="ideas" className="bg-white dark:bg-[#0e1626]">💡 {t('status.ideas')}</option>
                    <option value="draft" className="bg-white dark:bg-[#0e1626]">{t('status.draft')}</option>
                    <option value="doing" className="bg-white dark:bg-[#0e1626]">{t('status.doing')}</option>
                    <option value="review" className="bg-white dark:bg-[#0e1626]">{t('status.review')}</option>
                    <option value="ready" className="bg-white dark:bg-[#0e1626]">{t('status.ready')}</option>
                    <option value="done" className="bg-white dark:bg-[#0e1626]">{t('status.done')}</option>
                    <option value="dismissed" className="bg-white dark:bg-[#0e1626]">{t('status.dismissed')}</option>
                    <option value="cancelled" className="bg-white dark:bg-[#0e1626]">{t('status.cancelled')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Priority & Type */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{t('itemModal.priorityLabel')}</label>
                    <div className="relative">
                      <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      >
                      <option value="p0" className="bg-white dark:bg-[#0e1626] text-rose-600 dark:text-rose-400">{t('priority.urgent')} 🔴</option>
                      <option value="p1" className="bg-white dark:bg-[#0e1626] text-amber-600 dark:text-amber-400">{t('priority.high')} 🟠</option>
                      <option value="p2" className="bg-white dark:bg-[#0e1626] text-yellow-600 dark:text-yellow-400">{t('priority.medium')} 🟡</option>
                      <option value="p3" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400">{t('priority.low')} ⚪</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{t('itemModal.typeLabel')}</label>
                    <div className="relative">
                      <select
                      value={type}
                      onChange={(e) => setType(e.target.value as ItemType)}
                      className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      >
                      <option value="bug" className="bg-white dark:bg-[#0e1626]">🐛 {t('type.bug')}</option>
                      <option value="feature" className="bg-white dark:bg-[#0e1626]">🚀 {t('type.feature')}</option>
                      <option value="tech_debt" className="bg-white dark:bg-[#0e1626]">🛠️ {t('type.tech_debt')}</option>
                      <option value="ux" className="bg-white dark:bg-[#0e1626]">🎨 {t('type.ux')}</option>
                      <option value="epic" className="bg-white dark:bg-[#0e1626]">📚 {t('type.epic')}</option>
                      <option value="initiative" className="bg-white dark:bg-[#0e1626]">⚡ {t('type.initiative')}</option>
                      {config?.customItemTypes && config.customItemTypes.length > 0 && (
                      <optgroup label={t('itemModal.customTypesGroup')}>
                      {config.customItemTypes.map((ct) => (
                      <option key={ct.key} value={ct.key} className="bg-white dark:bg-[#0e1626]">
                      🏷️ {ct.label}
                      </option>
                      ))}
                      </optgroup>
                      )}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Sprint & Multi-Release (DEV-056, DEV-077, DEV-087) */}
                <div className="space-y-3">
                  {config?.methodology !== 'kanban' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">{t('itemModal.sprintLabel')}</label>
                        <button
                          type="button"
                          onClick={() => setCustomSprintMode(prev => !prev)}
                          className="text-[10px] text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                          {customSprintMode ? t('itemModal.useList') : t('itemModal.writeManual')}
                        </button>
                      </div>

                      {customSprintMode ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={sprint}
                            onChange={(e) => setSprint(e.target.value)}
                            placeholder="Ej: Sprint 5"
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                          />
                          {sprint && (
                            <button
                              type="button"
                              onClick={() => setSprint('')}
                              className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Quitar sprint"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={sprint}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setCustomSprintMode(true);
                              } else {
                                setSprint(e.target.value);
                              }
                            }}
                            className="w-full appearance-none px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 cursor-pointer font-medium"
                          >
                            <option value="" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400">{t('itemModal.noSprintBacklog')}</option>
                            {sprints.length > 0 ? (
                              <>
                                {sprints.map((s) => (
                                  <option key={s.id} value={s.name} className="bg-white dark:bg-[#0e1626]">
                                    {s.name} {s.status === 'active' ? '🟢 (Activo)' : s.status === 'planned' ? '🟡 (Planificado)' : '⚪ (Completado)'}
                                  </option>
                                ))}
                              </>
                            ) : (
                              availableSprints.map((s) => (
                                <option key={s} value={s} className="bg-white dark:bg-[#0e1626]">
                                  {s}
                                </option>
                              ))
                            )}
                            <option value="__custom__" className="bg-white dark:bg-[#0e1626] text-indigo-600 dark:text-indigo-400">
                              {t('itemModal.otherManualSprint')}
                            </option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      )}

                      {/* Quick assignment chips */}
                      {(() => {
                        const activeSp = sprints.find(s => s.status === 'active');
                        const plannedSps = sprints.filter(s => s.status === 'planned');
                        return (
                          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                            {activeSp && sprint !== activeSp.name && (
                              <button
                                type="button"
                                onClick={() => { setSprint(activeSp.name); setCustomSprintMode(false); }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                              >
                                🟢 {activeSp.name}
                              </button>
                            )}
                            {plannedSps.filter(ps => ps.name !== sprint).slice(0, 2).map(ps => (
                              <button
                                key={ps.id}
                                type="button"
                                onClick={() => { setSprint(ps.name); setCustomSprintMode(false); }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                              >
                                🟡 {ps.name}
                              </button>
                            ))}
                            {sprint && (
                              <button
                                type="button"
                                onClick={() => { setSprint(''); setCustomSprintMode(false); }}
                                className="px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                              >
                                {t('itemModal.noSprintChip')}
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Historial de Sprints Cerrados (DEV-056 AC #1 & #3) */}
                      {item?.sprints && item.sprints.filter(s => s !== sprint).length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <History className="w-3 h-3 text-slate-600 dark:text-slate-500" />
                            {t('itemModal.historyLabel')}
                          </span>
                          {item.sprints.filter(s => s !== sprint).map(histSp => (
                            <span key={histSp} className="px-1.5 py-0.2 rounded text-[9px] bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300">
                              {histSp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-version Releases (DEV-056, DEV-077, DEV-087, DEV-091) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{t('itemModal.releaseLabel')}</label>
                      {selectedReleases.length > 1 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80">{t('itemModal.multiRelease', { count: selectedReleases.length })}</span>
                      )}
                    </div>
                    <div>
                      {customReleaseMode ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customReleaseInput}
                            onChange={(e) => setCustomReleaseInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = customReleaseInput.trim().replace(/^v/i, '');
                                if (val) {
                                  if (!selectedReleases.includes(val)) {
                                    setSelectedReleases([...selectedReleases, val]);
                                  }
                                  setRelease(val);
                                  setCustomReleaseInput('');
                                  setCustomReleaseMode(false);
                                }
                              }
                            }}
                            placeholder="Ej: 0.6.0 (Enter para aplicar)"
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-emerald-500/30 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/60"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = customReleaseInput.trim().replace(/^v/i, '');
                              if (val) {
                                if (!selectedReleases.includes(val)) {
                                  setSelectedReleases([...selectedReleases, val]);
                                }
                                setRelease(val);
                                setCustomReleaseInput('');
                              }
                              setCustomReleaseMode(false);
                            }}
                            className="px-2 py-1.5 rounded-lg text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 font-medium"
                          >
                            {t('common.apply')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomReleaseMode(false);
                              setCustomReleaseInput('');
                            }}
                            className="px-2 py-1.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                            title="Volver a lista"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={release || (selectedReleases.length > 0 ? selectedReleases[0] : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__custom__') {
                                setCustomReleaseMode(true);
                                setCustomReleaseInput('');
                              } else if (!val) {
                                setRelease('');
                                setSelectedReleases([]);
                              } else {
                                setRelease(val);
                                if (!selectedReleases.includes(val)) {
                                  setSelectedReleases([val]);
                                }
                              }
                            }}
                            className="w-full appearance-none px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer font-medium"
                          >
                            <option value="" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400 font-sans">{t('itemModal.noRelease')}</option>
                            {(() => {
                              const officialUnrel = releases.filter(r => r.status === 'unreleased');
                              const officialRel = releases.filter(r => r.status === 'released');
                              const customRels = selectedReleases.filter(sr => !releases.some(r => r.version === sr) && !availableReleases.includes(sr));
                              return (
                                <>
                                  {officialUnrel.length > 0 && (
                                    <optgroup label={t('itemModal.plannedReleasesGroup')}>
                                      {officialUnrel.map(r => (
                                        <option key={r.id || r.version} value={r.version} className="bg-white dark:bg-[#0e1626]">
                                          v{r.version} 🟡 (En curso)
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {officialRel.length > 0 && (
                                    <optgroup label={t('itemModal.releasedGroup')}>
                                      {officialRel.map(r => (
                                        <option key={r.id || r.version} value={r.version} className="bg-white dark:bg-[#0e1626]">
                                          v{r.version} 🟢 (Liberado)
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {releases.length === 0 && availableReleases.map(r => (
                                    <option key={r} value={r} className="bg-white dark:bg-[#0e1626]">
                                      v{r}
                                    </option>
                                  ))}
                                  {customRels.length > 0 && (
                                    <optgroup label={t('itemModal.customReleaseGroup')}>
                                      {customRels.map(sr => (
                                        <option key={sr} value={sr} className="bg-white dark:bg-[#0e1626] text-amber-700 dark:text-amber-300">
                                          v{sr} (Personalizada)
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </>
                              );
                            })()}
                            <option value="__custom__" className="bg-white dark:bg-[#0e1626] text-emerald-600 dark:text-emerald-400 font-sans">
                              {t('itemModal.otherManualRelease')}
                            </option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      )}

                      {/* Quick assignment chips and active chips */}
                      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                        {selectedReleases.map((rel) => (
                          <span
                            key={rel}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                          >
                            v{rel}
                            <button
                              type="button"
                              onClick={() => {
                                const next = selectedReleases.filter(r => r !== rel);
                                setSelectedReleases(next);
                                if (release === rel) setRelease(next[0] || '');
                              }}
                              className="hover:text-red-700 dark:hover:text-red-300 transition-colors ml-0.5"
                              title={`Quitar v${rel}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}

                        {/* Chips rápidos de versiones oficiales en curso */}
                        {(() => {
                          const officialUnrel = releases.filter(r => r.status === 'unreleased');
                          return officialUnrel
                            .filter(r => !selectedReleases.includes(r.version))
                            .map(r => (
                              <button
                                key={r.id || r.version}
                                type="button"
                                onClick={() => {
                                  setRelease(r.version);
                                  setSelectedReleases([r.version]);
                                  setCustomReleaseMode(false);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                              >
                                + v{r.version}
                              </button>
                            ));
                        })()}

                        {(release || selectedReleases.length > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setRelease('');
                              setSelectedReleases([]);
                              setCustomReleaseMode(false);
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                          >
                            {t('itemModal.noReleaseChip')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignees (Asignados) - DEV-111 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{t('itemModal.assigneesLabel')}</span>
                    </label>
                    {assignees.length > 0 && (
                      <span className="text-[10px] text-slate-600 dark:text-slate-500">
                        {assignees.length === 1 ? t('itemModal.assigneeCountSingle') : t('itemModal.assigneeCountMulti', { count: assignees.length })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={assigneeInput}
                      onChange={(e) => setAssigneeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAssignee();
                        }
                      }}
                      placeholder="Ej: Claude Code, Cursor, Copilot, Antigravity..."
                      list="assignees-autocomplete-list"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                    <datalist id="assignees-autocomplete-list">
                      {availableAssignees.filter(a => !assignees.includes(a)).map(a => (
                        <option key={a} value={a} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200" />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={() => handleAddAssignee()}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                      title="Agregar asignado"
                    >
                      +
                    </button>
                  </div>
                  {assignees.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                      {assignees.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                        >
                          <span>👤 {a}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignee(a)}
                            className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-0.5 text-xs leading-none"
                            title={`Quitar ${a}`}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Labels (Etiquetas) - DEV-111 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{t('itemModal.labelsLabel')}</span>
                    </label>
                    {labels.length > 0 && (
                      <span className="text-[10px] text-slate-600 dark:text-slate-500">
                        {labels.length === 1 ? t('itemModal.tagCountSingle') : t('itemModal.tagCountMulti', { count: labels.length })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddLabel();
                        }
                      }}
                      placeholder="Ej: cli, frontend, bugfix... (Enter o coma)"
                      list="labels-autocomplete-list"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                    <datalist id="labels-autocomplete-list">
                      {availableLabels.filter(l => !labels.includes(l)).map(l => (
                        <option key={l} value={l} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200" />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={() => handleAddLabel()}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                      title="Agregar etiqueta"
                    >
                      +
                    </button>
                  </div>
                  {labels.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                      {labels.map((l) => (
                        <span
                          key={l}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        >
                          <span>🏷️ {l}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(l)}
                            className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-0.5 text-xs leading-none"
                            title={`Quitar ${l}`}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Module & Code */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{t('itemModal.moduleLabel')}</label>
                    <input
                      type="text"
                      value={module}
                      onChange={(e) => setModule(e.target.value)}
                      placeholder="Ej: UI / Layout"
                      list="modules-list"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                    <datalist id="modules-list">
                      {availableModules.map((m) => (
                        <option key={m} value={m} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200" />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{t('itemModal.codeLabel')}</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Auto-generado"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Impacted File */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{t('itemModal.impactedFileLabel')}</label>
                  <input
                    type="text"
                    value={impactedFile}
                    onChange={(e) => setImpactedFile(e.target.value)}
                    placeholder="src/components/Header.tsx"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Project selector if multiple projects */}
                {projects.length > 1 && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">{t('itemModal.projectLabel')}</label>
                    <div className="relative">
                      <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="appearance-none w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      >
                      {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-[#0e1626]">
                      {p.name} ({p.codePrefix})
                      </option>
                      ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Technical Risk & Fix Accordion */}
                <div className="pt-1 border-t border-slate-200 dark:border-white/[0.06]">
                  <div 
                    onClick={() => setRiskFixExpanded(!riskFixExpanded)}
                    className="flex items-center justify-between cursor-pointer py-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{t('itemModal.riskFixTitle')}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${riskFixExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </div>

                  {riskFixExpanded && (
                    <div className="space-y-2.5 pt-2">
                      <div>
                        <label className="block text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">
                          {t('itemModal.riskLabel')}
                        </label>
                        <textarea
                          value={risk}
                          onChange={(e) => setRisk(e.target.value)}
                          rows={2}
                          placeholder={t('itemModal.riskPlaceholder')}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                          {t('itemModal.fixLabel')}
                        </label>
                        <textarea
                          value={fix}
                          onChange={(e) => setFix(e.target.value)}
                          rows={2}
                          placeholder={t('itemModal.fixPlaceholder')}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.01] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400/90 hover:bg-rose-500/10 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('common.delete')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors active:scale-[0.98]"
            >
              {t('itemModal.cancelShortcut')}
            </button>
            <button
              type="button"
              onClick={() => handleFormSubmit(false)}
              disabled={isSaving || !title.trim()}
              className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? t('common.saving') : t('itemModal.saveShortcut')}</span>
            </button>
          </div>
        </div>

      </div>

      {item && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={t('itemModal.moveToTrash')}
          message={t('itemModal.deletePrompt', { code: item.code })}
          detail={item.title}
          confirmText={t('itemModal.moveToTrash')}
          variant="danger"
          onConfirm={async () => {
            if (onDelete) {
              await onDelete(item.id);
              onClose();
            }
          }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};
