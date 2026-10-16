---
id: DEV-305
title: "Ergonomía de Interacción: A11y Universal, Portales, Stack de Modales y Migración Completa a i18n"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "a11y"
  - "i18n"
  - "frontend"
  - "ergonomics"
dependencies: []
priority: medium
type: ux
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolución integral de defectos ergonómicos, accesibilidad de teclado, gestión de foco en modales anidados y eliminación de más de 150 cadenas de texto hardcodeadas en español que quiebran el soporte para idioma inglés (`"language": "en"`).

### Diagnóstico de la Causa Raíz:

1. **Colisión de Tecla `Escape` en Modales Anidados (Doble Cierre):**
   En `src/hooks/useFocusTrap.ts:106`, cada modal abierto registra un listener `keydown` en fase de captura sobre `document`. Cuando `ItemModal` abre su diálogo de confirmación de borrado (`ConfirmModal`), pulsar `Escape` para cancelar el borrado dispara ambos listeners simultáneamente, cerrando tanto la confirmación como `ItemModal` y perdiendo las ediciones en curso. Idéntico problema ocurre en `ProjectModal` + `FolderPickerModal` y en `ReleaseAssembler`.
2. **Atajos Globales de Teclado Rotos y Fugas de Contexto:**
   En `src/App.tsx:404-443`:
   - Pulsar `N` llama a `setDefaultNewStatus('backlog')`. Como `'backlog'` no es un estado canónico en el `<select>` de `ItemModal`, el selector aparece en blanco y persiste el valor obsoleto en disco.
   - Los atajos numéricos (`1`, `2`, `3`, `4`) se ejecutan incluso si el usuario está interactuando con botones dentro de modales abiertos o si la pestaña destino está deshabilitada en `config.enabledTabs`.
3. **Solapamiento en Checkboxes con Shift+Click:**
   En `src/components/SprintView.tsx:1523-1536`, el checkbox de fila define simultáneamente `onClick` (con `handleRowShiftClick`) y `onChange` (con `handleToggleSelectItem`), provocando que un Shift-click seleccione y deseleccione la fila en el mismo evento.
4. **Modales sin Portal y Atrapados en Stacking Contexts:**
   8 modales (`Modal.tsx`, `ProjectModal.tsx`, `FolderPickerModal.tsx`, `SprintModal.tsx`, `CompleteSprintModal.tsx`, `PlanGuardModal.tsx`, `ImportWizardModal.tsx` y el visor de retro de `SprintView.tsx`) se renderizan en el DOM inline sin `createPortal(..., document.body)`, violando la Regla #11 de `AGENTS.md` y quedando vulnerables a bugs de apilamiento con `backdrop-filter` o `transform`.
5. **Ruptura del Modo Inglés por Cadenas Hardcodeadas:**
   Más de 150 textos en `main.tsx` (`ErrorBoundary`), `ImportWizardModal.tsx`, generador de changelogs en `ReleaseAssembler.tsx`, toasts de `App.tsx` y encabezados de `SprintView.tsx` están escritos en español estático, ignorando la configuración `"language": "en"`.
6. **Clases de Utilidad Inválidas y Tipografía Arbitraria:**
   Presencia de `py-0.2` (utilidad inexistente en Tailwind que no genera estilos) en 6 componentes y 265 violaciones de `UX-011` congeladas en `audit-ux-baseline.json`.

### Solución Arquitectónica Profunda:

- **Pila de Traps de Foco (`activeTraps` Stack):**
  - Implementar en `useFocusTrap.ts` un stack global de modales activos. Solo el modal en el tope de la pila (`activeTraps[activeTraps.length - 1]`) captura `Escape` y `Tab`, llamando a `e.stopImmediatePropagation()`.
- **Saneamiento de Atajos:**
  - Corregir el estado por defecto de `N` a `'draft'`.
  - Bloquear todos los atajos de una sola tecla cuando exista algún modal abierto o la pestaña esté deshabilitada.
- **Portales Universales:**
  - Envolver todos los modales y overlays en `createPortal(..., document.body)` con `role="dialog"`, `aria-modal="true"` y focus trap estricto.
- **Internacionalización Completa:**
  - Trasladar todas las cadenas hardcodeadas a `src/locales/es.json` y `src/locales/en.json`, garantizando paridad 100% y traducción dinámica vía `useTranslation()`.
- **Higiene de CSS y Quema de Baseline:**
  - Reemplazar `py-0.2` por `py-0.5` y migrar `text-[9px]`, `text-[10px]` y `text-[11px]` a la escala canónica `text-xs`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Al presionar `Escape` dentro de un modal anidado (ej. confirmación de borrado en `ItemModal`), se cierra exclusivamente el modal superior sin cerrar el modal padre
- [ ] #2 El atajo de teclado `N` abre el modal con estado canónico `draft` y los atajos numéricos no interfieren cuando hay modales abiertos o pestañas desactivadas
- [ ] #3 La selección por rango con `Shift+Click` en checkboxes de `SprintView` selecciona el bloque continuo de tareas de forma determinista sin deseleccionar la fila actual
- [ ] #4 Los 8 modales identificados se renderizan mediante `createPortal(..., document.body)` con atributos ARIA y foco contenido
- [ ] #5 Todas las cadenas de texto visibles de `ErrorBoundary`, `ImportWizardModal`, `ReleaseAssembler` y toasts se internacionalizan en `es.json` y `en.json`, funcionando limpiamente en modo inglés
- [ ] #6 Se eliminan todas las apariciones de la clase Tailwind inválida `py-0.2`
- [ ] #7 El baseline de `audit-ux-baseline.json` se reduce progresivamente reemplazando tamaños arbitrarios por la escala estándar `text-xs`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implementar la pila de foco `activeTraps` en `src/hooks/useFocusTrap.ts`.
2. Corregir los atajos globales en `src/App.tsx:404`.
3. Arreglar el listener de Shift-click en `src/components/SprintView.tsx:1523`.
4. Envolver los 8 modales inline con `createPortal`.
5. Extraer textos hardcodeados de `ImportWizardModal`, `ErrorBoundary` y `ReleaseAssembler` hacia `src/locales/`.
6. Corregir `py-0.2` y normalizar clases de fuente.
7. Verificar con `npm run test:ui` y `npm run audit:ux`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
