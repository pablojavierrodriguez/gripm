---
id: DEV-307
title: "Packaging de Producción Limpio: Adelgazamiento del Tarball npm y Exclusión de Fuentes"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-17 17:20'
labels:
  - "packaging"
  - "npm"
  - "cli"
  - "build"
  - "distribution"
dependencies: []
priority: medium
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optimización radical de la superficie de distribución del paquete npm `@gripm/board`: exclusión del código fuente de desarrollo (`src/`, `server/`, `scripts/`, `.githooks/`), reducción de la huella de instalación y fortalecimiento de las verificaciones de empaquetado para garantizar un tarball productivo minimalista y autocontenido.

### Diagnóstico de la Causa Raíz:

Actualmente, el campo `"files"` de `package.json:48-66` declara:
```json
"files": [
  ".agents/skills/gripm",
  ".githooks",
  "audit-ux-baseline.json",
  "bin",
  "dist",
  "public",
  "scripts",
  "server",
  "src",
  "data/demo-backlog.json",
  ...
]
```
Esto provoca que el paquete distribuido en npm arrastre más de 76 archivos internos:
1. **Todo el árbol de fuentes TypeScript de React (`src/`):** A pesar de que `dist/` contiene los bundles compilados para el navegador, se incluye todo `src/` únicamente porque `bin/gripm.js` y `server/plugin.ts` importaban archivos `.ts` en crudo.
2. **Todos los scripts de pruebas internas (`scripts/`):** Se distribuyen 24 scripts internos de test (`scripts/test-*.js`, `scripts/verify-*.js`, `scripts/repro-ci-linux.sh`, `scripts/watchdog.js`).
3. **Archivos de metodología Playbook en `scripts/`:** Se distribuyen `scripts/gate-qa.mjs`, `scripts/sync-playbook.mjs`, `scripts/audit-ux-code.cjs` y `scripts/ux-rules.json`, contradiciendo `AGENTS.md` §0 (que establece que los artefactos del Playbook están excluidos del tarball de producción).
4. **Baselines y hooks internos:** `.githooks` y `audit-ux-baseline.json` se incluyen en el paquete de producción sin tener ninguna utilidad para el usuario final.

### Solución Arquitectónica Profunda:

- **Distribución de Artefactos Precompilados:**
  Con la compilación de ejecutables y servidor en `bin/` y la compilación web en `dist/`, el paquete de npm solo necesita distribuir:
  - `bin/`: Binarios ejecutables de Node (`gripm.js`, `gripm-mcp.js`, `server.js`, `gripm-cli.js`).
  - `dist/`: Aplicación web compilada y optimizada.
  - `public/`: Activos públicos.
  - `data/demo-backlog.json`: Datos iniciales de demostración.
  - `.agents/skills/gripm/SKILL.md`: Skill oficial de conexión para agentes de IA.
  - `LICENSE`, `README.md`, `README.es.md`.
- **Exclusión Radical:**
  Remover `"src"`, `"scripts"`, `"server"`, `".githooks"` y `"audit-ux-baseline.json"` del array `"files"` en `package.json`.
- **Blindaje en `verify-publish-surface.js`:**
  Ampliar `FORBIDDEN_PLAYBOOK_ENTRIES` y las reglas de inspección física para certificar que el tarball empaquetado (`npm pack`) nunca contenga código fuente `.ts`, scripts de test ni artefactos de Playbook.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El campo `"files"` en `package.json` restringe la distribución exclusivamente a `bin`, `dist`, `public`, `data/demo-backlog.json`, `.agents/skills/gripm/SKILL.md` y documentación legal/README
- [x] #2 El tarball de producción (`npm pack`) no contiene directorios `src/`, `server/`, `scripts/`, `.githooks/` ni archivos `audit-ux-baseline.json`
- [x] #3 La instalación y ejecución del paquete distribuido en un entorno limpio sin devDependencies (`npm install --omit=dev`) funciona al 100% (modo web cockpit, CLI y servidor MCP)
- [x] #4 `scripts/verify-publish-surface.js` audita y bloquea la presencia accidental de scripts de prueba o código fuente en el paquete empaquetado
- [x] #5 `npm run publish:check` y `npm run verify:dist` aprueban limpiamente con código de salida 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Garantizar que todos los entrypoints necesarios para CLI y server estén precompilados en `bin/`.
2. Actualizar el campo `"files"` en `package.json`.
3. Actualizar `scripts/verify-publish-surface.js` con las nuevas reglas de exclusión estricta.
4. Ejecutar `npm run publish:check` y `npm run verify:dist` para validar la integridad del paquete generado.
<!-- SECTION:PLAN:END -->
