import { useState, useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import type { BacklogItem, ItemStatus, ItemType, Priority, Project, AcceptanceCriterion, GripmConfig, Sprint, Release } from '../types';
import { isSprintModuleActive } from '../types';
import { buildCriterionExample } from '../components/item-modal/acExamples';
import { parseItemToFormValues, getInitialFormValues, ItemFormValues } from '../components/item-modal/itemFormDefaults';
import { useParentCombobox } from '../components/item-modal/useParentCombobox';
import { useFormChips } from '../components/item-modal/useFormChips';
import { exportToGoogleCalendar, downloadIcsFile } from '../components/item-modal/calendarExport';
import { buildSavePayload } from '../components/item-modal/buildSavePayload';

export interface UseItemFormStateProps {
  isOpen: boolean;
  onClose: () => void;
  item: BacklogItem | null;
  defaultStatus?: ItemStatus;
  defaultSprint?: string;
  projects: Project[];
  availableModules: string[];
  sprints?: Sprint[];
  releases?: Release[];
  onSave: (itemData: Partial<BacklogItem> & { expectedMtime?: number; force?: boolean }) => Promise<void>;
  activeProjectId?: string;
  config?: GripmConfig;
  allItems?: BacklogItem[];
}

export function useItemFormState({
  isOpen,
  onClose,
  item,
  defaultStatus = 'draft',
  defaultSprint = '',
  projects,
  availableModules,
  sprints = [],
  releases: _releases = [],
  onSave,
  activeProjectId,
  config,
  allItems = [],
}: UseItemFormStateProps) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [projectId, setProjectId] = useState(activeProjectId || projects[0]?.id || '');
  const [type, setType] = useState<ItemType>('feature');
  const [priority, setPriority] = useState<Priority>('p2');
  const [status, setStatus] = useState<ItemStatus>(defaultStatus);
  const {
    selectedModules,
    setSelectedModules,
    moduleInput,
    setModuleInput,
    labels,
    setLabels,
    labelInput,
    setLabelInput,
    assignees,
    setAssignees,
    assigneeInput,
    setAssigneeInput,
    allCandidateModules,
    handleAddModule,
    handleRemoveModule,
    handleAddLabel,
    handleRemoveLabel,
    handleAddAssignee,
    handleRemoveAssignee,
  } = useFormChips(config, availableModules);
  const module = selectedModules[0] || '';
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
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictItem, setConflictItem] = useState<BacklogItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [estimate, setEstimate] = useState<string | number | undefined>(undefined);
  const [customEstimateInput, setCustomEstimateInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const [childTasksExpanded, setChildTasksExpanded] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const calendarMenuRef = useRef<HTMLDivElement>(null);

  // Accordion expansion states
  const [acExpanded, setAcExpanded] = useState(true);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [riskFixExpanded, setRiskFixExpanded] = useState(false);
  const [relationsExpanded, setRelationsExpanded] = useState(false);
  const [customSprintMode, setCustomSprintMode] = useState(false);
  const [customReleaseMode, setCustomReleaseMode] = useState(false);
  const [customReleaseInput, setCustomReleaseInput] = useState('');
  const isSprintModule = isSprintModuleActive(config);

  const currentId = item?.id || '';
  const currentCode = item?.code || '';
  const otherItems = useMemo(
    () => (allItems || []).filter((it) => it.id !== currentId && it.code !== currentCode),
    [allItems, currentId, currentCode]
  );
  const candidateParents = useMemo(
    () => otherItems.filter((it) => it.type === 'epic' || it.type === 'initiative'),
    [otherItems]
  );
  const childTasks = useMemo(
    () =>
      otherItems.filter(
        (it) =>
          (currentId && (it.parentId === currentId || it.epic === currentId)) ||
          (currentCode && (it.parentId === currentCode || it.epic === currentCode))
      ),
    [otherItems, currentId, currentCode]
  );
  const showChildTasks = type === 'epic' || type === 'initiative' || childTasks.length > 0;

  const formatRelation = (relationId: string) => {
    const relatedItem = otherItems.find((it) => it.code === relationId || it.id === relationId);
    return relatedItem ? `${relatedItem.code || relatedItem.id} · ${relatedItem.title}` : relationId;
  };

  const availableLabels = useMemo(
    () => Array.from(new Set(allItems.flatMap((it) => it.labels || []))).filter(Boolean),
    [allItems]
  );
  const availableAssignees = useMemo(
    () => Array.from(new Set(allItems.flatMap((it) => it.assignees || []))).filter(Boolean),
    [allItems]
  );

  const {
    parentSearchQuery,
    setParentSearchQuery,
    isParentDropdownOpen,
    setIsParentDropdownOpen,
    parentDropdownContainerRef,
    parentSearchInputRef,
    filteredCandidateParents,
  } = useParentCombobox(candidateParents);

  const isLegacyParent = Boolean(
    parentId && !candidateParents.some((cand) => (cand.code || cand.id) === parentId || cand.id === parentId)
  );
  const selectedParentItem = candidateParents.find(
    (c) => (c.code || c.id) === parentId || c.id === parentId
  );

  useEffect(() => {
    if (!calendarMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(e.target as Node)) {
        setCalendarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarMenuOpen]);

  const applyFormValues = (v: ItemFormValues) => {
    setTitle(v.title);
    setCode(v.code);
    setProjectId(v.projectId);
    setType(v.type);
    setPriority(v.priority);
    setStatus(v.status);
    setSelectedModules(v.selectedModules);
    setModuleInput('');
    setImpactedFile(v.impactedFile);
    setSprint(v.sprint);
    setRelease(v.release);
    setSelectedReleases(v.selectedReleases);
    setCustomReleaseMode(false);
    setCustomReleaseInput('');
    setParentId(v.parentId);
    setBlocks(v.blocks);
    setBlockedBy(v.blockedBy);
    setRelatedTo(v.relatedTo);
    setDescription(v.description);
    setRisk(v.risk);
    setFix(v.fix);
    setImplementationPlan(v.implementationPlan);
    setAcceptanceCriteriaList(v.acceptanceCriteriaList);
    setEstimate(v.estimate);
    setCustomEstimateInput(v.customEstimateInput);
    setStartDate(v.startDate);
    setDueDate(v.dueDate);
    setLabels(v.labels);
    setLabelInput('');
    setAssignees(v.assignees);
    setAssigneeInput('');
    setAcExpanded(v.acExpanded);
    setPlanExpanded(v.planExpanded);
    setRiskFixExpanded(v.riskFixExpanded);
    setRelationsExpanded(v.relationsExpanded);
  };

  const reloadFromItem = (source: BacklogItem) => {
    applyFormValues(parseItemToFormValues(source, projects, activeProjectId, config));
  };

  const prevIsOpenRef = useRef(false);
  const prevItemIdRef = useRef<string | null>(null);

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
        applyFormValues(parseItemToFormValues(item, projects, activeProjectId, config));
      } else {
        applyFormValues(getInitialFormValues(projects, defaultStatus, defaultSprint, activeProjectId));
      }
    }
  }, [isOpen, item, defaultStatus, defaultSprint, activeProjectId, projects, config]);

  const handleFormSubmit = async (force = false) => {
    if (!title.trim()) {
      setFormError('Por favor especifica un título para el ítem');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      const payload = buildSavePayload({
        item,
        title,
        code,
        projectId,
        type,
        priority,
        status,
        selectedModules,
        impactedFile,
        sprint,
        release,
        selectedReleases,
        parentId,
        blocks,
        blockedBy,
        relatedTo,
        description,
        risk,
        fix,
        implementationPlan,
        acceptanceCriteriaList,
        labels,
        assignees,
        estimate,
        startDate,
        dueDate,
        force,
      });
      await onSave(payload);
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
    const nextIndex =
      acceptanceCriteriaList.length > 0
        ? Math.max(...acceptanceCriteriaList.map((c) => c.index)) + 1
        : 1;
    setAcceptanceCriteriaList([
      ...acceptanceCriteriaList,
      { index: nextIndex, text: '', checked: false },
    ]);
  };

  const handleUpdateCriterionText = (index: number, text: string) => {
    setAcceptanceCriteriaList(
      acceptanceCriteriaList.map((c) => (c.index === index ? { ...c, text } : c))
    );
  };

  const handleToggleCriterion = (index: number) => {
    setAcceptanceCriteriaList(
      acceptanceCriteriaList.map((c) => (c.index === index ? { ...c, checked: !c.checked } : c))
    );
  };

  const handleRemoveCriterion = (index: number) => {
    setAcceptanceCriteriaList(acceptanceCriteriaList.filter((c) => c.index !== index));
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const codeToCopy = code || item?.code || item?.id;
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleExportGoogleCalendar = () => {
    exportToGoogleCalendar({
      item,
      code,
      title,
      status,
      priority,
      sprint,
      description,
      acceptanceCriteriaList,
      sprints,
    });
  };

  const handleDownloadIcs = () => {
    downloadIcsFile({
      item,
      code,
      title,
      status,
      priority,
      sprint,
      description,
      acceptanceCriteriaList,
      sprints,
    });
  };

  const acChecked = acceptanceCriteriaList.filter((c) => c.checked).length;
  const acTotal = acceptanceCriteriaList.length;
  const criterionExample = buildCriterionExample(type, title, module);
  const planExample = impactedFile.trim()
    ? `1. Modificar ${impactedFile.trim()}...&#10;2. Ajustar tipos, contrato de datos y tests...&#10;3. Ejecutar tsc, npm test y backlog:check...`
    : '1. Modificar el archivo afectado...&#10;2. Ajustar tipos, contrato de datos y tests...&#10;3. Ejecutar tsc, npm test y backlog:check...';

  return {
    title,
    setTitle,
    code,
    setCode,
    projectId,
    setProjectId,
    type,
    setType,
    priority,
    setPriority,
    status,
    setStatus,
    selectedModules,
    setSelectedModules,
    moduleInput,
    setModuleInput,
    module,
    impactedFile,
    setImpactedFile,
    sprint,
    setSprint,
    release,
    setRelease,
    selectedReleases,
    setSelectedReleases,
    parentId,
    setParentId,
    blocks,
    setBlocks,
    blockedBy,
    setBlockedBy,
    relatedTo,
    setRelatedTo,
    description,
    setDescription,
    risk,
    setRisk,
    fix,
    setFix,
    implementationPlan,
    setImplementationPlan,
    acceptanceCriteriaList,
    setAcceptanceCriteriaList,
    labels,
    setLabels,
    labelInput,
    setLabelInput,
    assignees,
    setAssignees,
    assigneeInput,
    setAssigneeInput,
    isSaving,
    formError,
    setFormError,
    conflictItem,
    setConflictItem,
    showDeleteConfirm,
    setShowDeleteConfirm,
    estimate,
    setEstimate,
    customEstimateInput,
    setCustomEstimateInput,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    calendarMenuOpen,
    setCalendarMenuOpen,
    childTasksExpanded,
    setChildTasksExpanded,
    copiedCode,
    calendarMenuRef,
    acExpanded,
    setAcExpanded,
    planExpanded,
    setPlanExpanded,
    riskFixExpanded,
    setRiskFixExpanded,
    relationsExpanded,
    setRelationsExpanded,
    customSprintMode,
    setCustomSprintMode,
    customReleaseMode,
    setCustomReleaseMode,
    customReleaseInput,
    setCustomReleaseInput,
    isSprintModule,
    currentId,
    currentCode,
    otherItems,
    candidateParents,
    childTasks,
    showChildTasks,
    formatRelation,
    availableLabels,
    availableAssignees,
    parentSearchQuery,
    setParentSearchQuery,
    isParentDropdownOpen,
    setIsParentDropdownOpen,
    parentDropdownContainerRef,
    parentSearchInputRef,
    isLegacyParent,
    selectedParentItem,
    filteredCandidateParents,
    allCandidateModules,
    acChecked,
    acTotal,
    criterionExample,
    planExample,
    handleFormSubmit,
    handleAddCriterion,
    handleUpdateCriterionText,
    handleToggleCriterion,
    handleRemoveCriterion,
    handleAddModule,
    handleRemoveModule,
    handleAddLabel,
    handleRemoveLabel,
    handleAddAssignee,
    handleRemoveAssignee,
    handleCopyCode,
    handleExportGoogleCalendar,
    handleDownloadIcs,
    reloadFromItem,
  };
}
