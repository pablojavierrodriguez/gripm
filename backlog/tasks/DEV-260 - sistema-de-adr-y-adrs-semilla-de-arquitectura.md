---
id: DEV-260
title: "Sistema de ADR (Architecture Decision Records) en docs/adr y registro de las decisiones fundacionales de gripm"
status: done
created_date: '2026-10-13'
updated_date: '2026-10-15'
labels:
  - "docs"
  - "architecture"
  - "governance"
dependencies: []
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El Protocolo de Aprendizaje Continuo del playbook (`.agents/TEAM_PLAYBOOK.md`, sección "Continuous Learning Protocol") exige que todo patrón arquitectónico superior quede registrado como *Architectural Decision Record*, y la plantilla de sprint (`docs/sprints/SPRINT_SPEC_TEMPLATE.md`, sección "KNOWLEDGE FEED") reserva un campo `ADR Recorded: [path]` que hoy no tiene destino canónico. En el repositorio no existía ninguna carpeta `docs/adr/`, de modo que el protocolo era inaplicable y las decisiones arquitectónicas más load-bearing de gripm vivían únicamente dispersas en prosa de `AGENTS.md`, `README.md` y `docs/ARCHITECTURE.md`.

Decisiones ya tomadas y consolidadas en el código, hoy sin registro formal:

1. **Markdown como fuente de verdad** (`backlog-md`), con `BACKLOG.md` como consolidado generado y Git como control de versiones.
2. **Backend embebido como plugin de middleware de Vite** (`server/` + `vite.config.ts`), sin servidor de aplicación propio ni proceso adicional.
3. **Servidor MCP por stdio** (`scripts/mcp-server.ts` + `bin/gripm-mcp.js`), 12 herramientas JSON-RPC 2.0 sobre el mismo núcleo de persistencia que la UI.
4. **Daemon local monousuario sin autenticación HTTP** (SEC-10), mitigado con validación de `Host`/`Origin` y cabeceras de seguridad (SEC-01, DEV-243).
5. **Overlays montados con `createPortal` y layout raíz estable** (Zero-CLS), DEV-129, DEV-130 y gotcha 10 de `AGENTS.md`.

Alcance de esta tarea:
1. Crear `docs/adr/` con convención de nombres MADR (`NNNN-slug.md`, numeración secuencial e inmutable), estados canónicos y plantilla `0000-plantilla.md`.
2. Sembrar los 5 ADR fundacionales como registros de decisión **ya aceptados** (documentan el estado del arte, no abren debate).
3. Enlazar el registro desde `docs/ARCHITECTURE.md` y desde `AGENTS.md` (gotcha de trazabilidad arquitectónica).

Fuera de alcance: validación mecánica de la convención en `scripts/verify-changes.js` (decidido explícitamente con el PO: la convención queda documentada, sin fricción nueva en el gate), y renumerar o reescribir decisiones preexistentes en documentos actuales.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Existe `docs/adr/README.md` con: propósito del registro, criterio de "esto merece un ADR", anatomía del documento, estados canónicos (`Propuesta`, `Aceptado`, `Reemplazado`, `Obsoleto`), reglas de inmutabilidad y el índice completo de registros
- [x] #2 Existe `docs/adr/0000-plantilla.md` como plantilla reutilizable con las secciones del formato MADR (Contexto, Decision Drivers, Opciones consideradas, Decisión, Consecuencias, Referencias) y frontmatter de estado y fecha
- [x] #3 Los 5 ADR semilla existen con numeración `0001`-`0005` y slug kebab-case en español: `0001-markdown-como-fuente-de-verdad.md`, `0002-backend-embebido-como-plugin-de-vite.md`, `0003-servidor-mcp-por-stdio.md`, `0004-daemon-local-sin-autenticacion-http.md`, `0005-overlays-via-portales-y-layout-estable.md`
- [x] #4 Cada ADR semilla documenta contexto, opciones descartadas **con motivo**, decisión, consecuencias (positivas y negativas) y referencias a tareas del backlog que lo originaron
- [x] #5 `docs/ARCHITECTURE.md` incluye una sección que enlaza el registro de ADR y aclara que ARCHITECTURE.md describe el estado actual mientras que el ADR registra el porqué de las decisiones
- [x] #6 `AGENTS.md` incorpora un gotcha de trazabilidad arquitectónica que obliga a registrar en `docs/adr/` toda decisión con trade-offs reales, y remite al campo `ADR Recorded` de la plantilla de sprint
- [x] #7 `npm run backlog:sync` y `npm run backlog:check` reportan coherencia con `BACKLOG.md` (código 0)
- [x] #8 `node scripts/verify-changes.js --all` valida el árbol completo sin defectos estructurales ni de codificación
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `docs/adr/README.md` (convención + índice) y `docs/adr/0000-plantilla.md`.
2. Redactar los ADR `0001`-`0005` contrastando cada uno contra el código real (`server/`, `scripts/mcp-server.ts`, `server/middleware/security.ts`, `src/components/Modal.tsx`, `index.css`) para que no contengan afirmaciones no verificables.
3. Enlazar el registro desde `docs/ARCHITECTURE.md` y registrar el gotcha en `AGENTS.md`.
4. Correr `backlog:sync`, `backlog:check` y `verify-changes.js --all`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Los ADR semilla se marcan `Aceptado` porque no abren decisión: formalizan decisiones ya vigentes en el código, todas ellas trazables a tareas cerradas (`DEV-129`, `DEV-130`, `DEV-243`, `DEV-190`, `dev-001`, `dev-012`, `dev-025`).
- La convención queda **documentada, no verificada**: no se toca `scripts/verify-changes.js` en esta tarea para no agregar fricción al gate en la misma entrega que crea la convención. Si más adelante se quiere validación mecánica, corresponde a una tarea aparte.
- `docs/adr/` no se incluye en el campo `files` de `package.json`: es documentación de desarrollo, no superficie de distribución.

### [QA MATRIX] · Veredicto: APPROVED → `ready`

| # | Paso de la Pirámide | Comando | Resultado |
| :--- | :--- | :--- | :--- |
| 1 | Typecheck estricto | `npx tsc --noEmit` | ✅ exit 0 |
| 2 | Tests headless | `npm test` | ✅ 16/16 pasos, exit 0 (19.1s) |
| 3 | Consistencia spec ↔ backlog | `npm run backlog:sync` && `npm run backlog:check` | ✅ exit 0, `BACKLOG.md` coherente |
| 4 | Build de producción | `npm run build` | ✅ exit 0, binarios regenerados en `bin/` |
| 5 | Auditoría estática de UX | `node scripts/audit-ux-code.cjs --strict` | ⚠️ 0 errores, 12 warnings `UX-010` **preexistentes** en `ReleaseAssembler.tsx` y `SettingsView.tsx` |
| 5b | Gate de clases de defecto | `node scripts/verify-changes.js --all` | ✅ exit 0, 416 archivos |
| 5c | Superficie de distribución | `npm run publish:check` | ✅ exit 0, 115 archivos en tarball, sin `docs/adr/` |
| 6 | Navegador real | — | No aplica: el cambio es 100% documental Markdown (`AGENTS.md`, `docs/`), sin superficie de UI. |

**Sobre el paso 5:** `audit-ux-code.cjs --strict` devuelve exit 1 por 12 warnings `UX-010` (botones sólo-icono sin nombre accesible) en `src/components/ReleaseAssembler.tsx` y `src/components/SettingsView.tsx`. Verificado con `git status` que DEV-260 no toca `src/`: la salida es idéntica a la de HEAD y el debt es preexistente. No bloquea esta certificación documental, pero **queda como deuda abierta** a trackedear en una tarea propia.
<!-- SECTION:NOTES:END -->