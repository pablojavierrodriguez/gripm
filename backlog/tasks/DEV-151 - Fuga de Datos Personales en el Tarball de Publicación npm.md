---
id: DEV-151
title: "Fuga de Datos Personales en el Tarball de Publicación npm (registry allowlist vs .gitignore)"
status: done
created_date: '2026-10-03'
updated_date: '2026-10-04 00:15'
labels:
  - "security"
  - "packaging"
  - "open-source-launch"
  - "privacy"
dependencies:
  - "DEV-118"
  - "DEV-147"
priority: critical
type: bugfix
sprints:
  - "Sprint 8"
sprint: "Sprint 8"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fuga confirmada de datos personales privados dentro del artefacto que se publica en npm, que impedía lanzar el repositorio público sin exponer información del autor.

`data/projects-registry.json` contiene rutas absolutas del entorno local del autor y el nombre de un repositorio privado. El archivo está correctamente excluido de Git mediante `.gitignore`, **pero se publicaba igual en el tarball de npm**, porque el campo `files` de `package.json` es una *allowlist* que tiene precedencia sobre `.gitignore` e incluía el directorio completo `data`.

Contenido filtrado (3 ocurrencias) :
- `repoPath` de un repositorio de trabajo del autor (ruta absoluta bajo el home del usuario).
- `repoPath` de un proyecto privado referred por nombre (`code/m3`).

**Causa raíz (por qué sobrevivió al saneamiento previo):** DEV-118 AC #4 dio la fuga por resuelta argumentando que el archivo *"ya estaba en `.gitignore` y nunca fue trackeado"*. La verificación se hizo contra el modelo de amenaza equivocado: `.gitignore` protege el repositorio **Git**, pero no tiene efecto sobre el canal de distribución **npm**. La tarea se cerró `done` sin comprobar nunca el tarball real. Los AC #5 a #10 de DEV-118 fueron correctos; el punto ciego fue exactamente la frontera de empaquetado.

**Impacto:** cualquier persona podía ejecutar `npm pack` y obtener las rutas privadas del autor y el nombre de un repo no público, sin necesidad de acceso al repositorio.

**Resolución:** angostar el campo `files` para incluir únicamente el archivo de demostración que sí es necesario en runtime (`data/demo-backlog.json`) en lugar del directorio `data` completo. Se preference esta vía sobre `.npmignore` porque `files` es la allowlist canónica y elimina la ambigüedad de precedencia entre ambos mecanismos, haciendo el resultado determinista e irreversible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `npm pack --dry-run` no lista `data/projects-registry.json` entre los archivos del tarball
- [x] #2 El campo `files` de `package.json` referencia `data/demo-backlog.json` de forma explícita en lugar del directorio `data`
- [x] #3 `data/demo-backlog.json` sigue presente en el tarball (el proyecto demo functionality no se rompe)
- [x] #4 Verificación de contenido sobre el tarball real extraído: cero coincidencias de `/Users/`, del nombre de usuario del autor, de `Pablo/code` y de los nombres de proyectos privados
- [x] #5 `npm test` pasa, incluido el smoke test de empaquetado que valida la ejecución de `bin/gripm.js` desde el tarball extraído
- [x] #6 `npx tsc --noEmit` sin errores y `npm run backlog:check` en 100% tras el cambio
- [x] #7 Corregir el AC #4 de DEV-118 para que refleje el modelo de amenaza real (npm vs Git) y no.close la tarea con una verificación que solo cubre Git
- [x] #8 Agregar al CI un gate que falle si `npm pack` incluye archivos no permitidos por una allowlist explícita (`npm run publish:check`, verificado con exit 1 al reintroducir la fuga y exit 0 tras el fix)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. En `package.json`, sustituir la entrada `"data"` del array `files` por `"data/demo-backlog.json"`, preservando el archivo de demo que `vite.config.ts` resuelve como `DEMO_FILE`.
2. Ejecutar `npm pack --dry-run` y confirmar que `data/projects-registry.json` desapareció del listado.
3. Generar el tarball real, extraerlo y escanear su contenido con un patrón de rutas absolutas y nombres de proyectos privados, para validar el contenido y no solo el listado de archivos.
4. Eliminar el `.tgz` generado para no dejar artefactos de build en el árbol de trabajo.
5. Reejecutar la pirámide de verificación completa (`tsc`, `npm test`, `backlog:check`).
<!-- SECTION:PLAN:END -->

## Technical Notes

<!-- SECTION:NOTES:BEGIN -->
### Por qué `files` y no `.npmignore`

Las rutas de exclusión de npm tienen una precedencia poco intuitiva y fácil de romper: cuando coexisten `files` y `.npmignore`, las entradas explícitas de `files` prevalecen. Un `.npmignore` con `data/` junto a un `files` que contiene `data` produce un resultado que depende del matiz de resolución, no de la intención declarada.

Angostar la allowlist hace que la exclusión sea **estructural**: el archivo privado sencillamente nunca es candidato a publicación. No requiere depender del orden de resolución y no se rompe si alguien reorganiza `.gitignore`.

### El gap de proceso que hay que cerrar

DEV-118 verificó la higiene de datos con `git grep` sobre archivos rastreados. Eso es correcto para el repositorio, pero el producto se distribuye por dos canales con modelos de amenaza distintos:

| Canal | Modelo de amenaza | Verificación correcta |
| :--- | :--- | :--- |
| Git (`git push`) | Historial inmutable: lo commiteado queda para siempre | `git grep` + `git log -S` sobre `--all` |
| npm (`npm pack`) | Allowlist `files`, ignora `.gitignore` | Extraer el tarball y escanear su contenido |

El AC #8 de esta tarea existe para que la próxima fuga de empaquetado se detecte en CI y no en una auditoría manual previa al lanzamiento.
<!-- SECTION:NOTES:END -->