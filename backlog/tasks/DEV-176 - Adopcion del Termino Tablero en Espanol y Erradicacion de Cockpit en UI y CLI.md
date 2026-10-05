---
id: DEV-176
title: "Adopción del Término Tablero en Español y Sustitución de Cockpit en UI y CLI"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05 10:00'
labels:
  - "i18n"
  - "ui"
  - "branding"
  - "copywriting"
dependencies: []
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En la versión en español, la interfaz y los scripts utilizaban el término anglosajón 'cockpit', el cual resulta forzado, poco intuitivo y distante para los desarrolladores hispanohablantes.

Tras la deliberación de identidad y narrativa del producto, se adopta de forma canónica el término **'tablero'** (y **'tablero ágil'** cuando califica al sistema), por ser una definición directa, transparente, alineada con la cultura de ingeniería y perfectamente coherente con el comando nativo del CLI (`npm run board`).

### Cambios a realizar:
1. **Internacionalización en UI:**
   - Incorporar claves `app.badge` y `settings.systemTitle` en diccionarios `src/locales/es.json` y `en.json`.
   - En `src/App.tsx`, reemplazar el badge hardcodeado 'cockpit' por `t('app.badge')` ('tablero' en español, 'board' en inglés).
   - En `src/components/SettingsView.tsx`, reemplazar `<span>gripm Cockpit</span>` por `<span>{t('settings.systemTitle')}</span>`.
2. **Splash HTML estático:**
   - En `index.html`, actualizar el badge a 'tablero' y el texto a 'Iniciando tablero ágil...'.
3. **Banners y mensajes CLI:**
   - En `bin/gripm.js`, actualizar el banner de arranque a 'Tablero Ágil de Ingeniería y Producto con IA'.
   - En `scripts/initScaffold.js`, actualizar la instrucción a 'Para abrir el tablero:'.
4. **Documentación en Español:**
   - En `README.es.md` y `docs/ARCHITECTURE.md`, sustituir referencias no intencionadas de 'cockpit' por 'tablero' o 'tablero ágil'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `src/locales/es.json` y `src/locales/en.json` exponen `app.badge` ("tablero" / "board") y `settings.systemTitle` ("gripm Tablero" / "gripm Board")
- [x] #2 `src/App.tsx` utiliza `t('app.badge')` en el badge de carga de la aplicación en lugar del literal hardcodeado 'cockpit'
- [x] #3 `src/components/SettingsView.tsx` renderiza `t('settings.systemTitle')` en la tarjeta de información del sistema en lugar del literal 'gripm Cockpit'
- [x] #4 `index.html` muestra 'tablero' y 'Iniciando tablero ágil...' en el splash inicial HTML estático
- [x] #5 `bin/gripm.js` y `scripts/initScaffold.js` utilizan 'Tablero Ágil' y 'Para abrir el tablero:' en sus salidas en español
- [x] #6 `README.es.md` y `docs/ARCHITECTURE.md` sustituyen 'cockpit' por 'tablero' / 'tablero ágil' en sus secciones en español
- [x] #7 `npx tsc --noEmit` compila con 0 errores, `npm test` pasa con exit 0, `npm run backlog:sync && npm run backlog:check` en verde y `npm run build` compila sin errores
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Agregar las nuevas claves de traducción en `src/locales/es.json` y `src/locales/en.json`.
2. Actualizar `src/App.tsx` para consumir `t('app.badge')`.
3. Actualizar `src/components/SettingsView.tsx` para consumir `t('settings.systemTitle')`.
4. Modificar `index.html` con la nueva terminología de arranque.
5. Modificar `bin/gripm.js` y `scripts/initScaffold.js`.
6. Actualizar `README.es.md` y `docs/ARCHITECTURE.md`.
7. Ejecutar sincronización de backlog y pirámide de verificación completa.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Se preserva 'cockpit' en los textos en inglés (`README.md`, descripciones del servidor MCP en `bin/gripm-mcp.js` y `scripts/mcp-server.ts`), donde la metáfora anglosajona es idiomática y estándar. La sustitución por 'tablero' aplica estrictamente a la experiencia en español y a la paridad bilingüe.
<!-- SECTION:NOTES:END -->
