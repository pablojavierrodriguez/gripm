---
id: DEV-124
title: "Paridad Total de Light Mode y Transicion de Tema Sin Jank"
status: done
created_date: '2026-09-29'
updated_date: '2026-10-02 23:43'
labels:
  - "light-mode"
  - "theming"
  - "ui-ux"
  - "accessibility"
dependencies: []
priority: high
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!\-- SECTION:DESCRIPTION:BEGIN -->
Light mode se renderiza roto en el modal de ítems, la tab de Releases (vista y drawer de detalle) y el asistente de importación, y el switch Dark -> Light se percibe tosco.

Causa raíz: `ItemModal.tsx`, `ReleaseAssembler.tsx` e `ImportWizardModal.tsx` fueron escritos con paleta 100% dark-only y contienen **cero** variantes `dark:`, a diferencia de los otros 15 componentes del cockpit que usan el patron `base-claro + dark:`.

Agravante en `ItemModal.tsx:353`: el panel usa `glass-panel` (que sí tiene override claro en `index.css`) combinado con `bg-[#0d1322]/95`. Como el override de `.glass-panel` esta declarado fuera de `@layer`, le gana a la utilidad de Tailwind, por lo que el fondo vira a blanco mientras todo el texto interior permanece en `text-slate-100/200/400` -> texto blanco sobre blanco. En dark nunca se manifesto porque ambos fondos son oscuros.

`ReleaseAssembler.tsx` es mas severo: no usa `glass-panel`, tiene `bg-[#0c121e]` y `bg-slate-900/80` hardcodeados, por lo que el panel completo permanece negro mientras el chrome superior esta en claro.

Sobre la transicion: `App.tsx` combina `startViewTransition` + `flushSync` con las transiciones CSS siempre activas de `.glass-panel` / `.glass-card` / `.kanban-col` (`transition: background-color 200ms`). Ambas animaciones compiten y se dispara un repintado masivo del snapshot sobre tableros con 100+ items.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `ItemModal.tsx` deja de ser dark-only: todos los textos, fondos, bordes e inputs tienen variante `dark:` y son legibles en ambos temas
- [x] #2 `ReleaseAssembler.tsx` (vista de Releases y drawer de detalle) deja de ser dark-only: superficie, chrome, tarjetas, badges y botones legibles en ambos temas
- [x] #3 `ImportWizardModal.tsx` deja de ser dark-only: superficie, pasos, formularios y botones legibles en ambos temas
- [x] #4 Eliminar el solapaje entre el crossfade de View Transitions y las transiciones CSS siempre activas, de modo que la transicion Dark -> Light no ejecute doble animacion
- [x] #5 Respetar `prefers-reduced-motion: reduce` deshabilitando la animacion de cambio de tema
- [x] #6 Corregir el subtitulo de columna del Kanban (`KanbanBoard.tsx:624`) agregando su variante `dark:` faltante
- [x] #7 `npx tsc --noEmit` finishes con codigo 0
- [x] #8 `npm test` finishes con codigo 0
- [x] #9 `npm run backlog:check` finishes con codigo 0
- [x] #10 Auditar y corregir los cambios de un intento previo en `ProjectModal.tsx` y `Toast.tsx` (no incluidos en el alcance original): superficie raiz con `bg-[#0d1322]/95` compitiendo con el override de `glass-panel`, y 4 tokens de texto huerfanos sin variante `dark:`
- [x] #11 Convertir a theme-aware los 38 `<option>` nativos de `ItemModal.tsx` que llevaban `bg-[#0e1626]` hardcodeado (se ignoraban en light mode, con el desplegable dark sobre panel claro)
- [x] #12 Confirmar por build que las 38 clases `dark:bg-[#0e1626]` se generan efectivamente en el bundle CSS de Tailwind
- [x] #13 **Títulos `text-white` invisibles en light mode** (contraste 1:1 sobre panel blanco), reportados por el usuario tras la primera entrega: `ReleaseAssembler` L371, L705, L1077 e `ImportWizardModal` L136, L254
- [x] #14 **`<option>` nativos sin clase de fondo** en el selector de Sprint Goal del Kanban (`KanbanBoard.tsx` L854/862/867): el desplegable se renderiza con el tema del SO, no el de la app
- [x] #15 **Ruido visual por exceso de superficies grises** en `ItemModal`: 24 inputs en `slate-100` y 6 contenedores en `slate-50` sobre panel blanco. Re-escalados a `slate-50` (superficie) con `slate-100` solo en hover y chips, restituyendo la sutileza del original basado en alfas
- [x] #16 **Persistencia del tema al recargar**: `index.html` hardcodeaba `<html class="dark">` y un `style` inline oscuro en `<body>`, que revertian al tema oscuro en cada carga. Eliminados y reemplazados por un script anti-flash inline que aplica `devboard-theme` antes del primer paint
- [x] #17 `loadSettings` prioriza la eleccion explicita del usuario (`localStorage`) sobre `config.theme`, que antes revertia el tema en cada recarga
- [x] #18 Auditar contraste real (WCAG AA) de los 18 componentes en light mode con un verificador basado en luminancia relativa, en lugar de heuristicas de tokens
- [x] #19 **Bordes de las secciones AC y Plan de Implementacion en gris oscuro** (reportado por el usuario): los `<select>` nativos dibujan su propio borde con el estilo del SO, que se superpone al `border-slate-200` del tema. Agregar `appearance-none` a los 10 `<select>` de `ItemModal` y a los 9 restantes del proyecto (`AdvancedFiltersPopover`, `ImportWizardModal`, `SettingsView`, `SprintView`)
- [x] #20 Los 3 `<option>` de los `<datalist>` (assignees, labels, modulos) de `ItemModal` no tenian fondo theme-aware: el desplegable de autocompletado se renderizaba con el tema del SO
- [x] #21 Verificar por build que la clase compartida `appearance-none` se emite en el bundle CSS
- [x] #22 **Fondos `bg-black/10` sin variante `dark:`** en los cuerpos de los acordeones de AC, Plan de Implementacion y Relaciones (`ItemModal` L539, L611, L657): introducidos por el refactor original, dejaban un velo gris sobre el panel blanco. Corregidos a `bg-slate-50 dark:bg-black/10`
- [x] #23 **Tab activo "Todas" invisible** en `ReleaseAssembler.tsx:419`: `bg-white/10 text-white` = texto blanco sobre blanco en light mode. Corregido a `bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white`
- [x] #24 Reemplazar el handle movil `bg-white/20` de `ProjectModal` (invisible sobre panel claro) por `bg-slate-300 dark:bg-white/20`
- [x] #25 `ReleaseAssembler.tsx:957` usaba `bg-black/20 border-white/[0.04]` sin variante: corregido a `bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/[0.04]`
- [x] #26 **Selects sin indicador visual**: al agregar `appearance-none` se elimino la flecha nativa del navegador sin agregar su reemplazo. Los 10 selects de `ItemModal` ahora envueltos en `relative` con `ChevronDown` del tema y `pr-8` para reservar el espacio
- [x] #27 `<option>` de prioridad en `SprintView` con tonos `-500` ilegibles sobre blanco: elevados a `-600` con `dark:-400`, alineados con `priorityConfig` de `ItemCard`
- [x] #28 **Hover del titulo de release ilegible**: `group-hover:text-white` sin variante (blanco sobre blanco al hacer hover) -> `group-hover:text-slate-900 dark:group-hover:text-white`
- [x] #29 **Tabs internas del filtro de Releases**: el contenedor era `bg-black/30` (velo negro al 30% sobre el panel blanco, el gris oscuro de la captura) -> `bg-slate-50 dark:bg-white/[0.03]`
- [x] #30 **Buscador de Releases**: `bg-black/20` sin variante -> `bg-white dark:bg-white/[0.04]`
- [x] #31 **10 campos de formulario con fondo gris oscuro** en el drawer y el popup de Crear Version: `bg-black/30|40` + `text-white` sin `dark:` (blanco sobre gris). Corregidos a superficie clara con texto tematico
- [x] #32 **4 `hover:text-white` huerfanos** mas (blanco sobre blanco al hover) en `ReleaseAssembler` y `ImportWizardModal` -> `hover:text-slate-900 dark:hover:text-white`
- [x] #33 **Campos `input[type=date]` con icono del sistema operativo**: el icono de calendario se dibuja con los colores del SO e ignora el tema. Resuelto globalmente con `color-scheme` en `html.dark` / `html:not(.dark)`, sin necesidad de `appearance-none` ni datepicker propio
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Migracion ejecutada en 5 rondas, cada una validada en navegador por el usuario.
Detalle completo en `docs/issues_img/VERIFICACION_DEV-124.md`.

1. **Ronda 1 - Refactor de los 3 componentes dark-only**: `ItemModal`, `ReleaseAssembler` e `ImportWizardModal` convertidos al patron `base-claro + dark:`. Corregido el conflicto de especificidad con `glass-panel`. Resolucion del solapaje entre View Transitions y las transiciones CSS siempre activas, mas soporte de `prefers-reduced-motion`.
2. **Ronda 2 - Contraste real y persistencia**: auditoria de contraste WCAG por luminancia relativa. Titulos `text-white` invisibles (contraste 1:1) corregidos. `<option>` nativos convertidos a theme-aware. Persistencia del tema: `index.html` anti-flash + precedencia de la eleccion del usuario sobre `config.theme`.
3. **Ronda 3 - Controles nativos**: `appearance-none` en los 19 `<select>` del proyecto y fondo theme-aware en los `<option>`. Reescalado de las superficies grises del `ItemModal` (34 `slate-100` a 12) para eliminar ruido visual.
4. **Ronda 4 - Regresion propia y auditoria de velos**: restaurado el indicador `ChevronDown` + `pr-8` en los selects tras la regresion de `appearance-none`. Eliminados los `bg-black/X` huerfanos. Corregidos tab activo y handle movil invisibles.
5. **Ronda 5 - Cierre de Releases**: hover del titulo, tabs internas, buscador y 10 campos de formulario con `bg-black/X` + `text-white`. `input[type=date]` resueltos globalmente con `color-scheme`.

Validacion continua en cada ronda: `npx tsc --noEmit`, `npm test`,
`npm run backlog:check` y `npx vite build` (con inspeccion del bundle CSS
para confirmar que cada clase `dark:` se emite efectivamente).
<!-- SECTION:PLAN:END -->
