---
id: DEV-337
title: "El asistente init minimal anuncia tareas y entrega un backlog vacio con exit 0"
status: ready
created_date: '2026-10-23'
updated_date: '2026-10-24'
labels:
  - "onboarding"
  - "cli"
  - "bug"
dependencies: []
priority: high
type: bug
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El primer contacto de cualquier proyecto nuevo con gripm es `gripm --init`. En un proyecto aleatorio vacio, ejecutado desde el tarball instalado limpio el 2026-10-23:

```
node node_modules/@gripm/board/bin/gripm.js --init --yes --minimal --no-playbook --lang es
```

- **Sale con codigo 0** y cierra con mensajes de exito y con el consejo tipico de instalacion global.
- **El perfil se anuncia prometiendo tareas.** `scripts/initScaffold.js:174` y `:179` describen la opcion como *"Minimalista AI-First (Recomendado: Kanban puro, sin timeboxes ni ceremonias, **solo tareas y skill**)"*.
- **Cero tareas creadas.** `backlog/tasks/` queda como directorio vacio.
- **No se genera** `backlog/releases.json` ni `BACKLOG.md`.

Lo unico que instancio:

| Artefacto | Resultado |
| --- | --- |
| `.gripm/config.json` | 528 B, correcto |
| `.agents/skills/gripm/SKILL.md` | 13966 B, correcto |
| `.gitignore` | 58 B, correcto |
| `backlog/tasks/` | **directorio vacio** |
| `backlog/releases.json` | **ausente** |
| `BACKLOG.md` | **ausente** |

**Causa exacta, `scripts/initScaffold.js:356-364`:**

```js
const tasksDir = path.join(targetRepo, 'backlog/tasks');
if (!fs.existsSync(tasksDir)) {
  fs.mkdirSync(tasksDir, { recursive: true });
}
results.tasksDir = true;
```

El codigo solo crea el directorio y **declara el resultado cumplido**. No escribe ninguna tarea, pero `results.tasksDir = true` hace que el resumen reporte exito. El usuario ve un tick verde sobre un backlog vacio.

**No es una caida.** El tablero tolera el backlog vacio: arranca, renderiza la pestana Tablero con estados vacios correctos (`Sin tareas en este estado`) y la pestana Versiones muestra su empty state sin errores de consola. Ademas el bucle de escritura funciona: desde la interfaz se creo `backlog/tasks/PROY-001 - Verificar instalacion limpia desde tarball npm.md` con frontmatter valido, codigo autogenerado y slug coincidente.

**El defecto es de promesa, no de ejecucion.** El onboarding dice que entrega tareas y entrega una carpeta vacia marcada como exito. Un usuario que llega por primera vez queda con la duda de si algo fallo, y no hay ninguna tarea que le muestre como se usa el producto.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El PO decide y queda registrado el comportamiento canonico: o `--init` siembra al menos una tarea de ejemplo en `backlog/tasks/`, o el perfil `minimal` deja de prometer tareas en `scripts/initScaffold.js:174` y `:179`. Decision: Opcion A (no sembrar, corregir texto).
- [x] #2 Si se siembra, `gripm --init --yes --minimal --no-playbook` en un proyecto vacio crea al menos un archivo `.md` en `backlog/tasks/` y un `backlog/releases.json` que parsea como JSON. (No aplica: se adopto Opcion A).
- [x] #3 Si no se siembra, el texto del perfil y la ayuda de `--init` describen exactamente los artefactos que genera (config, skill, `.gitignore` y directorio `backlog/tasks/`), sin mencionar tareas que no crea.
- [x] #4 `results.tasksDir` no se declara cumplido sin evidencia: el resumen final de `--init` distingue entre directorio creado y contenido generado.
- [x] #5 El paso clean-room de DEV-336 verifica el comportamiento final elegido, de modo que una regresion aqui falle la suite y no se archive como exito.
- [x] #6 `npm test` sale con codigo 0 en Windows y con `npm run test:linux`.
- [x] #7 `npm run backlog:check` y `node scripts/verify-changes.js --all` salen con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Consultar al PO si el perfil `minimal` debe sembrar tareas o si la correccion es solo de texto.
2. Si siembra: generar la tarea de ejemplo y `backlog/releases.json` en la misma ruta de `initScaffold.js` que hoy crea el directorio.
3. Si no siembra: corregir las cadenas de `scripts/initScaffold.js:174` y `:179` en ambos idiomas y la ayuda de `--init`.
4. Separar en el resumen la creacion del directorio de la generacion de contenido.
5. Correr el clean-room de DEV-336, `npm test`, `test:linux`, `backlog:check` y `verify-changes --all`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Por que no se corrigio de una en la preparacion de 1.9.0.** Corregirlo exige una decision de producto del PO (sembrar o reescribir el texto), y esa decision cambiaria el comportamiento de toda instalacion nueva. No es un bookkeeping que pueda meterse dentro de un commit de preparacion de release.

**Hallado por la prueba clean-room, no por la suite.** Los 21 pasos de `npm test` pasan con este defecto presente porque ninguno ejecuta `--init` en un proyecto nuevo. Es el primer hallazgo de clase de DEV-336.

**Verificacion usada.** Instalacion limpia desde tarball en un proyecto aleatorio, inspeccion del arbol de archivos generado y lectura de `scripts/initScaffold.js`. Comando y salida registrados en la descripcion de DEV-336.
<!-- SECTION:NOTES:END -->
