# Contributing Guide

🌐 **[English](#contributing-guide)** | **[Español](#guía-de-contribución)**

Thank you for your interest in improving gripm! This guide covers the end-to-end contribution workflow: from environment setup to merge.

gripm dogfoods itself: **every code change must be associated with a task in `backlog/tasks/`**, and this contribution guide itself is tracked as a backlog task. If you are going to modify code, your first decision is not how to branch, but which task you are addressing.

---

## Environment Requirements

**There are two different Node requirements, and they are not the same:** one for **consuming** gripm and one for **developing** this repository.

### If you are using gripm in your project

| Requirement | Version | Rationale |
|---|---|---|
| Node.js | **≥ 20.0.0** | Verified by running the actual tarball on `node:20.0.0` and `node:20.20.2`: `gripm --version`, `--help`, the MCP server, and cockpit launch all function properly. |

You do not need to clone this repository or install the developer toolchain. Running `npx @gripm/board` is sufficient.

### If you are developing gripm

| Requirement | Version | Rationale |
|---|---|---|
| Node.js | **≥ 22.6.0** | Test scripts and CLI execute with native type-stripping (`--experimental-strip-types`), available since Node 22.6. On earlier versions, `npm test` and `scripts/*.ts` cannot run. |
| npm | **≥ 11** | Required for `devEngines` enforcement. On npm 10, this field is silently ignored. |
| Git | Any recent version | The backlog is versioned directly as Markdown. |

These requirements live in two separate fields in `package.json`, and this distinction is deliberate:

| Field | Target Audience | Value | Effect |
|---|---|---|---|
| `engines.node` | **Consumer** | `>=20.0.0` | npm warns upon installation if the environment does not comply |
| `devEngines.runtime` | **Developer** | `>=22.6.0`, `onFail: "error"` | `npm install` **fails** at the root of the repository |

> [!NOTE]
> Prior to DEV-266, both declared `>=22.6.0`, which imposed an unnecessary development requirement on consumers: the package warned about Node 22.6 even though published binaries work on Node 20. The evidence supporting Node 20 compatibility for consumers is measured, not guessed.

`.nvmrc` and `.node-version` pin `22.6.0`, which is the **development** floor.

## Setup

```bash
git clone https://github.com/pablojavierrodriguez/gripm.git
cd gripm
npm install          # also configures .githooks/pre-commit automatically
npm run dev          # Vite dev server
```

To consume gripm in **another** repository, the workflow is:

```bash
npx @gripm/board --init
```

## Verification: The Mandatory Pyramid

No change is considered complete without passing all three levels, in order. They are fast, lightweight, and catch the vast majority of errors:

```bash
npx tsc --noEmit        # 1. Strict typing. Must exit with code 0.
npm test                # 2. Unified test suite: 18 sequential steps (parser,
                        #    integration, API security, package smoke,
                        #    optimistic locking, JSON sprint persistence,
                        #    SSE, legacy import, MCP binary, resilience & CLI,
                        #    audit:ux baseline, badge contrast, UI logic,
                        #    focus trap, pointerless reordering, port probe,
                        #    sandbox adapter, dist bundle).
npm run backlog:check   # 3. Backlog integrity. Must exit with code 0.
```

### Automated UI Smoke Test

The browser smoke test verifies logo rendering, modal opening, immediate task creation and editing, persistence and visibility of relations upon reopening, and zero console errors:

```bash
npx playwright install chromium   # once per environment
npm run test:ui
```

Complementary commands:

| Command | Purpose |
|---|---|
| `npm run audit:ux` | Static auditor for UX anti-patterns (touch targets, CLS, truncated text in dialogs). |
| `npm run backlog:sync` | Regenerates `BACKLOG.md` and reconciles completed tasks. |
| `npm run changelog` | Regenerates `CHANGELOG.md` from `backlog/releases.json`. |
| `npm run build` | Runs `tsc` + Vite bundle + standalone binaries in `bin/`. |
| `npm test` | Includes Markdown serializer regression testing. |

> **Important**: If you modify `scripts/backlogMdParser.ts`, you must rebuild the binaries with `npm run build:bin`. The bundle in `bin/` (`bin/gripm-mcp.js`) is generated: editing it manually will be overwritten on the next build.

## Branches and Commits

- Branch naming: `feature/`, `fix/`, `docs/`, `chore/`.
- Small, focused commits. The pre-commit hook verifies backlog health, but **does not** mutate git's index: your selective staging is respected.
- Avoid massive commits that mix refactors with features: the board tracks each task independently, and mixing them impairs historical audits.

## Tracking Your Contribution with gripm

This is the key differentiator of the project: the backlog **is** versioned Markdown.

```bash
# Run the MCP server in your AI client
npx -p @gripm/board gripm-mcp
# or locally / globally installed:
# npm run mcp (or gripm mcp)
```

The 12 available MCP tools:

| Tool | Usage |
|---|---|
| `gripm_list_tasks` | List and filter tasks in a token-efficient manner. |
| `gripm_get_task` | Read task details and acceptance criteria. |
| `gripm_create_task` | Create a task and its Markdown file in `backlog/tasks/`. |
| `gripm_update_task` | Update task status, plan, and toggle acceptance criteria. |
| `gripm_bulk_update_tasks` | Atomically update dozens of tasks in a single call. |
| `gripm_get_stats` | Project health and velocity metrics. |
| `gripm_list_releases` | Inspect planned and released versions. |
| `gripm_list_projects` | Registered projects, root paths, and storage engines. |
| `gripm_list_retros` | Retrospectives stored in `backlog/retros/`. |
| `gripm_create_retro` | Persist a structured retrospective in Markdown. |
| `gripm_sync_backlog` | Reconcile drifted tasks and regenerate `BACKLOG.md`. |
| `gripm_export_backlog` | Generate or update the consolidated `BACKLOG.md`. |

### Publishing a Release

Publishing is automated: `.github/workflows/publish.yml` triggers upon publishing a GitHub Release tagged `v*` (or pushing that tag) and publishes `@gripm/board` with provenance. For a release:

1. Verify the entire pyramid locally.
2. Regenerate changelog with `npm run changelog` and commit it. The workflow fails if `CHANGELOG.md` does not reflect `backlog/releases.json`.
3. Bump `package.json` with the target version and run `git tag -a vX.Y.Z -m "..."`. The tag must match `package.json` and must be an *annotated* tag: the workflow rejects any other format.
4. Publish the GitHub Release. This triggers the automated publishing process.

One-time repository provisioning:

- Create an npm **Automation** token on npmjs.com with publish scope for `@gripm/board` and store it as the **`NPM_TOKEN`** secret in the repository (Settings → Secrets and variables → Actions).
- Publishing provenance requires the `id-token: write` OIDC permission, which the workflow already declares at the job level. If the npm account has Trusted Publishing configured, `NPM_TOKEN` can be omitted.

### Lifecycle of a Contribution

1. **Open or create the task** in `backlog/tasks/`. Canonical filename format: `DEV-XXX - slug-description.md`. Never use double hyphens.
2. **Move to `doing`** before coding.
3. **Check off acceptance criteria** as you make progress. They represent the contract.
4. **Commit the task `.md` file alongside your code**, in the same commit.
5. **Move to `ready`** once implementation is complete and verified.

> `done` is not assigned within the sprint. It is automatically promoted when the corresponding version transitions to `released` in `backlog/releases.json`.

### Non-Negotiable Rules

Enforced in [`AGENTS.md`](AGENTS.md), which serves as the reference guide for AI agents:

- **Every code change requires a task.** Including incidental refinements: an unmapped change is indistinguishable from an unintended bug.
- **Linters are never suppressed to mask symptoms.** The root cause must be resolved.
- **Dimensions are orthogonal.** A sprint is not a release, and releases are not deduced from sprint membership. Empty fields render as empty (`—`), never populated with external terms.
- **Release management is PO sovereignty.** The agent never invents versions or assigns `milestone: "Sprint X"`.

## Pull Requests

1. Describe **what** is changing and **why**. If fixing a bug, include the symptom prior to the fix, not just the diff.
2. Reference the backlog task being closed (`Closes DEV-XXX`).
3. Provide verification evidence: output of the three pyramid commands.
4. If the change touches the persistence layer, update `docs/ARCHITECTURE.md`.
5. If adding MCP tools or parameters, review `.agents/skills/`.

## Code Conventions

- **Strict TypeScript, zero `any`.** If a type cannot be expressed, improve the type system; do not silence it.
- **Accessibility by default.** Icon buttons must include `aria-label`. Overlays must render in portals to avoid ancestor `transform` containment.
- **Zero fabricated content.** The serializer outputs only what the user entered; empty sections remain empty.

## Code of Conduct

Participation in this project is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). By contributing, you agree to abide by its terms.

---

# Guía de Contribución

🌐 **[English](#contributing-guide)** | **[Español](#guía-de-contribución)**

Gracias por tu interés en mejorar gripm. Esta guía cubre el flujo completo: desde
el entorno hasta el merge.

gripm se dogfoodea a sí mismo: **cada cambio de código se asocia a una tarea en
`backlog/tasks/`**, y la propia guía de contribución al repositorio es un archivo
del backlog. Si vas a tocar código, la primera decisión no es cómo branchear, sino
qué tarea estás cerrando.

---

## Requisitos de entorno

**Hay dos requisitos de Node distintos, y no son el mismo.** El de **consumir** gripm y el
de **desarrollar** este repo.

### Si vas a usar gripm en tu proyecto

| Requisito | Versión | Por qué |
|---|---|---|
| Node.js | **≥ 20.0.0** | Verificado ejecutando el tarball real en `node:20.0.0` y `node:20.20.2`: `gripm --version`, `--help`, el servidor MCP y el arranque del cockpit funcionan. |

No tenés que clonar este repo ni instalar el toolchain. `npx @gripm/board` alcanza.

### Si vas a desarrollar gripm

| Requisito | Versión | Por qué |
|---|---|---|
| Node.js | **≥ 22.6.0** | Los scripts de test y CLI se ejecutan con type-stripping nativo (`--experimental-strip-types`), disponible desde 22.6. Por debajo, `npm test` y `scripts/*.ts` no corren. |
| npm | **≥ 11** | Necesario para que `devEngines` haga enforcement. Con npm 10 el campo se ignora **en silencio**, sin avisar. |
| Git | cualquiera reciente | El backlog se versiona como Markdown. |

Esto vive en dos campos distintos del `package.json`, y la separación es deliberada:

| Campo | A quién aplica | Valor | Efecto |
|---|---|---|---|
| `engines.node` | **consumidor** | `>=20.0.0` | npm avisa al instalar el paquete si no cumple |
| `devEngines.runtime` | **desarrollador** | `>=22.6.0`, `onFail: "error"` | `npm install` **falla** en la raíz del repo |

> [!NOTE]
> Antes de DEV-266 ambos declaraban `>=22.6.0`, y eso le comunicaba al consumidor un
> requisito que es de desarrollo: el paquete advertía Node 22.6 aunque los binarios
> publicados funcionan en Node 20. La evidencia de por qué el consumidor llega hasta 20
> está medida, no deducida.

`.nvmrc` y `.node-version` fijan `22.6.0`, que es el piso de **desarrollo**.

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
npm test                # 2. Suite unificada: 18 pasos secuenciales (parser,
                        #    integración, seguridad de API, smoke de paquete,
                        #    locking optimista, persistencia de sprints en JSON,
                        #    SSE, import legacy, binario MCP, resiliencia y CLI,
                        #    baseline de audit:ux, contraste de badges, lógica
                        #    UI, trampa de foco, reordenamiento sin puntero,
                        #    sondeo de puertos, adaptador sandbox, bundle dist).
npm run backlog:check   # 3. Integridad del backlog. Debe salir con código 0.
```

### Smoke automatizado de interfaz

El smoke del navegador verifica la carga del logo, la apertura del modal, la
creación y edición inmediata de una tarea, la persistencia y visibilidad de sus
relaciones al reabrirla, y la ausencia de errores de consola:

```bash
npx playwright install chromium   # una vez por entorno
npm run test:ui
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

Las 12 herramientas MCP disponibles:

| Herramienta | Uso |
|---|---|
| `gripm_list_tasks` | Lista y filtra tareas de forma token-efficient. |
| `gripm_get_task` | Lee detalles y criterios de aceptación. |
| `gripm_create_task` | Crea una tarea y su archivo Markdown en `backlog/tasks/`. |
| `gripm_update_task` | Actualiza estado, plan y tilda ACs. |
| `gripm_bulk_update_tasks` | Actualiza decenas de tareas en una llamada atómica. |
| `gripm_get_stats` | Métricas de salud y avance del proyecto. |
| `gripm_list_releases` | Versiones en preparación y liberadas. |
| `gripm_list_projects` | Proyectos registrados, sus rutas y motor de almacenamiento. |
| `gripm_list_retros` | Retrospectivas guardadas en `backlog/retros/`. |
| `gripm_create_retro` | Persiste una retrospectiva estructurada en Markdown. |
| `gripm_sync_backlog` | Reconcilia tareas desfasadas y regenera `BACKLOG.md`. |
| `gripm_export_backlog` | Genera o actualiza el documento consolidado `BACKLOG.md`. |

### Publicar un release

La publicación es automática: `.github/workflows/publish.yml` dispara con la
publicación de una GitHub Release etiquetada `v*` (o con el push de ese tag) y
publica `@gripm/board` con provenance. Para un release hay que:

1. Verificar la pirámide completa en local.
2. Regenerar el changelog con `npm run changelog` y commitearlo. El workflow
   corta si `CHANGELOG.md` no refleja `backlog/releases.json`.
3. Subir `package.json` con la versión destino y `git tag -a vX.Y.Z -m "..."`.
   El tag debe coincidir con `package.json` y ser *annotated*: el workflow
   rechaza cualquier otra cosa.
4. Publicar la GitHub Release. Eso dispara el publish.

Aprovisionamiento, una sola vez por repositorio:

- Crear un token npm **Automation** en npmjs.com con scope de publicación sobre
  `@gripm/board` y guardarlo como secret **`NPM_TOKEN`** en el repositorio
  (Settings → Secrets and variables → Actions).
- Publicar provenance requiere el permiso OIDC `id-token: write`, que el
  workflow ya declara a nivel de job. Si la cuenta de npm tiene Trusted
  Publishing configurado, `NPM_TOKEN` puede omitirse.

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
