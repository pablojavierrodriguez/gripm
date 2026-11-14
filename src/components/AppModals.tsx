import { lazy, Suspense, type FC } from 'react';
import type { BacklogItem, Project, Release, Sprint, GripmConfig, ActiveTab, ItemStatus, UpdateInfo } from '../types';

const ItemModal = lazy(() => import('./ItemModal').then(m => ({ default: m.ItemModal })));
const ProjectModal = lazy(() => import('./ProjectModal').then(m => ({ default: m.ProjectModal })));
const PlanGuardModal = lazy(() => import('./PlanGuardModal').then(m => ({ default: m.PlanGuardModal })));
const ImportWizardModal = lazy(() => import('./ImportWizardModal').then(m => ({ default: m.ImportWizardModal })));
const KeyboardShortcutsModal = lazy(() => import('./KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })));
const CommandPaletteModal = lazy(() => import('./CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })));
const AuditModal = lazy(() => import('./audit/AuditModal').then(m => ({ default: m.AuditModal })));

interface AppModalsProps {
  itemModalOpen: boolean;
  onCloseItemModal: () => void;
  editingItem: BacklogItem | null;
  defaultNewStatus: ItemStatus;
  defaultNewSprint: string;
  projects: Project[];
  availableModules: string[];
  sprintNamesForAutocomplete: string[];
  availableReleases: string[];
  projectSprints: Sprint[];
  projectReleases: Release[];
  onSaveItem: (itemData: Partial<BacklogItem> & { expectedMtime?: number; force?: boolean }) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUnlinkChildTask: (childId: string) => Promise<void>;
  selectedProjectId: string;
  config: GripmConfig;
  allItems: BacklogItem[];

  projectModalOpen: boolean;
  onCloseProjectModal: () => void;
  onCreateProject: (projectData: Partial<Project>) => Promise<void>;

  planGuardOpen: boolean;
  planGuardItem: BacklogItem | null;
  onClosePlanGuard: () => void;
  onConfirmStartWithPlan: (itemId: string, updatedPlan?: string) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  importWizardOpen: boolean;
  onCloseImportWizard: () => void;
  onImportComplete: () => void;

  shortcutsModalOpen: boolean;
  onCloseShortcutsModal: () => void;
  updateAvailable?: UpdateInfo | null;

  commandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  onSelectProject: (id: string) => void;
  onSelectItemFromPalette: (item: BacklogItem) => void;
  onNewItemFromPalette: () => void;
  onNewProjectFromPalette: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onResyncDocs: () => Promise<void>;
  onOpenShortcutsFromPalette: () => void;
  language: string;
  onToggleLanguage: () => void;

  auditModalOpen: boolean;
  onCloseAuditModal: () => void;
  auditReport: any;
  isAuditLoading: boolean;
  isAuditRefreshing: boolean;
  isAuditImporting: boolean;
  onRefreshAudit: () => Promise<any>;
  onImportTodos: (items: any) => Promise<any>;
}

export const AppModals: FC<AppModalsProps> = ({
  itemModalOpen,
  onCloseItemModal,
  editingItem,
  defaultNewStatus,
  defaultNewSprint,
  projects,
  availableModules,
  sprintNamesForAutocomplete,
  availableReleases,
  projectSprints,
  projectReleases,
  onSaveItem,
  onDeleteItem,
  onUnlinkChildTask,
  selectedProjectId,
  config,
  allItems,

  projectModalOpen,
  onCloseProjectModal,
  onCreateProject,

  planGuardOpen,
  planGuardItem,
  onClosePlanGuard,
  onConfirmStartWithPlan,
  onShowToast,

  importWizardOpen,
  onCloseImportWizard,
  onImportComplete,

  shortcutsModalOpen,
  onCloseShortcutsModal,
  updateAvailable,

  commandPaletteOpen,
  onCloseCommandPalette,
  onSelectProject,
  onSelectItemFromPalette,
  onNewItemFromPalette,
  onNewProjectFromPalette,
  activeTab,
  onSelectTab,
  isDarkMode,
  onToggleTheme,
  onResyncDocs,
  onOpenShortcutsFromPalette,
  language,
  onToggleLanguage,

  auditModalOpen,
  onCloseAuditModal,
  auditReport,
  isAuditLoading,
  isAuditRefreshing,
  isAuditImporting,
  onRefreshAudit,
  onImportTodos
}) => {
  return (
    <>
      {itemModalOpen && (
        <Suspense fallback={null}>
          <ItemModal
            isOpen={itemModalOpen}
            onClose={onCloseItemModal}
            item={editingItem}
            defaultStatus={defaultNewStatus}
            defaultSprint={defaultNewSprint}
            projects={projects}
            availableModules={availableModules}
            availableSprints={sprintNamesForAutocomplete}
            availableReleases={availableReleases}
            sprints={projectSprints}
            releases={projectReleases}
            onSave={onSaveItem}
            onDelete={onDeleteItem}
            onUnlinkChild={onUnlinkChildTask}
            activeProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
            config={config}
            allItems={allItems}
          />
        </Suspense>
      )}

      {projectModalOpen && (
        <Suspense fallback={null}>
          <ProjectModal
            isOpen={projectModalOpen}
            onClose={onCloseProjectModal}
            onSave={onCreateProject}
          />
        </Suspense>
      )}

      {planGuardOpen && (
        <Suspense fallback={null}>
          <PlanGuardModal
            isOpen={planGuardOpen}
            item={planGuardItem}
            onClose={onClosePlanGuard}
            onConfirmStart={onConfirmStartWithPlan}
            onShowToast={onShowToast}
          />
        </Suspense>
      )}

      {importWizardOpen && (
        <Suspense fallback={null}>
          <ImportWizardModal
            isOpen={importWizardOpen}
            onClose={onCloseImportWizard}
            projects={projects}
            activeProjectId={selectedProjectId === 'all' ? (projects[0]?.id || '') : selectedProjectId}
            onImportComplete={onImportComplete}
          />
        </Suspense>
      )}

      {shortcutsModalOpen && (
        <Suspense fallback={null}>
          <KeyboardShortcutsModal
            isOpen={shortcutsModalOpen}
            onClose={onCloseShortcutsModal}
            updateAvailable={updateAvailable}
          />
        </Suspense>
      )}

      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPaletteModal
            isOpen={commandPaletteOpen}
            onClose={onCloseCommandPalette}
            items={allItems}
            projects={projects}
            activeProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
            onSelectItem={onSelectItemFromPalette}
            onNewItem={onNewItemFromPalette}
            onNewProject={onNewProjectFromPalette}
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            config={config}
            isDarkMode={isDarkMode}
            onToggleTheme={onToggleTheme}
            onResyncDocs={onResyncDocs}
            onOpenShortcuts={onOpenShortcutsFromPalette}
            language={language}
            onToggleLanguage={onToggleLanguage}
          />
        </Suspense>
      )}

      {auditModalOpen && (
        <Suspense fallback={null}>
          <AuditModal
            isOpen={auditModalOpen}
            onClose={onCloseAuditModal}
            report={auditReport}
            isLoading={isAuditLoading}
            isRefreshing={isAuditRefreshing}
            isImporting={isAuditImporting}
            onRefresh={onRefreshAudit}
            onImportTodos={onImportTodos}
            config={config}
          />
        </Suspense>
      )}
    </>
  );
};
