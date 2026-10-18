import React from 'react';
import { ChevronDown, History, Calendar } from 'lucide-react';
import type { BacklogItem, Sprint, Release } from '../../types';

export interface ItemSidebarScheduleProps {
  isSprintModule: boolean;
  sprint: string;
  setSprint: (s: string) => void;
  customSprintMode: boolean;
  setCustomSprintMode: React.Dispatch<React.SetStateAction<boolean>>;
  sprints: Sprint[];
  availableSprints?: string[];
  item: BacklogItem | null;
  release: string;
  setRelease: (r: string) => void;
  selectedReleases: string[];
  setSelectedReleases: React.Dispatch<React.SetStateAction<string[]>>;
  customReleaseMode: boolean;
  setCustomReleaseMode: React.Dispatch<React.SetStateAction<boolean>>;
  customReleaseInput: string;
  setCustomReleaseInput: (s: string) => void;
  releases: Release[];
  availableReleases?: string[];
  startDate: string;
  setStartDate: (d: string) => void;
  dueDate: string;
  setDueDate: (d: string) => void;
  t: (key: any, params?: any) => string;
}

export const ItemSidebarSchedule: React.FC<ItemSidebarScheduleProps> = ({
  isSprintModule,
  sprint,
  setSprint,
  customSprintMode,
  setCustomSprintMode,
  sprints,
  availableSprints = [],
  item,
  release,
  setRelease,
  selectedReleases,
  setSelectedReleases,
  customReleaseMode,
  setCustomReleaseMode,
  customReleaseInput,
  setCustomReleaseInput,
  releases,
  availableReleases = [],
  startDate,
  setStartDate,
  dueDate,
  setDueDate,
  t,
}) => {
  return (
    <>
      {/* Sprint & Multi-Release (DEV-056, DEV-077, DEV-087, DEV-218) */}
      <div className="space-y-3">
        {isSprintModule && (
          <div>
            <div className="flex min-w-0 items-center justify-between mb-1">
              <label className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {t('itemModal.sprintLabel')}
              </label>
              <button
                type="button"
                onClick={() => setCustomSprintMode((prev) => !prev)}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
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
                  className="w-full appearance-none px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 cursor-pointer font-medium transition-colors"
                >
                  <option value="" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400">
                    {t('itemModal.noSprintBacklog')}
                  </option>
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
              const activeSp = sprints.find((s) => s.status === 'active');
              const plannedSps = sprints.filter((s) => s.status === 'planned');
              return (
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  {activeSp && sprint !== activeSp.name && (
                    <button
                      type="button"
                      onClick={() => {
                        setSprint(activeSp.name);
                        setCustomSprintMode(false);
                      }}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      🟢 {activeSp.name}
                    </button>
                  )}
                  {plannedSps
                    .filter((ps) => ps.name !== sprint)
                    .slice(0, 2)
                    .map((ps) => (
                      <button
                        key={ps.id}
                        type="button"
                        onClick={() => {
                          setSprint(ps.name);
                          setCustomSprintMode(false);
                        }}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                      >
                        🟡 {ps.name}
                      </button>
                    ))}
                  {sprint && (
                    <button
                      type="button"
                      onClick={() => {
                        setSprint('');
                        setCustomSprintMode(false);
                      }}
                      className="px-1.5 py-0.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                    >
                      {t('itemModal.noSprintChip')}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Historial de Sprints Cerrados (DEV-056 AC #1 & #3) */}
            {item?.sprints && item.sprints.filter((s) => s !== sprint).length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <History className="w-3 h-3 text-slate-600 dark:text-slate-500" />
                  {t('itemModal.historyLabel')}
                </span>
                {item.sprints
                  .filter((s) => s !== sprint)
                  .map((histSp) => (
                    <span
                      key={histSp}
                      className="px-1.5 py-0.5 rounded text-xs bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300"
                    >
                      {histSp}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Multi-version Releases (DEV-056, DEV-077, DEV-087, DEV-091) */}
        <div>
          <div className="flex min-w-0 items-center justify-between mb-1">
            <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {t('itemModal.releaseLabel')}
            </label>
            {selectedReleases.length > 1 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400/80">
                {t('itemModal.multiRelease', { count: selectedReleases.length })}
              </span>
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
                  className="px-2 py-1.5 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 font-medium transition-colors"
                >
                  {t('common.apply')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomReleaseMode(false);
                    setCustomReleaseInput('');
                  }}
                  className="px-2 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
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
                  className="w-full appearance-none px-3 py-1.5 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer font-medium transition-colors"
                >
                  <option value="" className="bg-white dark:bg-[#0e1626] text-slate-600 dark:text-slate-400 font-sans">
                    {t('itemModal.noRelease')}
                  </option>
                  {(() => {
                    const officialUnrel = releases.filter((r) => r.status === 'unreleased');
                    const officialRel = releases.filter((r) => r.status === 'released');
                    const customRels = selectedReleases.filter(
                      (sr) => !releases.some((r) => r.version === sr) && !availableReleases.includes(sr)
                    );
                    return (
                      <>
                        {officialUnrel.length > 0 && (
                          <optgroup label={t('itemModal.plannedReleasesGroup')}>
                            {officialUnrel.map((r) => (
                              <option key={r.id || r.version} value={r.version} className="bg-white dark:bg-[#0e1626]">
                                v{r.version} 🟡 (En curso)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {officialRel.length > 0 && (
                          <optgroup label={t('itemModal.releasedGroup')}>
                            {officialRel.map((r) => (
                              <option key={r.id || r.version} value={r.version} className="bg-white dark:bg-[#0e1626]">
                                v{r.version} 🟢 (Liberado)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {releases.length === 0 &&
                          availableReleases.map((r) => (
                            <option key={r} value={r} className="bg-white dark:bg-[#0e1626]">
                              v{r}
                            </option>
                          ))}
                        {customRels.length > 0 && (
                          <optgroup label={t('itemModal.customReleaseGroup')}>
                            {customRels.map((sr) => (
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                >
                  v{rel}
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedReleases.filter((r) => r !== rel);
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
                const officialUnrel = releases.filter((r) => r.status === 'unreleased');
                return officialUnrel
                  .filter((r) => !selectedReleases.includes(r.version))
                  .map((r) => (
                    <button
                      key={r.id || r.version}
                      type="button"
                      onClick={() => {
                        setRelease(r.version);
                        setSelectedReleases([r.version]);
                        setCustomReleaseMode(false);
                      }}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
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
                  className="px-1.5 py-0.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  {t('itemModal.noReleaseChip')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fechas de Planificación (Timeline / Roadmap - DEV-281) */}
      <div>
        <div className="flex items-center justify-between min-w-0 mb-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>{t('itemModal.planningDates')}</span>
          </label>
          {(startDate || dueDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setDueDate('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              {t('common.clear')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t('itemModal.startDate')}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t('itemModal.dueDate')}
            </span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>
        </div>
      </div>
    </>
  );
};
