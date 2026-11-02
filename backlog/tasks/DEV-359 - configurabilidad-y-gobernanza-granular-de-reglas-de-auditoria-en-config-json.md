---
id: DEV-359
title: "Configurabilidad y gobernanza granular de reglas de auditoría en config.json"
status: draft
priority: p2
type: feature
assignee: ""
sprint: ""
epic: DEV-352
created_at: "2026-11-02T01:17:00Z"
---

# DEV-359 - Configurabilidad y gobernanza granular de reglas de auditoría en config.json

## Descripción

Actualmente, el motor estático de auditoría y salud del repositorio (`audit-engine.mjs` y `auditService.ts`) opera con reglas predeterminadas estándar (techo LOC de 1000 líneas, advertencia en 500, análisis de supresiones `@ts-ignore`, detección de infraestructura de pruebas y marcadores de deuda técnica).

Para repositorios con estándares particulares o necesidades específicas de refinamiento (por ejemplo, excluir archivos de test de las advertencias de supresión, activar o desactivar la verificación de `console.log`, o ajustar umbrales de presupuesto), es necesario hacer que las variables y el alcance de la auditoría sean configurables mediante la sección `audit` de `.gripm/config.json`.

## Criterios de Aceptación (AC)

- [ ] AC #1: El esquema de configuración de `.gripm/config.json` soporta la clave opcional `audit` con definición de reglas activas y umbrales (`rules: { loc: boolean, suppressions: boolean, debtMarkers: boolean, consoleLog: boolean, testRunner: boolean }`).
- [ ] AC #2: `audit-engine.mjs` y `auditService.ts` resuelven la configuración de `.gripm/config.json` con fallback seguro a los valores predeterminados sin requerir configuración obligatoria.
- [ ] AC #3: Desactivar una regla omite sus penalizaciones en el cálculo determinista del Health Score y excluye sus hallazgos en las salidas CLI, REST y MCP.
- [ ] AC #4: Soporte de patrones de exclusión específicos de auditoría (`audit.exclude`) para aislar carpetas o fixtures (por ejemplo, scripts de test de auditoría) sin alterar el `.gitignore` global.
- [ ] AC #5: El panel visual de diagnóstico (`AuditModal.tsx`) y el comando CLI reflejan las reglas activas y respetan la configuración del proyecto.
- [ ] AC #6: Suite de pruebas automatizadas que valide la persistencia de configuración, la retrocompatibilidad con repositorios existentes y la paridad de comportamiento.

## Plan de Implementación

1. **Config & Schema:** Extender la definición de configuración en `scripts/initScaffold.js` y `src/data/types.ts`.
2. **Motor Canónico (`audit-engine.mjs`):** Incorporar lectura de opciones de auditoría desde `.gripm/config.json` con fallbacks agnósticos.
3. **Servicio Backend (`auditService.ts`):** Propagar opciones resueltas a llamadas REST y MCP.
4. **UI & Cockpit:** Incorporar indicadores de reglas activas en `AuditModal.tsx`.
5. **Verificación:** Tests unitarios y de integración headless.
