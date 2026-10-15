---
id: DEV-278
title: "Ajuste en Settings para alternar visibilidad del resumen de métricas en FilterBar"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "ux"
  - "settings"
  - "filters"
dependencies: []
priority: low
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En `FilterBar.tsx`, el indicador de resumen de métricas (`2 pendientes • 2 en curso • 3 completados • 7 total`) se renderiza siempre de forma obligatoria en el extremo derecho de la barra.

En pantallas medianas o portátiles, esta cadena de texto compite directamente por el ancho horizontal con los filtros de búsqueda y píldoras rápidas, provocando potenciales solapamientos o wrapping no deseado. Además, usuarios que prefieren interfaces limpias o minimalistas no disponen de un mecanismo para ocultar este resumen.

### Objetivos:
1. Agregar una propiedad en la configuración (`config.ui.showFilterBarStats` o `config.showFilterBarStats`, por defecto `true`).
2. Incorporar un switch en `SettingsView.tsx` (sección Apariencia / Filtros) para encender o apagar este bloque.
3. Respetar la preferencia en `FilterBar.tsx`, ocultando el componente cuando el usuario lo desactive y liberando espacio horizontal completo para los filtros.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 SettingsView incluye un switch para encender o apagar el resumen de estadísticas de la barra de filtros
- [x] #2 La preferencia se persiste correctamente en la configuración del proyecto
- [x] #3 Cuando el switch está desactivado, FilterBar no renderiza el bloque de métricas a la derecha
- [x] #4 En modo activo, el bloque de estadísticas se muestra con su formato y separadores habituales
- [x] #5 `npm test` y consistencia de esquemas de configuración en verde
<!-- AC:END -->

## Implementation Notes

- Se agregó el campo opcional `showFilterBarStats?: boolean;` a la interfaz `GripmConfig` en `src/types.ts`.
- En `src/components/SettingsView.tsx`:
  - Se agregó el helper `updateConfig` para mutar y persistir cambios parciales en `GripmConfig` usando `onSaveConfig`.
  - Se incluyó `showFilterBarStats` en `builtConfig` y `normalizeForComparison`.
  - En la sección de interfaz/apariencia, se adaptó el grid a 4 columnas responsivas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) incorporando el switch con `t('settings.showFilterBarStatsLabel')`, `t('settings.showFilterBarStatsDesc')`, `checked={config?.showFilterBarStats !== false}` y persistencia vía `updateConfig({ showFilterBarStats: checked })`.
- En `src/components/FilterBar.tsx`:
  - Se añadió la prop opcional `showStats?: boolean;` (por defecto `true`) a `FilterBarProps` y al componente `FilterBar`.
  - El contenedor del extremo derecho con las métricas (`stats`) se condicionó con `{showStats && ( ... )}` liberando el ancho completo horizontal cuando se desactiva.
- En `src/App.tsx`:
  - Se propagó `showStats={config?.showFilterBarStats !== false}` en la invocación de `<FilterBar ... />`.

