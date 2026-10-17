import type { FC } from 'react';
import {
  X,
  Save,
  Trash2,
  Sparkles,
  Check,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Calendar,
  Download,
  ExternalLink,
} from 'lucide-react';
import type { BacklogItem, ItemStatus, Project, GripmConfig, Sprint, Release } from '../types';
import { isCalendarModuleActive } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useTranslation } from '../utils/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Modal } from './Modal';
import { useItemFormState } from '../hooks/useItemFormState';
import { ItemDescriptionPanel } from './item-modal/ItemDescriptionPanel';
import { AcceptanceCriteriaPanel } from './item-modal/AcceptanceCriteriaPanel';
import { ItemRelationsPanel } from './item-modal/ItemRelationsPanel';
import { ItemSidebarMetadata } from './item-modal/ItemSidebarMetadata';

export interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BacklogItem | null;
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
  onUnlinkChild?: (childId: string) => Promise<void>;
  activeProjectId?: string;
  config?: GripmConfig;
  allItems?: BacklogItem[];
}

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
  onUnlinkChild,
  activeProjectId,
  config,
  allItems = [],
}) => {
  const { t, language } = useTranslation();
  const isEditing = !!item;

  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  const form = useItemFormState({
    isOpen,
    onClose,
    item,
    defaultStatus,
    defaultSprint,
    projects,
    availableModules,
    sprints,
    releases,
    onSave,
    activeProjectId,
    config,
    allItems,
  });

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        panelRef={panelRef}
        maxWidth="max-w-6xl"
        className="max-h-[94vh] sm:max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isEditing ? `${t('itemModal.editTitle')} ${item.code}` : t('itemModal.createTitle')}
                </h2>
                {isEditing && (
                  <button
                    type="button"
                    onClick={form.handleCopyCode}
                    aria-label={`${t('itemModal.copyId')} ${item.code}`}
                    title={t('itemModal.copyId')}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] transition-colors"
                  >
                    {form.copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{form.copiedCode ? t('itemModal.copiedToClipboard') : item.code}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {isEditing ? t('itemModal.editSubtitle') : t('itemModal.createSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && isCalendarModuleActive(config) && (
              <div className="relative" ref={form.calendarMenuRef}>
                <button
                  type="button"
                  onClick={() => form.setCalendarMenuOpen(!form.calendarMenuOpen)}
                  aria-label={t('itemModal.calendarExport')}
                  title={t('itemModal.calendarExport')}
                  className="h-9 px-2.5 flex items-center gap-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/[0.08] text-xs font-medium transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">{t('itemModal.calendarExport')}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {form.calendarMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white dark:bg-[#131c2f] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        form.handleExportGoogleCalendar();
                        form.setCalendarMenuOpen(false);
                      }}
                      aria-label={t('itemModal.calendarGoogle')}
                      title={t('itemModal.calendarGoogle')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t('itemModal.calendarGoogle')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        form.handleDownloadIcs();
                        form.setCalendarMenuOpen(false);
                      }}
                      aria-label={t('itemModal.calendarIcs')}
                      title={t('itemModal.calendarIcs')}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('itemModal.calendarIcs')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

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
        </div>

        {/* Modal Body - 2-Column Linear-style Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {form.conflictItem && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs flex flex-col gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {t('itemModal.conflictNotice')}
                  </span>{' '}
                  {t('itemModal.conflictDesc')}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    form.reloadFromItem(form.conflictItem!);
                    form.setConflictItem(null);
                    form.setFormError(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('itemModal.reloadDisk')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => form.handleFormSubmit(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 dark:text-slate-950 font-semibold text-xs transition-colors"
                >
                  {t('itemModal.overwriteAnyway')}
                </button>
              </div>
            </div>
          )}

          {form.formError && !form.conflictItem && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{form.formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (67%): Main Content */}
            <div className="lg:col-span-8 space-y-5">
              <ItemDescriptionPanel
                title={form.title}
                setTitle={form.setTitle}
                description={form.description}
                setDescription={form.setDescription}
                implementationPlan={form.implementationPlan}
                setImplementationPlan={form.setImplementationPlan}
                planExpanded={form.planExpanded}
                setPlanExpanded={form.setPlanExpanded}
                planExample={form.planExample}
              />

              <AcceptanceCriteriaPanel
                acceptanceCriteriaList={form.acceptanceCriteriaList}
                setAcceptanceCriteriaList={form.setAcceptanceCriteriaList}
                acExpanded={form.acExpanded}
                setAcExpanded={form.setAcExpanded}
                acChecked={form.acChecked}
                acTotal={form.acTotal}
                criterionExample={form.criterionExample}
                handleAddCriterion={form.handleAddCriterion}
                handleUpdateCriterionText={form.handleUpdateCriterionText}
                handleToggleCriterion={form.handleToggleCriterion}
                handleRemoveCriterion={form.handleRemoveCriterion}
              />

              <ItemRelationsPanel
                relationsExpanded={form.relationsExpanded}
                setRelationsExpanded={form.setRelationsExpanded}
                parentId={form.parentId}
                setParentId={form.setParentId}
                blocks={form.blocks}
                setBlocks={form.setBlocks}
                blockedBy={form.blockedBy}
                setBlockedBy={form.setBlockedBy}
                relatedTo={form.relatedTo}
                setRelatedTo={form.setRelatedTo}
                formatRelation={form.formatRelation}
                otherItems={form.otherItems}
                showChildTasks={form.showChildTasks}
                childTasksExpanded={form.childTasksExpanded}
                setChildTasksExpanded={form.setChildTasksExpanded}
                childTasks={form.childTasks}
                onUnlinkChild={onUnlinkChild}
                t={t}
              />
            </div>

            {/* Right Column (33%): Sidebar Metadata */}
            <ItemSidebarMetadata
              statusTypeProps={{
                status: form.status,
                setStatus: form.setStatus,
                blockedReason: form.blockedReason,
                setBlockedReason: form.setBlockedReason,
                dismissedReason: form.dismissedReason,
                setDismissedReason: form.setDismissedReason,
                priority: form.priority,
                setPriority: form.setPriority,
                type: form.type,
                setType: form.setType,
                config,
                estimate: form.estimate,
                setEstimate: form.setEstimate,
                customEstimateInput: form.customEstimateInput,
                setCustomEstimateInput: form.setCustomEstimateInput,
                t,
              }}
              scheduleProps={{
                isSprintModule: form.isSprintModule,
                sprint: form.sprint,
                setSprint: form.setSprint,
                customSprintMode: form.customSprintMode,
                setCustomSprintMode: form.setCustomSprintMode,
                sprints,
                availableSprints,
                item,
                release: form.release,
                setRelease: form.setRelease,
                selectedReleases: form.selectedReleases,
                setSelectedReleases: form.setSelectedReleases,
                customReleaseMode: form.customReleaseMode,
                setCustomReleaseMode: form.setCustomReleaseMode,
                customReleaseInput: form.customReleaseInput,
                setCustomReleaseInput: form.setCustomReleaseInput,
                releases,
                availableReleases,
                startDate: form.startDate,
                setStartDate: form.setStartDate,
                dueDate: form.dueDate,
                setDueDate: form.setDueDate,
                t,
              }}
              attributesProps={{
                assignees: form.assignees,
                assigneeInput: form.assigneeInput,
                setAssigneeInput: form.setAssigneeInput,
                handleAddAssignee: form.handleAddAssignee,
                handleRemoveAssignee: form.handleRemoveAssignee,
                availableAssignees: form.availableAssignees,
                labels: form.labels,
                labelInput: form.labelInput,
                setLabelInput: form.setLabelInput,
                handleAddLabel: form.handleAddLabel,
                handleRemoveLabel: form.handleRemoveLabel,
                availableLabels: form.availableLabels,
                parentId: form.parentId,
                setParentId: form.setParentId,
                isParentDropdownOpen: form.isParentDropdownOpen,
                setIsParentDropdownOpen: form.setIsParentDropdownOpen,
                parentDropdownContainerRef: form.parentDropdownContainerRef,
                parentSearchInputRef: form.parentSearchInputRef,
                parentSearchQuery: form.parentSearchQuery,
                setParentSearchQuery: form.setParentSearchQuery,
                selectedParentItem: form.selectedParentItem,
                isLegacyParent: form.isLegacyParent,
                formatRelation: form.formatRelation,
                filteredCandidateParents: form.filteredCandidateParents,
                config,
                selectedModules: form.selectedModules,
                allCandidateModules: form.allCandidateModules,
                handleAddModule: form.handleAddModule,
                handleRemoveModule: form.handleRemoveModule,
                moduleInput: form.moduleInput,
                setModuleInput: form.setModuleInput,
                code: form.code,
                setCode: form.setCode,
                impactedFile: form.impactedFile,
                setImpactedFile: form.setImpactedFile,
                projects,
                projectId: form.projectId,
                setProjectId: form.setProjectId,
                riskFixExpanded: form.riskFixExpanded,
                setRiskFixExpanded: form.setRiskFixExpanded,
                risk: form.risk,
                setRisk: form.setRisk,
                fix: form.fix,
                setFix: form.setFix,
                language,
                t,
              }}
              t={t}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.01] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => form.setShowDeleteConfirm(true)}
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
              onClick={() => form.handleFormSubmit(false)}
              disabled={form.isSaving || !form.title.trim()}
              className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{form.isSaving ? t('common.saving') : t('itemModal.saveShortcut')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {item && (
        <ConfirmModal
          isOpen={form.showDeleteConfirm}
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
          onClose={() => form.setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};
