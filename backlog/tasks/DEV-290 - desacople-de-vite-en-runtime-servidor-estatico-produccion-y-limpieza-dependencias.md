---
id: DEV-290
title: "Desacople de Vite en Runtime: Servidor estático para producción y reducción de dependencias"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-15 23:26'
labels:
  - "cli"
  - "packaging"
  - "runtime"
  - "vite"
  - "npm"
dependencies: []
priority: urgent
type: architecture
estimate: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Desacoplamiento del servidor de desarrollo de Vite del comando ejecutable de producción `bin/gripm.js` para que sirva los activos precompilados de `dist/` en lugar de compilar en caliente TypeScript y procesar CSS con PostCSS/Tailwind en la máquina del usuario final.

### Problemas identificados y reproducibles:

1. **Dev Server en Producción:**
   En `bin/gripm.js:357-375`, `gripm` ejecuta `createServer()` de Vite apuntando a `vite.config.ts`. El bundle productivo `dist/` generado por `npm run build` nunca se sirve.
2. **Dependencias infladas en producción (Bloat):**
   Para que `bin/gripm.js` funcione, `package.json` declara en `dependencies`: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `react`, `react-dom`, `lucide-react`. Esto fuerza una descarga de más de 120 MB en `npm install -g @gripm/board`.
3. **Incompatibilidad de motores Node:**
   `package.json` declara `"engines": { "node": ">=20.0.0" }`, pero los scripts usan `--experimental-strip-types` (requiere `>=22.6.0`). En Node 20 LTS, `npm test` o `npm run tasks` aborta con `bad option: --experimental-strip-types`.

### Script de Reproducción Inmediata (PoC):

```bash
# Simular instalación limpia sin devDependencies en Node 20
npm pack
mkdir -p /tmp/gripm-clean && cd /tmp/gripm-clean
npm install --omit=dev /path/to/gripm-board-*.tgz
# En el estado actual, el paquete arrastra vite y esbuild (~130MB)
npx @gripm/board --version
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `bin/gripm.js` en modo producción sirve la interfaz compilada desde `dist/` utilizando un servidor estático minimalista (o módulo HTTP nativo de Node), sin invocar `createServer()` de Vite
- [x] #2 `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss` y `autoprefixer` se mueven de `dependencies` a `devDependencies` en `package.json`
- [x] #3 La huella de instalación en `node_modules` para una instalación de producción (`npm install --omit=dev`) se reduce de más de 120 MB a menos de 10 MB
- [x] #4 El campo `engines.node` en `package.json` y la ejecución de scripts se unifican de forma compatible con la versión mínima declarada
- [x] #5 La suite de pruebas de empaquetado y superficie de publicación aprueban limpiamente (`npm run publish:check` y `npm run verify:dist`)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->
