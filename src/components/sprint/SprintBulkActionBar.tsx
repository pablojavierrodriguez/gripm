import { type FC } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowUpToLine,
  ArrowDownToLine,
  Target,
  ChevronDown,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import type { ItemStatus, Priority } from '../../types';

interface SprintBulkActionBarProps {
  selectedItemIds: Set<string>;
  isEs: boolean;
  isBulkProcessing: boolean;
  allAvailableSprints: string[];
  allAvailableReleases: string[];
  onDeselectAll: () => void;
  onBulkMoveTop: () => void;
  onBulkMoveBottom: () => void;
  onBulkAssignSprint: (sprint: string) => void;
  onBulkAssignRelease: (release: string) => void;
  onBulkChangeStatus: (status: ItemStatus) => void;
  onBulkChangePriority: (priority: Priority) => void;
  onConfirmBulkDelete: () => void;
}

export const SprintBulkActionBar: FC<SprintBulkActionBarProps> = ({
  selectedItemIds,
  isEs,
  isBulkProcessing,
  allAvailableSprints,
  allAvailableReleases,
  onDeselectAll,
  onBulkMoveTop,
  onBulkMoveBottom,
  onBulkAssignSprint,
  onBulkAssignRelease,
  onBulkChangeStatus,
  onBulkChangePriority,
  onConfirmBulkDelete
}) => {
  if (selectedItemIds.size === 0) return null;

  return createPortal(
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
          onClick={onDeselectAll}
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
          onClick={onBulkMoveTop}
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
          onClick={onBulkMoveBottom}
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
              onBulkAssignSprint(val);
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
              onBulkAssignRelease(val);
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
              onBulkChangeStatus(val);
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
              onBulkChangePriority(val);
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
        onClick={onConfirmBulkDelete}
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
  );
};
