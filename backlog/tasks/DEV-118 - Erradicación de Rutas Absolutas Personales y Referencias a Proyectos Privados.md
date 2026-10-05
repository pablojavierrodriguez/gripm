---
id: DEV-118
title: "Erradicación de Rutas Absolutas Personales y Referencias a Proyectos Privados"
status: done
created_date: '2026-09-28'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: urgent
type: bug
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Eliminar todas las rutas absolutas hardcodeadas (`/Users/<usuario>/<ruta-personal>`), referencias a proyectos privados y directorios locales de todos los archivos rastreados por Git. Garantizar que ningún dato personal o de proyectos privados se filtre al hacer público el repositorio.

Archivos afectados:
- `scripts/migrate-to-target-repo.js` — eliminar (script personal)
- `scripts/import-docs.js` — eliminar (script de migración personal)
- `vite.config.ts` L113 — ruta hardcodeada `/Users/<usuario>/<ruta-personal>`
- `data/projects-registry.json` — destrackear de Git (ya en .gitignore)
- `.agents/rules/codebase-navigation.md` — links `file:///Users/<usuario>/<ruta-personal>` → rutas relativas
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Eliminar `scripts/migrate-to-target-repo.js` del repositorio (script de uso personal, no del producto) — verificado que nada lo importa
- [x] #3 Limpiar `vite.config.ts`: se eliminó el bloque `if (project.id === 'dom')` con la ruta absoluta hardcodeada. La función `getProjectDocsPath` vuelve a devolver `null` cuando no encuentra docs
- [x] #4 `data/projects-registry.json` destrackear de Git — **ya cumplido de facto**: el archivo está en `.gitignore` (línea 30) y nunca fue trackeado. `git ls-files --error-unmatch` lo confirma. No había nada que ejecutar
  - **CORRECCIÓN (DEV-151):** este criterio estaba mal verificado y su justificación era incorrecta. `.gitignore` protege el canal **Git**, pero no el canal de distribución **npm**: el campo `files` de `package.json` es una allowlist que*pasa por encima* de `.gitignore`, e incluía el directorio `data` completo, por lo que el archivo **sí se publicaba** en el tarball con rutas absolutas personales. La verificación correcta es `npm pack` + escaneo del contenido extraído. Resuelto en DEV-151.
- [x] #5 Reescribir los links `file:///` a rutas relativas
- [x] #6 Verificar con grep sobre archivos rastreados que no queda ninguna ruta absoluta personal (verificación ejecutada con el patrón completo, y el propio criterio redactado para que la comprobación sea satisfacible)
- [x] #7 Verificar que `npx tsc --noEmit` y `npm test` pasan correctamente post-limpieza
- [x] #8 **AMPLIACIÓN**: sanitizar `scripts/import-docs.js` en vez de eliminarlo (3 puntos). El módulo fue renombrado después en DEV-135, al dejar de ser un script personal y pasar a ser superficie del producto
- [x] #9 **AMPLIACIÓN**: limpiar los 47 links `file:///` de `docs/ARCHITECTURE.md` y `docs/AGENTIC_PLAYBOOK.md`, ausentes del alcance original
- [x] #10 **AMPLIACIÓN**: redactar con placeholders las rutas personales citadas en las descripciones de DEV-118 y DEV-119, para que el AC #6 sea alcanzable sin destruir el sentido de las tareas
- [x] #11 `npm run build` sigue funcionando tras la eliminación del script y el cambio en `vite.config.ts`
- [x] #12 `npm run audit:ux` sigue con 0 errores y 0 advertencias
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Auditar qué archivos rastreados contienen rutas personales, en lugar de
   confiar en la lista de archivos del AC.
2. Verificar, antes de borrar cada script, si algo lo importa. Esto reveló que
   `import-docs.js` es el motor de importación en uso.
3. Eliminar `migrate-to-target-repo.js`, que no está referenciado por nadie.
4. Eliminar el fallback `if (project.id === 'dom')` de `vite.config.ts`.
5. Sanitizar `import-docs.js`: eliminar la ruta absoluta embebida y exigir
   `projectMeta` y directorio de documentación en vez de inventar un proyecto por defecto.
6. Convertir los links `file:///Users/...` a rutas relativas en los tres
   documentos afectados, incluidos los dos que no figuraban en el alcance.
7. Redactar con placeholders las rutas citadas en las descripciones de DEV-118 y
   DEV-119, y regenerar `BACKLOG.md`.
8. Verificar con grep sobre archivos rastreados, y correr la pirámide completa
   más `build` y `audit:ux`.
<!-- SECTION:PLAN:END -->
