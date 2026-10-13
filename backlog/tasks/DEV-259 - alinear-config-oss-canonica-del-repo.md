---
id: DEV-259
title: "Alinear .gripm/config.json del repo con la configuración OSS canónica documentada en AGENTS.md"
status: ready
created_date: '2026-10-13'
updated_date: '2026-10-13'
labels:
  - "chore"
  - "config"
  - "governance"
dependencies: []
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El gotcha 17 de `AGENTS.md` declara que `.gripm/config.json` define la configuración OSS canónica del repositorio, y la describe con `"methodology": "kanban"` y `"enabledTabs": { "kanban": true, "sprint": false, "release": true }`. El archivo commiteado no coincidía con esa descripción en dos claves, y además arrastraba defaults de esquema que ya no existían en el modelo de configuración vigente.

Divergencias detectadas al contrastar disco contra documentación:

| Clave | En HEAD | Canónico (gotcha 17) | Motivo del cambio |
| :--- | :--- | :--- | :--- |
| `methodology` | `scrum` | `kanban` | El repo opera bajo flujo Kanban continuo (gotcha 16); `scrum` contradecía la propia metodología declarada |
| `mode` | `single` | — | Estado real del entorno de trabajo, sin efecto en la distribución |
| `enabledTabs.sprint` | `true` | `false` | Alineación con el canónico documentado |
| `modules.calendar` | ausente | — | Default de esquema |
| `estimation` | ausente | — | Default de esquema (DEV-137/DEV-139) |
| `visibleCardMetadata` | ausente | — | Default de esquema (8 claves) |

Alcance:
1. `enabledTabs.sprint` pasa a `false` para respetar el canónico documentado.
2. Se conservan los defaults de esquema incorporados (`calendar`, `estimation`, `visibleCardMetadata`), que son la forma normalizada que el modelo vigente espera y no constituyen preferencias personales.
3. Verificar que el tab de Sprints deshabilitado no deja la app en un estado inconsistente: `App.tsx` ya resuelve el caso con la auto-redirección `sprint → kanban`, de modo que `defaultView: "sprint"` degrada sin intervención.

Fuera de alcance: modificar `AGENTS.md` (el canónico documentado es la referencia a la que se alinea la config), `defaultView`, y cualquier clave de `theme`, `density` o `language`, que ya coinciden con el canónico.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `.gripm/config.json` declara `methodology: "kanban"` y `enabledTabs: { "kanban": true, "sprint": false, "release": true }`, coincidindo con el canónico del gotcha 17 de `AGENTS.md`
- [x] #2 El JSON sigue siendo válido (parseado con `ConvertFrom-Json`) y conserva la ausencia de newline terminal que tenía en HEAD (último byte `125` = `}`)
- [x] #3 Con `enabledTabs.sprint: false` la app no queda en un tab huérfano: `activeTab` se inicializa desde `localStorage` o `kanban` y **no** desde `config.defaultView`, y un `activeTab: 'sprint'` persistido degrada por la auto-redirección de `App.tsx` hacia `kanban`. Verificado en runtime con `npm run test:ui` (Playwright) en verde
- [x] #4 `npm run backlog:sync` y `npm run backlog:check` reportan coherencia con `BACKLOG.md`
- [x] #5 `npm test` sigue en verde (16/16 pasos) y `node scripts/verify-changes.js --all` valida el árbol (415 archivos)
<!-- SECTION:DESCRIPTION:END -->