---
id: DEV-359
title: "Configurabilidad y gobernanza granular de reglas de auditoria en config.json"
status: ready
claimed_by: "antigravity:0808784b-8c29-4094-a766-634937d63e4a"
priority: medium
type: feature
assignee: ""
sprint: ""
epic: DEV-352
created_at: "2026-11-02T01:17:00Z"
---

# DEV-359 - Configurabilidad y gobernanza granular de reglas de auditoria en config.json

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualmente, el motor estatico de auditoria y salud del repositorio (`audit-engine.mjs` y `auditService.ts`) opera con reglas predeterminadas estandar (techo LOC de 1000 lineas, advertencia en 500, analisis de supresiones `@ts-ignore`, deteccion de infraestructura de pruebas y marcadores de deuda tecnica).

Para repositorios con estandares particulares o necesidades especificas de refinamiento (por ejemplo, excluir archivos de test de las advertencias de supresion, activar o desactivar la verificacion de `console.log`, o ajustar umbrales de presupuesto), es necesario hacer que las variables y el alcance de la auditoria sean configurables mediante la seccion `audit` de `.gripm/config.json`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El esquema de configuracion de `.gripm/config.json` soporta la clave opcional `audit` con definicion de reglas activas y umbrales (`rules: { loc: boolean, suppressions: boolean, debtMarkers: boolean, consoleLog: boolean, testRunner: boolean }`).
- [x] #2 `audit-engine.mjs` y `auditService.ts` resuelven la configuracion de `.gripm/config.json` con fallback seguro a los valores predeterminados sin requerir configuracion obligatoria.
- [x] #3 Desactivar una regla omite sus penalizaciones en el calculo determinista del Health Score y excluye sus hallazgos en las salidas CLI, REST y MCP.
- [x] #4 Soporte de patrones de exclusion especificos de auditoria (`audit.exclude`) para aislar carpetas o fixtures (por ejemplo, scripts de test de auditoria) sin alterar el `.gitignore` global.
- [x] #5 El panel visual de diagnostico (`AuditModal.tsx`) y el comando CLI reflejan las reglas activas y respetan la configuracion del proyecto.
- [x] #6 Suite de pruebas automatizadas que valide la persistencia de configuracion, la retrocompatibilidad con repositorios existentes y la paridad de comportamiento.
<!-- AC:END -->

## Plan de Implementacion

1. **Config & Schema:** Extender la definicion de configuracion en `scripts/initScaffold.js` y `src/data/types.ts`.
2. **Motor Canonico (`audit-engine.mjs`):** Incorporar lectura de opciones de auditoria desde `.gripm/config.json` con fallbacks agnosticos.
3. **Servicio Backend (`auditService.ts`):** Propagar opciones resueltas a llamadas REST y MCP.
4. **UI & Cockpit:** Incorporar indicadores de reglas activas en `AuditModal.tsx`.
5. **Verificacion:** Tests unitarios y de integracion headless.
