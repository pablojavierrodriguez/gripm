---
id: DEV-168
title: "Migración de Claves de localStorage a Prefijo Canónico gripm con Retrocompatibilidad"
status: done
created_date: '2026-10-04'
updated_date: '2026-10-05 10:00'
labels:
  - "storage"
  - "branding"
  - "refactor"
  - "post-launch"
dependencies: []
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En `src/App.tsx`, varias claves persistidas en el almacenamiento local del navegador (`localStorage`) continúan utilizando prefijos heredados de la marca previa:
- `devboard-theme`
- `devboard_active_tab`
- `devboard_kanban_show_ideas`
- `devboard_active_project_id`

### Diagnóstico de Causa Raíz

Durante la fase de rebranding (DEV-161), se priorizó limpiar la identidad pública, los binarios CLI y la documentación, preservando intencionalmente la compatibilidad para evitar resetear las preferencias de desarrolladores que ya usaban la herramienta.

### Problema

Seguir escribiendo valores nuevos con prefijos `devboard_*` es un residuo de deuda técnica: nuevos usuarios terminan con claves obsoletas en su navegador y el código conserva referencias discordantes con el nombre `gripm`.

### Objetivo

Crear un módulo unificado de persistencia local (`src/utils/storage.ts`) que adopte el prefijo canónico `gripm_*`:
1. **Escritura canónica:** Todas las escrituras deben guardarse bajo el nuevo prefijo (ej. `gripm_theme`, `gripm_active_tab`, `gripm_kanban_show_ideas`, `gripm_active_project_id`).
2. **Lectura resiliente con auto-migración:** Al solicitar una clave, se consulta la nueva clave canónica; si no existe, se busca la clave legacy `devboard_*` y, de encontrarse, se migra de forma transparente escribiéndola en la nueva clave.
3. Preservar intacta la experiencia de usuario y sus preferencias de interfaz sin provocar pérdida de estado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Diseñar e implementar utilitario de almacenamiento seguro `src/utils/storage.ts` con fallback y auto-migración de claves
- [x] #2 Reemplazar accesos directos a `localStorage` en `src/App.tsx` por el nuevo utilitario canónico
- [x] #3 Las nuevas escrituras se realizan exclusivamente bajo las claves `gripm_*`
- [x] #4 Usuarios con claves existentes `devboard_*` conservan sus ajustes sin interrupción
- [x] #5 `npx tsc --noEmit` y `npm test` pasan íntegros con código de salida 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `src/utils/storage.ts` con métodos tipados `getStoredValue` y `setStoredValue`, mapeando pares canónicos y legados.
2. Integrar el helper en `src/App.tsx` para tema, pestaña activa, visibilidad de ideas y proyecto seleccionado.
3. Probar en entorno de desarrollo la transición simulando claves previas en el storage del navegador.
4. Ejecutar el ciclo de tests y typecheck de TypeScript.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Invariante: La lectura del tema y configuración no debe causar parpadeos en el renderizado inicial ni violar la estabilidad de layout (Zero-CLS).
<!-- SECTION:NOTES:END -->
