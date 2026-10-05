# Guía de Contribución

Gracias por tu interés en mejorar gripm (anteriormente DevBoard). Esta guía cubre el flujo completo: desde
el entorno hasta el merge.

gripm se dogfoodea a sí mismo: **cada cambio de código se asocia a una tarea en
`backlog/tasks/`**, y la propia guía de contribución al repositorio es un archivo
del backlog. Si vas a tocar código, la primera decisión no es cómo branchear, sino
qué tarea estás cerrando.

---

## Requisitos de entorno

| Requisito | Versión | Por qué |
|---|---|---|
| Node.js | **≥ 22.6.0** | El proyecto usa type-stripping nativo (`--experimental-strip-types`). Por debajo de esa versión los scripts de test y CLI no corren. |
| npm | ≥ 10 | Requerido por los hooks de ciclo de vida y el empaquetado. |
| Git | cualquiera reciente | El backlog se versiona como Markdown. |

El `package.json` declara `engines.node` para que npm advierta en la instalación si
el entorno no cumple.

## Setup

```bash
git clone https://github.com/pablojavierrodriguez/gripm.git
cd gripm
npm install          # también configura .githooks/pre-commit automáticamente
npm run dev          # Vite dev server
```

Para consumir gripm en **otro** repositorio, el flujo es:

```bash
npx @gripm/board --init
```

## Verificación: la pirámide obligatoria

Ningún cambio se considera terminado sin pasar los tres niveles, en orden. Son
baratos y cubren la mayoría de los errores:

```bash
npx tsc --noEmit        # 1. Tipado estricto. Debe salir con código 0.
npm test                # 2. Parser + integración. ~300ms.
npm run backlog:check   # 3. Integridad del backlog. Debe salir con código 0.
```

Comandos complementarios:

| Comando | Para qué |
|---|---|
| `npm run audit:ux` | Auditor estática de anti-patrones de UX (touch targets, CLS, texto truncado en diálogos). |
| `npm run backlog:sync` | Regenera `BACKLOG.md` y reconcilia tareas completadas. |
| `npm run changelog` | Regenera `CHANGELOG.md` desde `backlog/releases.json`. |
| `npm run build` | `tsc` + bundle de Vite + binarios standalone de `bin/`. |
| `npm test` | Incluye la regresión del serializador de Markdown. |

> **Importante**: si modificás `scripts/backlogMdParser.ts`, también debés
> reconstruir los binarios con `npm run build:bin`. El archivo en `bin/` (`bin/gripm-mcp.js`) es un
> bundle generado: editarlo a mano se pierde en el próximo build.

## Ramas y commits

- Ramas de trabajo: `feature/`, `fix/`, `docs/`, `chore/`.
- Commits pequeños y con un propósito. El pre-commit hook valida el estado del
  backlog, pero **no** modifica el índice de git: tu stageo selectivo se
  respeta.
- No hagas commits masivos que mezclen refactors con features: el board registra
  cada tarea por separado y mezclarlas vuelve el historial inauditable.

## Cómo trackear tu contribución con gripm

Este es el diferencial del proyecto: el backlog **es** el `.md` versionado.

```bash
# Instalar el servidor MCP en tu cliente de IA
npx -p @gripm/board gripm-mcp
# o localmente / con instalación global:
# npm run mcp (o gripm mcp)
```

Herramientas MCP disponibles:

| Herramienta | Uso |
|---|---|
| `gripm_list_tasks` | Lista y filtra tareas de forma token-efficient. |
| `gripm_get_task` | Lee detalles y criterios de aceptación. |
| `gripm_update_task` | Actualiza estado, plan y tilda ACs. |
| `gripm_bulk_update_tasks` | Actualiza decenas de tareas en una llamada. |
| `gripm_get_stats` | Métricas de salud y avance del proyecto. |
| `gripm_list_releases` | Versiones en preparación y liberadas. |
| `gripm_sync_backlog` | Reconcilia tareas desfasadas y regenera `BACKLOG.md`. |

### El ciclo de una contribución

1. **Abrí o creá la tarea** en `backlog/tasks/`. Formato canónico de archivo:
   `DEV-XXX - slug-descriptivo.md`. Nunca con doble guión.
2. **Pasala a `doing`** antes de codificar.
3. **Tildá los criterios de aceptación** a medida que avanzás. Son el contrato.
4. **Committeá el `.md` de la tarea junto con el código**, en el mismo commit.
5. **Pasala a `ready`** cuando la implementación esté completa y verificada.

> `done` no se asigna en el sprint. Se promote automáticamente cuando la versión
> correspondiente pasa a `released` en `backlog/releases.json`.

### Reglas que no se negocian

Están en [`AGENTS.md`](AGENTS.md), que además es la guía de referencia para agentes
de IA. Las más importantes:

- **Todo cambio de código necesita una tarea.** Incluidos los refinamientos
  "de paso": un cambio sin criterio de aceptación es indistinguible de un cambio
  accidental.
- **No se silencia un linter para tapar un síntoma.** Se entiende la causa raíz.
- **Las dimensiones son ortogonales.** Un sprint no es un release, y un release no
  se deduce de pertenecer a un sprint. Si un campo no tiene valor, se muestra
  vacío (`—`), nunca se rellena con un término ajeno.
- **La asignación de releases es soberanía del usuario.** El agente no inventa
  versiones ni escribe `milestone: "Sprint X"`.

## Pull requests

1. Describí **qué** cambia y **por qué**. Si corrige un bug, incluí el síntoma
   antes del fix, no sólo el diff.
2. Mencioná la tarea del backlog que cierra (`Closes DEV-XXX`).
3. Dejá evidencia de verificación: la salida de los tres comandos de la pirámide.
4. Si el cambio altera la capa de persistencia, actualizá `docs/ARCHITECTURE.md`.
5. Si agrega herramientas MCP o parámetros, revisá `.agents/skills/`.

## Convenciones de código

- **TypeScript estricto, cero `any`.** Si un tipo no se puede expresar, se
  mejora el tipo, no se lo silencia.
- **Accesibilidad como defecto.** Botones con ícono llevan `aria-label`. Los
  overlays se montan en portal para escapar de cualquier `transform` en el
  ancestro.
- **Nada de contenido fabricado.** El serializador escribe lo que el usuario
  escribió; una sección vacía queda vacía.

## Código de conducta

La participación en este proyecto está regulada por
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Al contribuir aceptás sus términos.
