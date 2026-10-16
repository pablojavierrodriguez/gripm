import React from 'react';
import { Boxes, Box, Plus, X } from 'lucide-react';
import type { Language } from '../../utils/i18n';

export interface ComponentsTabProps {
  language: Language;
  modulesList: string[];
  newModuleInput: string;
  setNewModuleInput: (v: string) => void;
  handleAddModule: () => void;
  handleRemoveModule: (mod: string) => void;
}

export const ComponentsTab: React.FC<ComponentsTabProps> = ({
  language,
  modulesList,
  newModuleInput,
  setNewModuleInput,
  handleAddModule,
  handleRemoveModule,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          {language === 'es' ? 'Módulos y Componentes de Software' : 'Software Modules & Components'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {language === 'es'
            ? 'Estructura modular del proyecto. Administra las áreas de arquitectura y código (ej. Frontend, Backend, API, Auth, Database) que categorizan las historias y tareas en el tablero.'
            : 'Project modular structure. Manage architecture and codebase areas (e.g. Frontend, Backend, API, Auth, Database) that categorize stories and tasks on the board.'}
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-500" />
              <span>{language === 'es' ? 'Módulos y Componentes del Proyecto' : 'Project Modules & Components'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'es'
                ? 'Catálogo oficial de módulos y componentes transversales (ej. UI, API, Auth, Database). Se persisten en la configuración del proyecto y se sugieren al categorizar tareas.'
                : 'Official catalog of modules and transversal components (e.g. UI, API, Auth, Database). Persisted in project configuration and suggested when categorizing tasks.'}
            </p>
          </div>
          <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] shrink-0 tabular-nums">
            {modulesList.length} {language === 'es' ? (modulesList.length === 1 ? 'módulo' : 'módulos') : (modulesList.length === 1 ? 'module' : 'modules')}
          </span>
        </div>

        {/* Input group to add a new module */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddModule();
          }}
          className="flex items-center gap-2 max-w-md"
        >
          <div className="relative flex-1">
            <Box className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={newModuleInput}
              onChange={(e) => setNewModuleInput(e.target.value)}
              placeholder={language === 'es' ? 'Nombre del nuevo módulo (ej. UI, API, Auth)...' : 'New module name (e.g. UI, API, Auth)...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!newModuleInput.trim()}
            title={language === 'es' ? 'Agregar módulo' : 'Add module'}
            aria-label={language === 'es' ? 'Agregar módulo' : 'Add module'}
            className="px-3.5 py-2 min-h-[36px] rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Agregar' : 'Add'}</span>
          </button>
        </form>

        {/* List of existing module chips */}
        {modulesList.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center gap-2">
            <Box className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {language === 'es'
                ? 'No hay módulos configurados aún. Agrega un componente arriba para empezar a categorizar tareas.'
                : 'No modules configured yet. Add a component above to start categorizing tasks.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {modulesList.map((mod) => (
              <span
                key={mod}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-2xs group transition-all"
              >
                <Box className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-white">{mod}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveModule(mod)}
                  title={language === 'es' ? `Eliminar módulo ${mod}` : `Remove module ${mod}`}
                  aria-label={language === 'es' ? `Eliminar módulo ${mod}` : `Remove module ${mod}`}
                  className="p-0.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
