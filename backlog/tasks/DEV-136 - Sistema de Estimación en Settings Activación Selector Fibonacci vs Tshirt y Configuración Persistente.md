---
id: DEV-136
title: "Sistema de Estimación en Settings Activación Selector Fibonacci vs Tshirt y Configuración Persistente"
status: draft
created_date: '2026-09-30'
updated_date: '2026-09-30 14:06'
labels:
  - "estimation"
  - "settings"
  - "config"
dependencies: []
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Proveer en DevBoard la capacidad de configurar el sistema de estimación de tareas a nivel de proyecto desde la vista de Configuración (SettingsView).

### Requerimientos Clave:
1. **Activación / Desactivación Soberana:** El usuario debe poder activar o desactivar la estimación de ítems mediante un toggle principal en Settings.
2. **Selección de Método de Estimación:** Cuando la estimación está activa, el usuario puede elegir entre dos metodologías canónicas de la industria:
   - **Story Points (Fibonacci):** Escala numérica estándar [0, 1, 2, 3, 5, 8, 13, 21].
   - **T-Shirt Sizes:** Escala cualitativa por tallas [XS, S, M, L, XL, XXL].
3. **Previsualización Interactiva:** La UI de configuración debe mostrar una vista previa visual de la escala elegida (pills con badges de colores/estilos del sistema).
4. **Persistencia Reactiva:** La preferencia se almacena en el archivo `.devboard/config.json` dentro del campo `estimation` y se propaga en tiempo real al estado global del cockpit.
5. **No Destructividad:** Desactivar la estimación oculta la funcionalidad en la UI pero preserva los valores asignados previamente en los archivos Markdown locales.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Definir tipos canónicos en src/types.ts: EstimationMethod ('fibonacci' | 'tshirt'), EstimationConfig ({ enabled: boolean, method: EstimationMethod }) y extender DevBoardConfig con estimation?: EstimationConfig
- [ ] #2 Inicializar la configuración de estimación con valores seguros por defecto (enabled: false, method: 'fibonacci') para garantizar retrocompatibilidad total
- [ ] #3 Crear sección dedicada 'Estimación de Ítems' en src/components/SettingsView.tsx con un switch/toggle accesible e intuitivo para activar o desactivar la funcionalidad
- [ ] #4 Implementar selector interactivo de método entre 'Story Points (Fibonacci)' y 'T-Shirt Sizes (Tallas de Remera)' con descripción y previsualización gráfica de las escalas correspondientes
- [ ] #5 Persistir los cambios en .devboard/config.json mediante onSaveConfig y sincronizar reactivamente el estado en App.tsx sin recargar la aplicación
- [ ] #6 Asegurar preservación de datos no destructiva: si la estimación se desactiva en Settings, las estimaciones existentes en los archivos Markdown no se borran ni modifican
- [ ] #7 Soportar reversión limpia de cambios mediante el botón 'Deshacer cambios' de Settings restaurando el estado previo de configuración
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extender `src/types.ts`:
   - Declarar `export type EstimationMethod = 'fibonacci' | 'tshirt';`
   - Declarar `export interface EstimationConfig { enabled: boolean; method: EstimationMethod; customFibonacci?: number[]; customTshirt?: string[]; }`
   - Incorporar `estimation?: EstimationConfig;` dentro de la interfaz `DevBoardConfig`.
2. Actualizar defaults y normalización de configuración:
   - En `src/components/SettingsView.tsx` y donde se inicialice `DevBoardConfig`, establecer `estimation: { enabled: false, method: 'fibonacci' }` si no está presente.
3. Diseñar componente visual en `SettingsView.tsx`:
   - Agregar bloque de configuración 'Estimación de Ítems' (icono de velocímetro/regla, título y descripción).
   - Incluir Toggle switch para activar/desactivar.
   - Incluir selector visual de radio cards o pills para elegir entre 'Story Points (Fibonacci)' y 'T-Shirt Sizes'.
   - Mostrar previsualización con el catálogo de opciones del método seleccionado.
4. Integrar con el flujo de guardado y reversión:
   - Mapear el nuevo campo en `builtConfig` y `normalizeForComparison` para detección de dirty state.
   - Soportar guardado persistente vía `onSaveConfig` hacia `.devboard/config.json`.
5. Validar con TypeScript (`npx tsc --noEmit`) y pruebas de regresión.
<!-- SECTION:PLAN:END -->
