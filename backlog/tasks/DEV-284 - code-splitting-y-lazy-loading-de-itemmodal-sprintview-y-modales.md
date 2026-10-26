---
id: DEV-284
title: "Code-splitting y lazy loading de ItemModal, SprintView y modales secundarios"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-26'
labels:
  - "performance"
  - "frontend"
  - "bundle"
  - "vite"
dependencies: []
priority: medium
type: tech_debt
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optimización del tamaño del bundle JavaScript inicial en Vite mediante la aplicación de `React.lazy()` y dynamic imports para vistas y modales pesados que no son requeridos en el primer renderizado del tablero Kanban.

### Problemas identificados:
1. **Bundle monolítico inicial:** El bundle de producción genera un archivo principal `dist/assets/index-*.js` de **647 kB minificado** (163 kB gzipped), activando advertencias de Vite (`(!) Some chunks are larger than 500 kB after minification`).
2. **Componentes gigantes en el chunk raíz:**
   - [`ItemModal.tsx`](file:///c:/Users/Pablo/Proyectos/gripm/src/components/ItemModal.tsx) (128 kB, 2.290 líneas) solo se requiere cuando el usuario abre una tarjeta.
   - [`SprintView.tsx`](file:///c:/Users/Pablo/Proyectos/gripm/src/components/SprintView.tsx) (88 kB, 1.690 líneas) solo se requiere si la pestaña `sprint` está activa.
   - Modales como `ImportWizardModal`, `PlanGuardModal`, `FolderPickerModal`, `KeyboardShortcutsModal` y `ProjectModal` están incluidos en el bundle principal.
3. El tiempo de descarga inicial, parseo y compilación del motor JavaScript en navegadores móviles o equipos de baja potencia se degrada innecesariamente.

### Solución propuesta:
- Declarar `ItemModal` con `React.lazy()` envuelto en `Suspense` dentro de [src/App.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/App.tsx).
- Declarar `SprintView` con `React.lazy()` y Suspense, replicando el patrón ya utilizado para `SettingsView` y `ReleaseAssembler`.
- Cargar de forma diferida los modales secundarios de configuración o importación.
- Configurar `build.rollupOptions.output.manualChunks` en [vite.config.ts](file:///c:/Users/Pablo/Proyectos/gripm/vite.config.ts) para aislar chunks lógicos limpios (`react-vendor`, `icons-vendor`, etc.) si resulta beneficioso.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `ItemModal` y `SprintView` se cargan de forma dinámica mediante `React.lazy()` y `Suspense`
- [x] #2 Los modales secundarios no bloquean la carga ni forman parte indivisible del bundle raíz
- [x] #3 El tamaño del chunk JS principal generado por `npm run build` disminuye por debajo de 400 kB minificado
- [x] #4 La interacción de apertura de tarjetas y navegación entre pestañas es fluida y sin parpadeos visuales
- [x] #5 La suite de pruebas de UI y build (`npm test` y `npm run build`) pasan con código 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Migrar `ItemModal`, `TrashView`, `ProjectModal`, `PlanGuardModal`, `KeyboardShortcutsModal` y `CommandPaletteModal` a dynamic imports con `React.lazy()` en `src/App.tsx`.
2. Envolver los componentes en `Suspense` condicionales para evitar sobrecarga en el DOM y carga de bundles iniciales.
3. Incorporar mecanismo de precarga inteligente en segundo plano (`preloadItemModal` vía `requestIdleCallback`) para garantizar apertura instantánea de tarjetas sin parpadeos visuales.
4. Configurar `build.rollupOptions.output.manualChunks` en `vite.config.ts` segregando `vendor-react` y `vendor-lucide`.
5. Validar reducción del bundle (<400 kB) y ejecutar la Pirámide de Verificación completa.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reducción del chunk principal de 647.75 kB a 327.66 kB (reducción del 49.4% en JavaScript inicial).
- 0 advertencias de Vite por tamaño de chunk (`chunkSizeWarningLimit`).
- Suite de pruebas completa aprobada (26 pasos secuenciales, código 0) y validación de tipos estricta (`tsc --noEmit`).
<!-- SECTION:NOTES:END -->
