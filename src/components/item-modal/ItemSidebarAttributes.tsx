import React from 'react';
import {
  User,
  Tag,
  Box,
  Plus,
  AlertTriangle,
  ChevronDown,
  X,
} from 'lucide-react';
import type { BacklogItem, Project, GripmConfig } from '../../types';
import { ItemParentCombobox } from './ItemParentCombobox';

export interface ItemSidebarAttributesProps {
  assignees: string[];
  assigneeInput: string;
  setAssigneeInput: (s: string) => void;
  handleAddAssignee: (val?: string) => void;
  handleRemoveAssignee: (a: string) => void;
  availableAssignees: string[];
  labels: string[];
  labelInput: string;
  setLabelInput: (s: string) => void;
  handleAddLabel: (val?: string) => void;
  handleRemoveLabel: (l: string) => void;
  availableLabels: string[];
  parentId: string;
  setParentId: (id: string) => void;
  isParentDropdownOpen: boolean;
  setIsParentDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  parentDropdownContainerRef: React.RefObject<HTMLDivElement>;
  parentSearchInputRef: React.RefObject<HTMLInputElement>;
  parentSearchQuery: string;
  setParentSearchQuery: (s: string) => void;
  selectedParentItem: BacklogItem | undefined;
  isLegacyParent: boolean;
  formatRelation: (id: string) => string;
  filteredCandidateParents: BacklogItem[];
  config?: GripmConfig;
  selectedModules: string[];
  allCandidateModules: string[];
  handleAddModule: (val?: string) => void;
  handleRemoveModule: (m: string) => void;
  moduleInput: string;
  setModuleInput: (s: string) => void;
  code: string;
  setCode: (c: string) => void;
  impactedFile: string;
  setImpactedFile: (f: string) => void;
  projects: Project[];
  projectId: string;
  setProjectId: (p: string) => void;
  riskFixExpanded: boolean;
  setRiskFixExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  risk: string;
  setRisk: (r: string) => void;
  fix: string;
  setFix: (f: string) => void;
  language: string;
  t: (key: any, params?: any) => string;
}

export const ItemSidebarAttributes: React.FC<ItemSidebarAttributesProps> = ({
  assignees,
  assigneeInput,
  setAssigneeInput,
  handleAddAssignee,
  handleRemoveAssignee,
  availableAssignees,
  labels,
  labelInput,
  setLabelInput,
  handleAddLabel,
  handleRemoveLabel,
  availableLabels,
  parentId,
  setParentId,
  isParentDropdownOpen,
  setIsParentDropdownOpen,
  parentDropdownContainerRef,
  parentSearchInputRef,
  parentSearchQuery,
  setParentSearchQuery,
  selectedParentItem,
  isLegacyParent,
  formatRelation,
  filteredCandidateParents,
  config,
  selectedModules,
  allCandidateModules,
  handleAddModule,
  handleRemoveModule,
  moduleInput,
  setModuleInput,
  code,
  setCode,
  impactedFile,
  setImpactedFile,
  projects,
  projectId,
  setProjectId,
  riskFixExpanded,
  setRiskFixExpanded,
  risk,
  setRisk,
  fix,
  setFix,
  language,
  t,
}) => {
  return (
    <>
      {/* Assignees (Asignados) - DEV-111 */}
      <div>
        <div className="flex min-w-0 items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('itemModal.assigneesLabel')}</span>
          </label>
          {assignees.length > 0 && (
            <span className="text-xs text-slate-600 dark:text-slate-500">
              {assignees.length === 1
                ? t('itemModal.assigneeCountSingle')
                : t('itemModal.assigneeCountMulti', { count: assignees.length })}
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
            {availableAssignees
              .filter((a) => !assignees.includes(a))
              .map((a) => (
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
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
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
        <div className="flex min-w-0 items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('itemModal.labelsLabel')}</span>
          </label>
          {labels.length > 0 && (
            <span className="text-xs text-slate-600 dark:text-slate-500">
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
            {availableLabels
              .filter((l) => !labels.includes(l))
              .map((l) => (
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
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
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

      {/* Parent / Epic (Jerarquía de Ítem) */}
      <ItemParentCombobox
        parentId={parentId}
        setParentId={setParentId}
        isParentDropdownOpen={isParentDropdownOpen}
        setIsParentDropdownOpen={setIsParentDropdownOpen}
        parentDropdownContainerRef={parentDropdownContainerRef}
        parentSearchInputRef={parentSearchInputRef}
        parentSearchQuery={parentSearchQuery}
        setParentSearchQuery={setParentSearchQuery}
        selectedParentItem={selectedParentItem}
        isLegacyParent={isLegacyParent}
        formatRelation={formatRelation}
        filteredCandidateParents={filteredCandidateParents}
        config={config}
        t={t}
      />

      {/* Modules & Components (DEV-275) */}
      <div>
        <div className="flex min-w-0 items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('itemModal.moduleLabel')}</span>
          </label>
          {selectedModules.length > 0 && (
            <span className="text-xs text-slate-500 tabular-nums">
              {selectedModules.length}{' '}
              {selectedModules.length === 1
                ? language === 'es'
                  ? 'módulo'
                  : 'module'
                : language === 'es'
                ? 'módulos'
                : 'modules'}
            </span>
          )}
        </div>

        {allCandidateModules.filter((m) => !selectedModules.includes(m)).length > 0 && (
          <div className="relative mb-2">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddModule(e.target.value);
                }
              }}
              className="w-full appearance-none px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-indigo-500/50"
            >
              <option value="" disabled>
                + {t('itemModal.selectFromCatalog')}
              </option>
              {allCandidateModules
                .filter((m) => !selectedModules.includes(m))
                .map((m) => (
                  <option key={m} value={m} className="bg-white dark:bg-[#0e1626] text-slate-800 dark:text-slate-200">
                    {m}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={moduleInput}
            onChange={(e) => setModuleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                handleAddModule();
              }
            }}
            placeholder={language === 'es' ? 'Nuevo componente (ej. UI, API)...' : 'New component (e.g. UI, API)...'}
            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            type="button"
            onClick={() => handleAddModule()}
            disabled={!moduleInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs text-white font-semibold transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
            title={language === 'es' ? 'Agregar componente' : 'Add component'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Agregar' : 'Add'}</span>
          </button>
        </div>

        {selectedModules.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {selectedModules.map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 shadow-2xs group transition-all"
              >
                <Box className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>{m}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveModule(m)}
                  className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors ml-0.5"
                  title={`Quitar ${m}`}
                  aria-label={`Quitar ${m}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Code & Impacted File */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="min-w-0">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t('itemModal.codeLabel')}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Auto-generado"
            className="w-full min-w-0 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t('itemModal.impactedFileLabel')}
          </label>
          <input
            type="text"
            value={impactedFile}
            onChange={(e) => setImpactedFile(e.target.value)}
            placeholder="src/Header.tsx"
            className="w-full min-w-0 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono"
          />
        </div>
      </div>

      {/* Project selector if multiple projects */}
      {projects.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t('itemModal.projectLabel')}
          </label>
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
          onClick={() => setRiskFixExpanded((prev) => !prev)}
          className="flex items-center justify-between min-w-0 cursor-pointer py-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t('itemModal.riskFixTitle')}</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${
              riskFixExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </div>

        {riskFixExpanded && (
          <div className="space-y-2.5 pt-2">
            <div>
              <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
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
              <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
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
    </>
  );
};
