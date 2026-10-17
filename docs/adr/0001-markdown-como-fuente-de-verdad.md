# 0001 - Markdown como fuente de verdad del backlog

- **Estado:** `Aceptado`
- **Fecha:** 2026-10-13
- **Tareas:** `dev-001`, `dev-012`, `dev-013`, `DEV-102`, `DEV-110`
- **Reemplaza:** - 

---

## Contexto

gripm es una herramienta de gestión de producto e ingeniería *local-first* y *embedded-first*, usada tanto por personas como por agentes de IA que trabajan sobre el mismo repositorio de código. El backlog es el instrumento de coordinación entre ambos: si el estado del trabajo vive en un formato que Git no puede diffear ni la IA no puede leer, el producto pierde su razón de ser.

Al inicio el backlog podía guardarse en un JSON monolítico (`.devboard/backlog.json`). Eso obligaba a los agentes a consultar comandos propios para leer y mutar el estado, y hacía que el historial de decisiones fuera invisible en los diffs del repositorio.

## Decision Drivers

1. **Trazabilidad en Git:** el estado del trabajo debe ser auditable con `git diff`, `git blame` y code review estándar.
2. **Legibilidad por agentes:** un archivo Markdown con frontmatter YAML es parseable por un LLM sin tooling propio.
3. **Cero infraestructura:** nada de base de datos, servicios externos ni procesos adicionales.
4. **Portabilidad:** los datos deben sobrevivir a desinstalar gripm, y poder editarse a mano.

## Opciones consideradas

### Opción A - JSON monolítico como fuente de verdad

- **A favor:** formato simple, un solo archivo, parseo trivial.
- **En contra:** diffs ilegibles, sin reviewer humano posible, atávica al producto a su propio formato y obliga a los agentes a mutar estado con comandos ad-hoc.
- **Veredicto:** descartada. Rompe los drivers 1 y 2, que son la premise del producto.

### Opción B - Base de datos local (SQLite u otra)

- **A favor:** consultas, integridad referencial, migraciones.
- **En contra:** agrega un binario a la dependencia, una capa de migración y un estado fuera del control de versiones. El archivo `.db` no es mergeable.
- **Veredicto:** descartada. Contradice el driver 3 y hace el repo ilegible fuera de gripm.

### Opción C - Markdown distribuido (`backlog-md`)

- **A favor:** diffs y code review nativos, edición manual, formato que un agente LLM ya sabe leer.
- **En contra:** hay que escribir un parser y un serializador bidireccional que preserven el contenido no modelado.
- **Veredicto:** adoptada. El costo de un parser se paga una vez y compra trazabilidad permanente.

## Decisión

**El backlog vive en Markdown distribuido dentro del repositorio.** El motor de almacenamiento por defecto es `backlog-md`:

- Una tarea = un archivo `backlog/tasks/<ID> - <slug>.md` con frontmatter YAML y secciones delimitadas por comentarios HTML (`<!-- AC:BEGIN -->`, `<!-- SECTION:PLAN:BEGIN -->`, etc.).
- `BACKLOG.md` es un **consolidado generado**, nunca editado a mano; `npm run backlog:sync` lo regenera.
- El parser canónico es [`scripts/backlogMdParser.ts`](../../scripts/backlogMdParser.ts), y el guardado round-trip preserva el frontmatter arbitrario no modelado (`rawExtraFrontmatter`) para no perder información en el ciclo de lectura/escritura.
- Las dimensiones de planificación y estado (`status`, `sprint`, `release`, `priority`, `assignee`) son **ortogonales** y viven en el frontmatter; nunca se infieren entre sí.
- Los datos agregados que no son tareas (releases, sprints, retrospectivas) viven en JSON bajo `backlog/` porque no son unidades de trabajo versionables de forma útil.

El modo `json` se conserva únicamente como compatibilidad para proyectos existentes que ya lo usaban; no es la opción por defecto.

## Consecuencias

### Positivas

- Cada cambio de estado del backlog entra al mismo commit que el código y es revisable por una persona.
- Un agente puede leer y editar el estado sin el producto, y viceversa, sin capa de traducción.
- El proyecto sigue siendo plenamente utilizable si gripm deja de existir: los datos son texto plano.

### Negativas

- El parser es la pieza más delicada del sistema: cualquier bug de round-trip corrompe datos que un humano confiaba.
- El formato es sensible a la convención de nombres de archivo y a la codificación (por eso existen el hook `verify-backlog-sync.js` y el gate de `verify-changes.js`).

### Neutras o a vigilar

- El Markdown no garantiza integridad referencial entre tareas (`blocks`, `blocked_by`): la validación es del parser, no del formato.

## Referencias

- [`docs/ARCHITECTURE.md` §6](../ARCHITECTURE.md) - Modelo de datos canónico.
- [`AGENTS.md`](../../AGENTS.md) §6 - Ortogonalidad del modelo de datos y reglas de sincronización inmediata.
- `backlog/tasks/dev-001 - interoperabilidad-nativa-con-backlogmd-y-motor-mar.md`.