---
id: DEV-306
title: "Gobernanza Documental: ADRs, Alineación con Playbook y Saneamiento de Normas"
status: ready
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "documentation"
  - "adr"
  - "architecture"
  - "governance"
  - "playbook"
dependencies: []
priority: medium
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Actualización y sincronización exhaustiva de la documentación técnica de arquitectura, registro formal de ADRs pendientes, resolución de contradicciones normativas en `AGENTS.md` y reparación de las herramientas de integración del framework Gripm Playbook (`gate-qa.mjs`, `sync-playbook.mjs`, `.playbook-lock.json`).

### Diagnóstico de la Causa Raíz:

1. **`docs/ARCHITECTURE.md` Desfasado:**
   - Afirma que el backend corre dentro de `vite.config.ts` (desacoplado a `server/` en `v1.1.0` y servido por servidor HTTP nativo en `DEV-290`).
   - Describe un servidor inexistente llamado `"CodeGraph MCP"` (`lines 99-108`) que nunca formó parte del repositorio.
   - Omite componentes y módulos actuales de primera clase: `TimelineView` (Roadmap), `MetricsView` (Analytics), `universalImporter`, `atomicWrite.ts`, etc.
2. **Desincronización de Registros de Arquitectura (`docs/adr/`):**
   - `docs/adr/0002-backend-embebido-como-plugin-de-vite.md` sigue figurando con estado `Aceptado`. Tras `DEV-290`, el servidor de producción es un ejecutable HTTP nativo desacoplado de Vite. Falta marcar `ADR-0002` como `Reemplazado` y formalizar `ADR-0006`.
3. **Contradicción Normativa en `AGENTS.md`:**
   - Gotcha 12 y `ADR-0005:53` exigen usar `text-[11px]` en advertencias y confirmaciones.
   - Gotcha 21 (`UX-011`) prohíbe terminantemente usar `text-[11px]` en cualquier componente de UI.
4. **Herramientas de Playbook Desalineadas:**
   - `scripts/gate-qa.mjs` busca scripts inexistentes en `package.json` (`validate`, `gate:review`, `audit:ux:strict`), fallando con código 1 en downstream projects.
   - `scripts/sync-playbook.mjs` crashea con `TypeError: pack is not iterable` al usar `--stack` o `--list-stacks` porque `.playbook-manifest.json` define cada stack como un objeto `{ description, files }` en vez de array.
   - `npm run playbook:check` falla con exit code 1 en modo `--dry-run` por la presencia de archivos modificados legítimamente en `lock.customizations`.
   - `.playbook-lock.json:3` contiene commiteada una ruta local absoluta (`C:\Users\Pablo\...`).
5. **Prefijos Heterogéneos en Tareas:**
   - 101 archivos históricos (`dev-001` a `dev-101`) preservan el prefijo en minúscula `dev-` en su nombre de archivo en disco mientras su YAML frontmatter declara `DEV-XXX`.

### Solución Arquitectónica Profunda:

- **Reescritura de `docs/ARCHITECTURE.md`:** Reflejar con precisión milimétrica la arquitectura actual del producto (servidor HTTP nativo en `bin/gripm.js`, capa `server/`, standalone MCP, módulos de Timeline/Metrics y adaptadores Sandbox).
- **Formalización de ADR-0006:** Registrar la arquitectura de servidor estático desacoplado de Vite para producción y marcar `ADR-0002` como `Reemplazado`.
- **Resolución Normativa:** Alinear `AGENTS.md` Gotcha 12 y `ADR-0005` al token estándar `text-xs`.
- **Adaptabilidad de `gate-qa.mjs` y `sync-playbook.mjs`:**
  - Hacer que `gate-qa.mjs` detecte dinámicamente los scripts de verificación disponibles en el `package.json` del host (`tsc`, `test`, `backlog:check`, `audit:ux`, `publish:check`, `build`).
  - Normalizar `const packFiles = Array.isArray(pack) ? pack : (pack?.files ?? []);` en `sync-playbook.mjs` y no salir con código 1 en `--dry-run` ante archivos en `customizations`.
  - Sanitizar `.playbook-lock.json` usando ruta relativa `../gripm-playbook`.
- **Normalización de Tareas:** Estandarizar los 101 nombres de archivo a mayúsculas canónicas `DEV-XXX`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `docs/ARCHITECTURE.md` refleja la arquitectura real de `v1.5.0` (arquitectura de `server/`, servidor HTTP nativo sin Vite en producción, módulos Timeline/Metrics e Importador Universal), eliminando toda mención a CodeGraph
- [x] #2 Se formaliza `ADR-0006` para el servidor estático desacoplado de Vite en producción y `ADR-0002` queda marcado formalmente como `Reemplazado`
- [x] #3 Se elimina la contradicción tipográfica en `AGENTS.md` y `ADR-0005`, consolidando el uso de `text-xs`
- [x] #4 `scripts/gate-qa.mjs` ejecuta limpiamente adaptándose a los scripts definidos en `package.json`
- [x] #5 `scripts/sync-playbook.mjs` procesa los comandos `--stack` y `--list-stacks` sin errores de tipo y no emite código 1 ante archivos en `customizations` bajo `--dry-run`
- [x] #6 `.playbook-lock.json` no contiene rutas locales absolutas
- [x] #7 Descartado por instrucción explícita del PO: preservación de nombres de archivo históricos pre-v1 sin churn innecesario de disco
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Actualizar `docs/ARCHITECTURE.md` y eliminar menciones obsoletas.
2. Crear `docs/adr/0006-servidor-estatico-produccion-desacoplado-de-vite.md` y actualizar `0002`.
3. Alinear la regla tipográfica en `AGENTS.md` y `ADR-0005`.
4. Corregir el manejo de stacks y salida de `sync-playbook.mjs`.
5. Adaptar `scripts/gate-qa.mjs` para consumir la pirámide del proyecto.
6. Sanitizar `.playbook-lock.json`.
7. Normalizar nombres de archivos `dev-` a `DEV-` y correr `npm run backlog:sync`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->
