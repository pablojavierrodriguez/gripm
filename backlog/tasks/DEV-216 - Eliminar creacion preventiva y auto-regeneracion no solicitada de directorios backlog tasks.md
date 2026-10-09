---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
release: "1.0.5"
milestone: "1.0.5"
id: DEV-216
title: "Eliminar creación preventiva y auto-regeneración no solicitada de directorios backlog tasks"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "cli"
  - "dx"
  - "resilience"
  - "filesystem"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evitar la creación involuntaria de carpetas `backlog/tasks` en directorios arbitrarios del sistema (ej: carpetas raíz o home del usuario):
1. **Operación de solo lectura pura en el servidor (`vite.config.ts`):** `readProjectBacklog` no debe invocar `fs.mkdirSync(tasksDir)`. Si el directorio no existe, debe retornar una colección vacía (`items: []`) sin mutar el disco.
2. **Cero creación preventiva en el CLI (`bin/gripm.js`):** Al detectar el tipo de almacenamiento en el arranque, `bin/gripm.js` no debe crear `backlog/tasks` al vuelo. La creación en disco debe ocurrir exclusivamente ante `--init` explícito o cuando el usuario crea una tarea.
3. **Protección del directorio home en el registro (`bin/gripm.js`):** Evitar auto-registrar el directorio `os.homedir()` en `~/.gripm/registry.json` ante ejecuciones no intencionales de la CLI sin flag `--repo` ni `--init`.
4. **Limpieza de registros y carpetas parásitas:** Purgar del registro global de proyectos las rutas huérfanas o accidentales (`.code`, home del usuario y temporales inexistentes) y eliminar las carpetas residuales vacías creadas indebidamente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 readProjectBacklog en vite.config.ts es estrictamente de solo lectura y no ejecuta mkdirSync si tasksDir no existe
- [x] #2 bin/gripm.js no crea preventivamente la carpeta backlog/tasks en disco al arrancar
- [x] #3 bin/gripm.js evita registrar el directorio home del usuario (os.homedir()) en registry.json en ejecuciones por defecto
- [x] #4 Se limpian las entradas parasitas de ~/.gripm/registry.json y las carpetas residuales huerfanas generadas por auto-creacion
- [x] #5 La suite de pruebas npm test, npm run backlog:check y npm run publish:check pasan con codigo de salida 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Preservar que saveBacklogMdItem y gripm_create_task creen tasksDir al momento de guardar el primer ítem si aún no existe.
<!-- SECTION:NOTES:END -->
