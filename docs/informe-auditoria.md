# Informe de Auditoría OSS — `gripm` + `gripm-playbook`

**Fecha:** 2026-10-05
**Autor:** Auditoría técnica automatizada (OpenCode)
**Alcance:** repositorio público `pablojavierrodriguez/gripm`, repositorio público `pablojavierrodriguez/gripm-playbook`, los paquetes publicados `@gripm/board@1.0.0` y `@gripm/playbook@2.0.0` en npm, y el repo local `dev-board` (67 commits) como referencia de contraste.
**Método:** lectura completa de ambos trees, verificación de cada afirmación contra archivo/línea, inspección del tarball real vía unpkg/registry, y contraste working-copy vs. artefacto publicado. Sin modificar nada.

---

## 0. Resumen ejecutivo

Hay dos proyectos con **calidad de diseño interna razonable** y un **proceso de publicación a OSS exactamente contrario a lo que su propia documentación exige**.

El hallazgo de fondo es uno solo, y todo lo demás se deriva de él:

> **La transición a open source se ejecutó como un paso de empaquetado (`git remote` + `npm publish`), no como un paso de endurecimiento.** No hubo una sola iteración de "qué se ve desde afuera". Por eso hay contenido privado de otra aplicación distribuido a los consumidores de npm, documentación que anuncia tooling eliminado, un skill de agente que enseña comandos que no existen, y dos repositorios publicados en la misma tarde cuyos artefactos publicados no coinciden con su propio código fuente.

Cronología del hecho: el desarrollo local empezó el **2026-09-16** (67 commits). El repo público `gripm` se creó el **2026-10-05 13:17 UTC**, se hizo squash a **1 commit**, y `@gripm/board@1.0.0` se publicó a las **15:30 UTC** del mismo día. `@gripm/playbook@2.0.0` a las **15:56**. Veinte días de trabajo se publicaron en una tarde, sin feedback externo. Los defectos que hoy son evidentes eran todos detectables con una sola hora de "lectura de ojos frescos".

**Estado de adopción:** 0 estrellas, 0 forks, 0 watchers, 0 discussions en ambos repos. 0 topics en `gripm` (el playbook tiene 7). Autor con 0 seguidores. Los paquetes se publicaron el mismo día del lanzamiento y todavía no han pasado por un ciclo de uso real.

---

## 1. Qué es cada repositorio

| | `gripm` | `gripm-playbook` |
|---|---|---|
| Paquete | `@gripm/board` | `@gripm/playbook` |
| Qué es | App React/TS + CLI + servidor MCP, backlog en Markdown | Framework de skills para agentes (Markdown + 3 scripts) |
| Líneas | ~22.200 (src+scripts), `vite.config.ts` = 2.560 | ~4.730 (53% markdown, 36% scripts) |
| Archivos | 34 top-level, 29 en `src/`, 28 en `scripts/` | 49 |
| Deps runtime | **8** (incluye `vite`, `tailwindcss`, `postcss`, `autoprefixer`) | **0** |
| Tarball | 96 archivos, 2,2 MB | 30 archivos, 197 KB |
| Tests | 10 scripts secuenciales | 26 tests (`node:test`) |
| CI | 1 workflow, matriz 3 OS × 2 Node = 6 | 1 workflow, matriz 2 Node |
| Publicación | manual | manual |

**Sobre la separación en dos repos: es la decisión de arquitectura correcta.** Se verificó que no hay acoplamiento de código entre ellos — cero imports, cero duplicación, cero escrituras bidireccionales. El playbook se sincroniza a sí mismo desde `raw.githubusercontent.com`, no desde `gripm`. La disciplina de "single source of truth" (`AGENTS.md:71` en el playbook: *"It is not duplicated here on purpose: two copies of a rule drift apart"*) es la mejor decisión de ingeniería de ambos repos. **El problema es que esa disciplina se rompió en el límite de publicación** (§3.2).

---

## 2. Lo bueno

### 2.1 `gripm`

**Higiene de secretos: impecable.** Escaneados los patrones `sk-`, `ghp_`, `github_pat_`, `AKIA`, `BEGIN PRIVATE KEY`, `API_KEY`, `process.env.*(TOKEN|SECRET|PASSWORD|KEY)` → **cero coincidencias**. Los únicos paths absolutos `/Users/` son placeholders de UI (`src/locales/es.json:538`). Cero ocurrencias de `adrisol`. No existen `.env` con `VITE_*`. `node_modules/` y `dist/` correctamente ignorados; `data/` contiene solo el fixture de demo.

**La defensa contra fugas en el tarball está bien diseñada y funciona.** `scripts/verify-publish-surface.js:7-11` documenta explícitamente el riesgo:

> *"El campo `files` de package.json es una ALLOWLIST que tiene precedencia sobre `.gitignore`... Esto ya causó una fuga real de datos personales (ver DEV-118 AC #4 y DEV-151)."*

Y `verify-dist.js` extrae el tarball real y lo audita. El allowlist de `files` (`package.json:41-56`) excluye correctamente `backlog/`, `BACKLOG.md`, `.gripm/`, `docs/`. Esto es más riguroso que el 95% de los publishes.

**Tests reales, no smoke tests.** De los 10 scripts de `npm test`, la mayoría tienen aserciones sustantivas:

- `test-parser.js` — ~120 `assert.strictEqual` sobre round-trips del parser.
- `verify-integration.js` — crea repos fixture, y **realmente ejecuta `git init` + commit** para probar el hook pre-commit (`:617-666`).
- `verify-optimistic-locking.js`, `verify-sse.js`, `verify-legacy-import.js` — extraen el plugin real de `vite.config.ts` y ejercitan el middleware de producción. **Este patrón de test es correcto** y es la decisión de test más inteligente del repo.
- `verify-mcp-binary.js` — spawna `bin/gripm-mcp.js` y habla JSON-RPC real por stdio, assertando los 12 nombres de tools.
- `test-api-security.js` — **excepción**: reimplementa el guard inline (`:6-65`) en vez de importar el de producción. Este test **no puede fallar** si producción regresiona.

**Ausencia de command injection.** Todo `child_process` usa `execFile` con array de argumentos o `execSync` con literales estáticos. Cero `shell: true` con datos de usuario.

**Ausencia de path traversal explotable en los writes.** `findBacklogMdFile` (`vite.config.ts:926-962`) obtiene el filename por `readdirSync` filtrado, no por concatenación del input del usuario. `generateTaskFilename` (`backlogMdParser.ts:699-712`) además sanea `/ \ : * ? " < > |`. Es un acierto de diseño real.

**MCP server sobrio.** `scripts/mcp-server.ts` usa JSON-RPC sobre stdio, sin red. Locks optimistas (409), `ideas` como estado de primera clase, 12 tools coherentes. Es la parte más pulida del producto.

**CI en matriz cruzada seria.** `.github/workflows/ci.yml`: ubuntu + macos + windows × Node 22.6.0 + 22.x, `fail-fast: false`, con `tsc --noEmit`, `npm test`, `backlog:check`, `audit:ux`, `build`, `publish:check`. Es más riguroso que la mayoría del OSS.

**Bilingüe real.** `README.md` (432 líneas) + `README.es.md` (424), `AGENTS.en.md` + `AGENTS.es.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`. Y `engines.node: ">=22.6.0"` justificado con `.nvmrc` y `.node-version` sincronizados.

### 2.2 `gripm-playbook`

**El modelo de estados es el mejor activo intelectual de ambos repos.** `STATE_MACHINE.md` declara 4 estados canónicos y hace **cuatro afirmaciones negativas deliberadas** — *"El backlog no es un status"*, *"Refinement is a gate (R1), not a state"*, `ready` es la entrega formal de dev, y el invariante `Producción ⊆ done`. Es pensamiento de producto maduro, no burocracia. Y se repite consistente en 6 archivos.

**El rechazo del framing "multi-agent swarm" es honesto y correcto.** El README (`:23-64`) argumenta que los agentes son "sombreros" markdown cargados bajo demanda, no enjambres, con una tabla comparativa "swarm vs hat" — es la mejor pieza de argumento comercial del proyecto.

**El catálogo de reglas UX es la mejor ingeniería de todo el conjunto.** `scripts/ux-rules.json` (209 líneas) mueve *toda* la lógica de detección a datos, con un bloque `authoring` que documenta los 8 operadores de match, la semántica de severidad y la política de congelamiento de IDs. Cero lógica de detección en código.

**Y — esto es lo notable — la documentación está anti-drift por construcción.** `validate-repo.mjs:81-119` verifica **bidireccionalmente** que cada `UX-00N` del catálogo aparezca en `code-level-ux-auditor/SKILL.md` con título verbatim, severidad y shape de heading — *y* que ningún ID documentado quede fuera del catálogo. Verificados los 13 pares a mano: paridad perfecta. Además hay un **canario de regresión** (`:116-118`) que falla si alguien reintroduce el bug histórico. Eso es ingeniería defensiva real.

**Las fixtures están coverage-gated.** `audit-ux.test.mjs:67-71` assertea que *toda* regla catalogada dispara sobre la fixture de violaciones. Agregar una regla sin fixture es imposible. Documentado en `CONTRIBUTING.md:52-53`.

**Dependency gating: la mejor idea del código.** UX-004 requiere `date-fns`, UX-003 requiere `framer-motion`. Un repo Go o Python nunca recibe consejo de React. Y hay un test que lo prueba (`audit-ux.test.mjs:79-84`).

**Cero dependencias de runtime.** `git clone && npm test` funciona offline con solo Node. Sin cadena de suministro, sin `npm audit`. Es genuinamente fricción-cero.

**El CHANGELOG es inusualmente candido.** Documenta sus propios bugs previos con honestidad (`CHANGELOG.md:57` el crash `ENOENT: scandir`, `:58` el bug de variables, `:62` los FPs multi-línea). Esto es madurez de ingeniería — y hace que los bugs *actuales* sean más dañinos, porque el estándar que el proyecto se puso es alto y no lo está meeting.

---

## 3. Lo malo — CRÍTICO (bloquea o daña la adopción)

### 3.1 Fuga de contenido privado de otra aplicación — distribuida a los consumidores de npm

**Este es el hallazgo más grave y el más fácil de arreglar.**

7 archivos `.agents/skills/*/SKILL.md` del repo `gripm` contienen referencias a una aplicación específica que no es gripm:

```
gripm/.agents/skills/principal-engineer/SKILL.md         → 2 × "YourApp"
gripm/.agents/skills/rigorous-qa-auditor/SKILL.md        → 2 × "YourApp"
gripm/.agents/skills/worldclass-product-designer/SKILL.md → 3 × "YourApp"
gripm/.agents/skills/pm-orchestrator/SKILL.md            → 2 × "YourApp"
gripm/.agents/skills/market-researcher/SKILL.md          → 1 × "YourApp"
gripm/.agents/skills/forms-rhf-zod/SKILL.md              → 1 × "YourApp"
gripm/.agents/skills/ui-radix-tailwind/SKILL.md          → 1 × "YourApp"
```

Y las skills de stack (que viven en el playbook) están peor:

```
ui-radix-tailwind:43-57   "Permisos en UI: siempre `PermissionGate`"
                                import { PermissionGate } from '@/lib/permissions';
                                <PermissionGate permission="people:edit">
ui-radix-tailwind:65      "Ver `src/lib/permissions.tsx` y SPEC-070."   ← SPEC-070 no existe en ningún repo
ui-radix-tailwind:119     "### Bugs mobile ya resueltos — no reincidir"
ui-radix-tailwind:143     "Este bug apareció en `People.tsx` y se resolvió en v0.6.x"
ui-radix-tailwind:149     "El `MobileBottomNav` ya incluye las correcciones de safe area para Android —
                            no modificar sus márgenes sin entender el impacto en el APK"
ui-radix-tailwind:292     "`date-fns` y `react-day-picker` ya están en `package.json` —
                            no instalar alternativas"   ← afirma hechos sobre el package.json del LECTOR
forms-rhf-zod:91-104      "## Errores de servidor (Supabase)" — código Postgres `23505`, `api_errors.emailTaken`
forms-rhf-zod:110         "objetos anidados como `social_links` (que vienen de Supabase como `jsonb`)"
recharts-reporting:59     "El Dashboard usa RPCs de Supabase (`get_dashboard_stats`)"
mobile-ux-design:148      "Reuniones y servicios", "Ministerios y grupos"
mobile-ux-design:193      botones "Check-in QR", "Gestionar Asistencia"   ← app de ministerio, inequívoco
```

**El caso `mobile-ux-design:193` identifica la aplicación de origen sin ambigüedad: una app de iglesia/ministry con check-in QR por código.** Eso está a un click de cualquier visitante del repo.

**Y hay una landmine de código:** alguien redactó el locale original *sustituyendo un token placeholder dentro de snippets de código*:

```
recharts-reporting:70   value.toLocaleString('regional-locale')
recharts-reporting:77   new Date(date).toLocaleDateString('regional-locale', {...})
forms-rhf-zod:126       "## Inputs de montos y moneda (Formato `regional-locale`)"
```

`'regional-locale'` **no es un tag BCP-47 válido**. Copy-paste → `RangeError: Incorrect locale information provided` o fallback silencioso al locale del sistema. Lo mismo con clases CSS presentadas como universales: `font-mono-data`, `vibrant-gradient-primary`, `.btn-action-label`.

**Por qué CI no lo detectó:** el guard de pureza `checkCorePurity` (`validate-repo.mjs:122-150`) recorre **solo** el core (`.agents/{TEAM_PLAYBOOK,STATE_MACHINE,rules/git-workflow}.md` + 6 skills core) y aplica una denylist de **5 tokens**: `YourApp`, `admin-portal`, `formatAmount`, `invariantValid`, `credit_card_view_mode`. Los stack packs **no se inspeccionan nunca**. Los 5 tokens prohibidos son ellos mismos remanentes de la app origen (`credit_card_view_mode`, `invariantValid`) — el scrub fue un parche sobre hallazgos conocidos, no una política.

**Consecuencia:** el README (`:149`) afirma *"The core layer is validated to contain **zero** references to any specific product or backend. `npm run validate` enforces this, so the promise cannot silently rot"*. Es un spot-check de 5 tokens sobre 8 archivos presentado como garantía. **No es cierto, y el scrub ya se rompió en el sentido inverso** (§3.2).

**Y lo más grave: esto no es solo "contenido en un repo".** El tarball de `@gripm/board@1.0.0` contiene `.agents/skills/` — los 96 archivos del tarball incluyen los 13 directorios de skills. Y `scripts/initScaffold.js:251-259` escribe `.agents/skills/gripm/SKILL.md` en el proyecto del usuario. **La fuga llega a los usuarios finales de npm por dos canales.**

### 3.2 Drift entre repos: `gripm` tiene una copia *sucia y aplanada* de los skills

Verificado:

| | Playbook (validado) | Gripm (publicado) |
|---|---|---|
| `YourApp` en core skills | **0** | **13 ocurrencias en 7 archivos** |
| Estructura | `.agents/skills/*` (6 core) + `.agents/stacks/{react,mobile,pwa}/skills/*` | `.agents/skills/*` — **13 skills aplanados, sin `stacks/`** |

`gripm/.agents/` no tiene directorio `stacks/`. Todas las skills de stack están mezcladas con las core. Esto:

1. **Viola la arquitectura de dos capas** que el playbook define y el README promete (`README:141-149` del playbook).
2. **Shippea las versiones sin sanitizar** — el playbook ya fue limpiado (`0 × YourApp`), pero el repo `gripm` tiene la copia pre-limpieza.
3. Significa que `validate-repo.mjs` pasa en el playbook y **el mismo contenido dirty se distribuye en el paquete de `gripm`**.

La disciplina de "single source of truth" que el playbook defiende correctamente se rompe exactamente en el punto de mayor consecuencia. La frontera app↔framework es actualmente una **convención, no una restricción**.

### 3.3 El skill de agente que se shippea enseña herramientas MCP que no existen

Este es el bug funcional más dañino para adopción, porque es **el contrato agente-facing**.

`gripm/.agents/skills/gripm/SKILL.md:54`:

```
## 2. Herramientas MCP Disponibles (con alias retrocompatibles `devboard_*`)
```

Y luego las usa en ejemplos JSON y en instrucción directa:

```
:77    "debe realizarse a través de las herramientas MCP provistas
         (`devboard_update_task`, `devboard_sync_backlog`, etc.)"
:81    "**MCP:** `devboard_get_stats`"
:88    "name": "devboard_list_tasks",
:111   "name": "devboard_bulk_update_tasks",
```

15 ocurrencias de `devboard_*` en total.

**Verificado en `scripts/mcp-server.ts`: los 12 tools reales son todos `gripm_*`** (`gripm_bulk_update_tasks`, `gripm_create_retro`, `gripm_create_task`, `gripm_export_backlog`, `gripm_get_stats`, `gripm_get_task`, `gripm_list_projects`, `gripm_list_releases`, `gripm_list_retros`, `gripm_list_tasks`, `gripm_sync_backlog`, `gripm_update_task`) y **cero ocurrencias de `devboard_`**. No hay tabla de alias; `handleToolCall` hace `const name = rawName` sin mapping.

**La afirmación "con alias retrocompatibles `devboard_*`" es falsa.** Cualquier agente que siga el skill publicado obtiene *tool not found* en la primera operación. Para un producto cuyo valor central es la integración agente-MCP, esto es un fallo de primera clase.

### 3.4 Bypass completo de las tres guardas de seguridad con `--host 0.0.0.0`

Verificado verbatim (`vite.config.ts:1158-1214`):

```js
1158: const configuredHost = (process.env.DEVBOARD_HOST || process.env.GRIPM_HOST || '127.0.0.1')
1163: if (!isAllowedHost && configuredHost !== '0.0.0.0') { ...403... }      // ← guard 1 off
1176:   if (!isAllowedOrigin && configuredHost !== '0.0.0.0') { ...403... }   // ← guard 2 off
1208:   res.setHeader('Access-Control-Allow-Origin', originHeader);            // ← refleja Origin tal cual
```

Las tres protecciones — allowlist de Host (DNS rebinding), allowlist de Origin (CSRF), y el chequeo de Content-Type — **se desactivan cuando el host es `0.0.0.0`**, y el preflight CORS **refleja el Origin del llamante sin `Vary`**. `bin/gripm.js:110-112` solo imprime un warning y continúa. Una instancia expuesta a LAN acepta escrituras cross-origin de cualquier página. `SECURITY.md` no documenta este modelo de amenaza.

### 3.5 Enumeración recursiva arbitraria del filesystem — `GET /api/fs/browse?dir=`

Verificado (`vite.config.ts:1826-1856`):

```js
const urlObj = new URL(`http://localhost${url}`);
let targetDir = urlObj.searchParams.get('dir') || '';
...
targetDir = path.resolve(path.normalize(targetDir));   // ← resolve, sin contención
if (!fs.existsSync(targetDir)) targetDir = getSafeInitialBrowseDir();
const stat = fs.statSync(targetDir);
entries = fs.readdirSync(targetDir, { withFileTypes: true });
```

`targetDir` viene del query string. Solo se normaliza y resuelve — **no hay allowlist ni check de contención contra ninguna raíz**. Devuelve cada subdirectorio con nombre, path absoluto y si es repo git. Cualquier cliente local puede enumerar el árbol de filesystem completo.

`POST /api/projects` (`vite.config.ts:1726`) acepta `repoPath` arbitrario → registro → escrituras posteriores caen bajo `path.join(repoPath, backlogDir, 'tasks')`. Y `POST /api/projects/detect-path` (`vite.config.ts:1773`) sondea cualquier path buscando `.git`/`backlog` — reconocimiento de filesystem como oráculo.

**No hay autenticación de ningún tipo.** `SECURITY.md:71-78` pone "falta de segregación entre proyectos" explícitamente fuera de alcance, lo cual es defendible para local-first — pero no se refleja en el claim de posture del README ("Zero telemetry, zero leaks", `README:39`).

---

## 4. Lo malo — ALTO

### 4.1 Historia destruida: 67 commits → 1 commit

El repo local tiene **67 commits** desde el **2026-09-16**. El repo público tiene **1 commit** (`af5780e`, "feat: release v1.0.0 - initial open-source release"), creado el 2026-10-05. Todo el historial fue aplastado.

Se pierde: atribución de contribuciones, `git blame`, arqueología, capacidad de bisect, y — lo más importante para OSS — **la señal de legitimidad**. Un repo con 1 commit creado ayer se lee como un *code dump*, no como un proyecto. Para un framework cuyo argumento de venta es "software agíl construido con el framework", la ausencia de historia es autodesmentida.

### 4.2 `vite.config.ts` = 2.560 líneas que contienen el backend entero

No es un config de build. Las primeras 28 líneas son boilerplate real de Vite; `defineConfig` **empieza en la línea 2512**. Las líneas 29–2511 son backend:

| Región | Líneas | Contenido |
|---|---|---|
| 60–1076 | ~1.000 | Lógica de negocio: `detectProjectStorage`, `saveRegistry`, `parseReleaseNotesMd`, `softDeleteBacklogMdItem`, `purgeBacklogMdItem`… |
| 1077–2510 | ~1.430 | `devBoardApi(): PluginOption` — API REST completa + SSE dentro de un plugin de Vite |

26 rutas (`GET/PUT/POST/PATCH/DELETE /api/items|projects|sprints|releases|settings|retros|fs/browse|import|events|updates`), 40+ `fs.readFileSync`/`writeFileSync`, y un broadcaster SSE con `fs.watch` recursivo (`:1133-1146`). **No hay Express, Fastify ni Hono** — es un middleware Connect montado en Vite.

Dos consecuencias:

1. **Se shippea a npm** (`package.json:50` incluye `vite.config.ts`). Cada consumidor instala 112 KB de config + backend.
2. `bin/gripm.js:212-230` arranca `createServer()` de Vite — **el producto en producción es el dev server de Vite**, no el bundle. Por eso `files` debe incluir `src/`, `scripts/`, `vite.config.ts`: es una consecuencia directa de la arquitectura, no una decisión de empaquetado.

Hay residuos de un find/replace mal hecho: indentación rota en `vite.config.ts:1248` y `:2468`.

El propio repo lo reconoce: `backlog/tasks/DEV-165` ("un monolito de 2.530 líneas y 110 KB"), AC #4 *"Reducir `vite.config.ts` a menos de 300 líneas"* — `status: draft`, `priority: medium`.

### 4.3 El tarball publica 4 directorios que no necesita

Verificado vía unpkg sobre el tarball real de `@gripm/board@1.0.0` (96 archivos, 2,2 MB):

| Directorio | Archivos | ¿Necesario en runtime? |
|---|---|---|
| `/scripts` | 28 | ❌ toolchain de build/verify, salvo `gripm-cli`/`mcp-server` |
| `/src` | 29 | ❌ solo porque `bin` carga `vite.config.ts` |
| `/dist` | 4 | ❌ **verificado: `bin/gripm.js` nunca referencia `dist`** — el bundle construido es peso muerto |
| `/vite.config.ts` | 1 | ❌ 112 KB de backend |

`@gripm/board` declara **8 dependencias runtime** incluyendo `vite`, `tailwindcss`, `postcss`, `autoprefixer`, `@vitejs/plugin-react` — todo el toolchain de build instalado en `dependencies` porque el CLI corre Vite en dev mode. `npm i -g @gripm/board` descarga ~200 MB de toolchain para arrancar un servidor local. Nada está *roto*, pero es un smell de diseño con costo directo.

### 4.4 Documentación que anuncia tooling eliminado

```
README.md:347      "…GitHub Actions CI, community templates, ESLint flat config, Prettier, EditorConfig…"
README.es.md:336   "…Pipeline de GitHub Actions CI, templates comunitarios…, ESLint flat config, Prettier…"
CHANGELOG.md:48    "…GitHub Actions CI, templates de issues/PRs, ESLint flat config, Prettier, EditorConfig…"
```

**Verificado: no existe `eslint.config.*` ni `.eslintrc*` en ninguna parte.** Fue eliminado deliberadamente — `backlog/tasks/DEV-152` status `done`: *"eslint.config.js existía como un archivo de 17 líneas… Se elimina el archivo de configuración muerto"*. **Tres archivos de documentación siguen anunciando una herramienta que el proyecto eliminó.**

Y `package.json:82` define `"lint": "tsc --noEmit"` — un typecheck con nombre de linter. **No hay linting de ningún tipo en este repositorio.** Prettier tampoco: `.prettierrc` está commiteado y el README lo anuncia, pero `prettier` **no está en `devDependencies`** y no hay script que lo ejecute.

Además `package.json:83`: `"format": "node scripts/verify-backlog-sync.js --fix"` — **`npm run format` no formatea código, regenera el backlog.** Un contribuidor que lo ejecute esperando Prettier reescribe silenciosamente el backlog.

### 4.5 Bugs de contrato y documentación

| Severidad | Hallazgo | Evidencia |
|---|---|---|
| Alta | **5 IDs de transición incorrectos, incluido un `T6` que no existe.** `STATE_MACHINE.md:47-54` define T0–T5. `TEAM_PLAYBOOK.md:87` dice T5 donde es T3. `SPRINT_SPEC_TEMPLATE.md:70` dice T3 donde es T1; `:100` dice T4 donde es T2, y T5 donde es T3; `:116` cita **`T6`** donde es T4. El README (`:158`) llama a la state machine *"Single source of truth for statuses & transitions"*. | playbook |
| Alta | **`.uxaudit.json` `exclude` documentado en 3 lugares, implementado en 0.** `audit-ux-code.cjs` solo lee `config.src` (`:165`) y `config.disableRules` (`:437`). `grep exclude` → 0 matches. **Un opt-out documentado que es silenciosamente no-op.** | playbook |
| Alta | **`manifest.preserved` no lo consume nada.** `sync-playbook.mjs:513-530` tiene la preservación hardcodeada y cubre **solo `AGENTS.md`**. El manifest promete 4 paths. | playbook |
| Alta | **El install recomendado (`README:196`) sobreescribe el `docs/BACKLOG.md` del consumidor** — `cp -r temp-playbook/.agents temp-playbook/docs …` — precisamente el archivo que el framework declara preservado. Y `2>/dev/null` en `:197-198` oculta el fallo → instalación a medias sin error. Además envía los 5 stack packs, contradiciendo la promesa de dos capas. | playbook |
| Alta | **`validate-repo.mjs` se shippea al usuario pero no puede pasar.** `checkManifest` falla con *".playbook-manifest.json is missing"* — y el manifest nunca se instala. En cualquier proyecto sincronizado, `node scripts/validate-repo.mjs` **siempre sale 1**. Es un self-check del repo disfrazado de artefacto instalable. | playbook |
| Alta | **`scripts/sync-playbook.mjs` documentado en 4 lugares pero nunca instalado.** No está en `manifest.core`, así que la Opción B (`npx @gripm/playbook sync`) no lo deja en el proyecto destino. Los 3 `STACK.md` + `README:207` instruyen correrlo ahí. **No existe en disco.** | playbook |
| Media | **El tarball publicado de `@gripm/playbook@2.0.0` está desalineado.** `repository`/`homepage` apuntan a `…/agentic-team-playbook` (el nombre viejo); el bin `gripm-playbook` **falta** (solo hay `playbook` y `agentic-team-playbook`). Verificado contra el registry. El artefacto publicado depende del **redirect de rename de GitHub**. | registry |
| Media | **`[Unreleased]` ya está dentro del tag `v2.0.0`.** Verificado que el `sync-playbook.mjs` del tag ya contiene `findCanonicalProvenance`, `--adopt` y detección de orphans — todo lo listado como Unreleased. | playbook |
| Media | **`buildUnits` reintroduce el bug que el CHANGELOG dice haber corregido.** El contador de cierre es `text.match(/>/g)` (`audit-ux-code.cjs:258`), que **sí cuenta `=>`**, pero el comentario (`:241-243`) afirma que los operadores flecha no aportan apertura. Resultado: en un `<input type="number" onChange={() => {}} inputMode="decimal" />` multi-línea, la unidad se cierra en la línea del arrow y **UX-001 (ERROR) dispara falsamente**. La fixture `Clean.tsx` pone `inputMode` *antes* del arrow, así que pasa por suerte de orden. **Ningún test cubre el orden que falla.** | playbook |
| Media | **Semántica `needsContent`/`unlessContent` de archivo completo.** UX-007: un `min-w-0` en cualquier parte del archivo **deshabilita la regla para todo el archivo** (falso negativo). UX-006: cualquier `pb-16` en un archivo que contenga `fixed bottom-0` en cualquier parte dispara (falso positivo → **falla `--strict`**, el gate que QA exige). UX-009: los tokens son `"h-5 "`, `"h-8 "` **con espacio final** — `<button className="h-8">` no matchea. | playbook |
| Media | **`pwa-assets-audit` apunta a un script inexistente.** `SKILL.md:14-16` instruye `node .agents/skills/pwa-assets-audit/scripts/validate-manifest.mjs`. El skill se instala en `.agents/stacks/pwa/skills/…` **y no existe ningún `scripts/`**. Doble error. Verificado byte-for-byte en el tag `v2.0.0` publicado. Un skill que dispara y luego manda al agente a un archivo inexistente es peor que no tenerlo. | playbook |
| Media | **El sync degrada a "unpinned" silenciosamente.** `resolveRef` (`:135-148`) consulta `releases/latest` **sin autenticar** (60 req/h por IP). Agotado → cae a `main` con `pinned: false` e imprime `✅ Project now carries the canonical framework layer` (`:590`). **Rompe la garantía de "Reproducible — syncs from a pinned git ref"** (`README:232`) sin avisar. | playbook |
| Baja | README documenta un flag inexistente: `--mono` no existe en ningún lado; `--single` se lee solo dentro del branch `--init` (`bin/gripm.js:132`), top-level es no-op. | gripm |
| Baja | `src/api.ts:85` `bulkUpdateItems` → `POST /api/items/bulk` **no tiene ruta server** (`grep bulk vite.config.ts` → 0). `src/api.ts:111` `updateProject` → `PUT /api/projects/:id` **tampoco**. Código muerto que es trampa para el próximo contribuidor. | gripm |
| Baja | `docs/ARCHITECTURE.md:46` documenta endpoints `/api/backlog` y `/api/tasks` — **ninguno existe**. Los reales son `/api/data`, `/api/items`, `/api/sprints`… | gripm |
| Baja | `CONTRIBUTING.md:88-94` lista 7 MCP tools; hay 12. `CONTRIBUTING.md:46` dice que `npm test` tarda "~300ms" — hace `npm pack` dos veces, spawna el binario MCP y `git init` repos: decenas de segundos. | gripm |
| Baja | `AGENTS.md:47` dice "9 scripts secuenciales"; `package.json:70` tiene **10**. | gripm |
| Baja | README:382 dice "150+ tasks (DEV-001 a DEV-150), 8 sprints". Real: **175 tareas, máx DEV-177**, 9 sprints, 8 releases. `README.es.md:371` está mucho más desactualizado: "**146+ tareas**, 7 sprints y 7 releases (`v0.2.0` a `v0.7.0`)" — describe el estado pre-1.0. | gripm |
| Baja | Branding inconsistente: `SECURITY.md:61-62` menciona bins `devboard-mcp` y `devboard` que no existen. `backlog/releases.json` tiene `"projectId": "dev-board"` en todas las releases. `ReleaseAssembler.tsx:256,290,319` hardcodea fallback `\|\| 'dev-board'`. `App.tsx:218` loguea `[DevBoard]`. `mcp-server.ts:3,5` "DevBoard MCP Server". `BACKLOG.md:2` "generado por DevBoard ⚡". | gripm |
| Baja | `sprints.json` viola las propias reglas de slug del repo: `sprint-sprint-7` (doble prefijo) y `sprint-1790252674566` (timestamp crudo). `AGENTS.md` gotcha #4 prohíbe el doble guión. | gripm |
| Baja | `package-lock.json:2` dice `gripm` (no `@gripm/board`) y `:21-24` registra solo 2 de los 3 bins → **lockfile desincronizado**. Misma clase de bug que `DEV-133` marcado `done`. | gripm |
| Baja | `scripts/build-binaries.js:1` importa `esbuild`, **no declarado** en ninguna dependency list — solo presente transitivamente vía el optional de vite. Si vite lo suelta, `npm run build` rompe. | gripm |
| Baja | `prepare` script muta el git config del consumidor en install: `prepare-hooks.js:12-13` ejecuta `git config core.hooksPath .githooks`. Efecto lateral no consentido. | gripm |
| Baja | El propio detector de fugas filtra la convención de paths del autor: `verify-publish-surface.js:38` → `{ label: 'ruta de proyectos del autor', re: /Pablo\/code\// }`. | gripm |
| Baja | `.gitignore` no cubre `data/*-backlog.json` (no-demo), `data/releases.json` ni `data/test-repo-*` que el código sí escribe (`vite.config.ts:224`, `verify-integration.js:32,375`). | gripm |
| Baja | `npm test` **escribe en el repo real**: `verify-resilience-and-cli.js:6-26` crea `backlog/tasks/anomalous-orphan-task-file.md` en el árbol de trabajo (limpia en `finally`). Irónico dado que existe `verify-backlog-sync.js --hook` exactamente para mantener el árbol limpio. | gripm |
| Baja | `test-api-security.js:6-65` reimplementa el guard inline en vez de importar el de producción → **el test no puede detectar una regresión de seguridad**. | gripm |
| Baja | 4 identidades de producto en el playbook: `# ⚡ Gripm Playbook` (README:1), `"Agentic Team Playbook"` (README:320, CONTRIBUTING:3, description npm), bin `agentic-team-playbook` (pre-rename, muerto), y `@gripm/playbook`. | playbook |
| Baja | Mezcla EN/ES sin política: 6 core skills en español (rioplatense), `README`/`AGENTS`/`TEAM_PLAYBOOK` en inglés. Un usuario solo-anglófono recibe skills en español — y las mejores escritas son las españolas. Además hay artefactos de traducción automática: `rigorous-qa-auditor:96` *"Estados communicated con más que solo color"*, `:108` *"no tiene forma defixarlo"*. | playbook |
| Baja | `@gripm/board` no tiene `topics` de GitHub — el mecanismo primario de descubrimiento OSS — pese a tener 18 keywords en `package.json`. | gripm |
| Baja | Versión `0.0.0-stage` publicada en `@gripm/board` y nunca retirada ni deprecada. | registry |
| Baja | `scripts/purge-fabricated-task-sections.js` — un script cuyo nombre admite que limpia secciones de tareas "fabricadas". Sugiere que el backlog público contiene historial de tareas ficticias que ya no corresponden a commits reales. Vale la pena auditar qué queda de eso en el backlog público. | gripm |

### 4.6 Cobertura de tests: real pero con huecos y sin framework

**No hay framework de unit tests.** Cero `vitest`/`jest`/`node:test`/`ava` en dependencies. Todo es `node:assert` + `throw` top-level + `process.exit`. Sin coverage tooling, sin thresholds, sin watch, sin selección de tests, sin paralelismo.

Cuatro patrones de test usan **integración real vía extracción del plugin** (`verify-optimistic-locking`, `verify-sse`, `verify-legacy-import`, `verify-mcp-binary`) — excelente. Los huecos:

- **Cero tests de UI.** Ningún componente se renderiza. `DEV-172 "Cobertura de Tests para la Capa de UI"` está en `draft`. Con 8.813 líneas en 6 archivos de componentes, el mayor riesgo del producto no tiene red.
- `/api/fs/browse`, `/api/projects/detect-path`, `/api/retros`, POST/DELETE de `/api/releases`, `/api/import`, `/api/settings` — **sin cobertura**.
- El test SSE solo verifica el handshake, no `notifyChange` ni el debounce del file-watcher.
- El "test" de concurrencia es un único escenario 409 secuencial, no una carrera real.
- `runPlaybookSync` (240 de 678 líneas del playbook) **no tiene ningún test**.
- `validate-repo.mjs` — el guardián de consistencia del propio playbook — **no está testeado**.
- En el playbook, 2 aserciones son casi tautológicas: `assert.ok(budget)` sobre un objeto literal (`sync-provenance.test.mjs:83`), y un test duplicado literalmente entre `audit-ux.test.mjs:160-171` y `ci.yml:29-30`.

### 4.7 Sin automatización de release en ninguno de los dos repos

`gripm/.github/workflows/` contiene **un solo archivo** (`ci.yml`). No hay `release.yml`, no hay `npm publish`, no hay trigger por tag, no hay provenance/attestation, no hay `NPM_TOKEN` ni OIDC trusted publishing. Lo mismo en el playbook: `.github/workflows/` tiene exactamente un archivo.

**Consecuencia observable:** el tarball publicado de `@gripm/playbook@2.0.0` **no coincide** con el tag `v2.0.0` **ni** con `main`. Eso no es un accidente — es la firma directa de la publicación manual.

Gaps adicionales de CI en `gripm`:

- Sin `permissions:` block → el workflow hereda los permisos por defecto del token del repo. Debería ser `contents: read`.
- Sin `npm audit --audit-level=high` pese a commitear `package-lock.json`.
- Sin CodeQL / SAST.
- `dependabot.yml` existe (weekly) pero no hay gate que consuma sus hallazgos.
- Sin caché de `~/.gripm` ni aislamiento de `HOME` entre legs de la matriz — pasos 3, 8, 9 tocan `~/.gripm/registry.json` y el `backlog/tasks/` real.
- En `verify-resilience-and-cli.js:51` hay un `execSync('npm ...')` sin `shell: true`, a diferencia de `verify-publish-surface.js:59` que sí lo pone → **flake probable solo en Windows**, y `windows-latest` está en la matriz.

---

## 5. El problema de fondo

Todo lo anterior se reduce a una observación:

**El proyecto se autoexige una verificación exhaustiva y no la aplica a su propia frontera de publicación.**

`AGENTS.md` §4 define una "Gate de Calidad Verificable" con la regla explícita:

> *"Antes de pasar a `ready`, cada criterio de aceptación tildado (`- [x]`) debe estar respaldado por un comando o verificación ejecutable… Prohibido tildar ACs por deducción o inspección superficial sin aserción real."*

Y en §6 gotcha #17:

> *"Prohibido commitear en este archivo configuraciones o preferencias de entorno personales del desarrollador."*

**Ambas reglas se cumplen escrupulosamente dentro del repo, y ninguna se aplicó al publicar.** Concretamente:

| Regla interna | Aplicada al repo | Aplicada al paquete publicado |
|---|---|---|
| Prohibido filtrar datos personales | ✅ `.gripm/config.json` limpio, verificado | ❌ skills con `YourApp`, `PermissionGate`, check-in QR de iglesia |
| Prohibido suprimir tipos/linters | ✅ `@ts-ignore` prohibido severamente | ❌ `tsconfig.json` ni siquiera se shippea |
| Todo cambio debe tener AC trazable | ✅ 175 tareas con ACs | ❌ README anuncia ESLint borrado, `SECURITY.md` anuncia bins inexistentes |
| Gates ejecutables antes de entregar | ✅ 10 scripts de test | ❌ test de seguridad que valida una copia |
| Sync con ref pineado | ✅ documentado | ❌ degrada a unpinned silenciosamente |

La asimetría es reveladora: **el proceso funciona; lo que faltó fue correrlo contra el artefacto en vez de contra el repositorio.** `verify-publish-surface.js` ya existía y ya escaneaba el tarball — pero su denylist no incluía tokens de contenido de skills, y su regex de paths contenía el path del autor en vez de excluirlo.

Y hay una ironía adicional en `gripm-playbook`: el framework que predica "no inventes nombres de scripts" (`pm-orchestrator:89-90`) shippea un skill que inventa nombres de tools MCP (§3.3).

---

## 6. Recomendaciones

### P0 — Antes de cualquier acción de promoción (1–2 días)

**R1. Purgar el contenido de la aplicación filtrada.** Es lo único que puede dañar la reputación de forma irreversible, y es trivial de arreglar. Para los 4 stack packs: reescribir `ui-radix-tailwind`, `forms-rhf-zod`, `recharts-reporting`, `mobile-ux-design` desde cero sobre principles genéricas. Eliminar **todo** reference a `PermissionGate`, `people:edit`, `SPEC-070`, `People.tsx`, `Calendar.tsx`, `Tasks.tsx`, `Dashboard.tsx`, `SettingsPage.tsx`, `Auth.tsx`, `MobileBottomNav`, `MeetingDetailModal`, `Check-in QR`, `Gestionar Asistencia`, `Reuniones y servicios`, `Ministerios y grupos`, `OrgContext`, `get_dashboard_stats`, `social_links`, `vibrant-gradient-primary`, `font-mono-data`, y toda referencia a `v0.6.x`/`v0.9.1`. **Quitar "YourApp" de los 7 core skills** — o, mejor, reemplazarlo por un placeholder explícito como `[tu proyecto]`.

**R2. Arreglar el tarball como fuente de verdad.** Ejecutar `scripts/sync-playbook.mjs` contra el repo `gripm` para re-sincronizar `.agents/` desde el playbook limpio, y eliminar la copia aplanada. Agregar `.agents/stacks/` al sync. Esto mata el drift de §3.2 y de paso instancia la disciplina de "single source of truth" que el proyecto ya defender.

**R3. Arreglar el skill MCP.** O bien (a) implementar los alias `devboard_*` en `mcp-server.ts` — es ~10 líneas y hace cierta la promesa de retrocompatibilidad — o bien (b) reescribir las 15 ocurrencias a `gripm_*`. **Recomiendo (b)**: el paquete es nuevo en OSS, no hay usuarios a los que romper, y los aliases agregan superficie de mantenimiento permanente. Luego agregar un test que assertee que cada nombre de tool mencionado en `SKILL.md` existe en el registro del servidor — eso habría atrapado esto solo.

**R4. Corregir las 3 guardas de `0.0.0.0`.** Nunca desactivar allowlists por ser "LAN mode". En su lugar: cuando `configuredHost === '0.0.0.0'`, exigir un token explícito en el path o generar uno por sesión, y **no** reflejar el Origin del llamante. Agregar el modelo de amenaza a `SECURITY.md` y al README.

**R5. Contener `/api/fs/browse`.** Resolver `targetDir` y verificar que está dentro de una lista de raíces permitidas (`os.homedir()`, el registry de proyectos, o un conjunto explícito) antes de `readdirSync`. Rechazar el resto con 403. Mismo tratamiento para `POST /api/projects` (`repoPath`) y `detect-path`.

**R6. Arreglar el install del playbook.** Cambiar `README:196` de `cp -r … docs …` a una copia de un solo archivo (`docs/sprints/SPRINT_SPEC_TEMPLATE.md`), sin overwrite de `docs/BACKLOG.md`. Agregar `scripts/sync-playbook.mjs` y `.playbook-manifest.json` a `manifest.core`. Arreglar o eliminar `pwa-assets-audit`.

### P1 — Antes de buscar usuarios (1 semana)

**R7. Restaurar el historial.** Re-publicar `gripm` con los 67 commits reales. Configurar el remote a `gripm.git`. Esto es gratis y cambia la percepción del proyecto de "code dump" a "proyecto con trayectoria". **Recomendaría hacerlo preservando los commits pero reescribiendo los mensajes que contienen `dev-board`**, o alternativamente squash por milestone con tags — 6-8 commits coherentes serían infinitamente mejores que 1.

**R8. Implementar los opt-outs y manifests documentados.** `exclude` en `audit-ux-code.cjs` (o eliminarlo de los 3 docs). `manifest.preserved` consumido por `sync-playbook.mjs`. `FALLBACK_*` validado contra el manifest. O borrar la documentación de lo que no existe — **una feature documentada que no hace nada es peor que una feature ausente.**

**R9. Corregir los IDs de transición.** 5 correcciones puntuales. Agregar un check de IDs de transición a `validate-repo.mjs` — es ~15 líneas y es exactamente el tipo de drift que un framework de estados no puede permitirse. Agregar también la fila `ready → doing` que `STATE_MACHINE.md:62` describe en prosa pero no existe en la tabla.

**R10. Arreglar la divergencia playbook publicado ≠ main.** Publicar `@gripm/playbook@2.1.0` con el bin `gripm-playbook` y las URLs correctas, y mover `[Unreleased]` a `[2.1.0]`. Considerar `npm dist-tag add @gripm/playbook@2.0.0 deprecated` si 2.0.0 tiene el repo URL roto.

**R11. Documentación: pasar un clean-up sistemático.** Eliminar las 3 menciones de ESLint. Corregir `README:382` y `README.es.md:371` (counts reales: 175 tareas, 9 sprints). Corregir `SECURITY.md:61-62`. Corregir `CONTRIBUTING.md:88-94` (12 tools) y `:46` (timing). Corregir `docs/ARCHITECTURE.md:46` (endpoints reales). Renombrar `npm run format` → `backlog:sync` (y agregar un `format` real con Prettier, declarado en `devDependencies`). Agregar `topics` de GitHub a `gripm` (usar los 18 keywords que ya existen).

**R12. Fijar los bugs reales del motor de rules.** `buildUnits` debe contar `<` de tags, no `>` en general (o excluir `=>` explícitamente). Agregar el test faltante con `inputMode` **después** del arrow. Arreglar los tokens `"h-8 "` con espacio final en UX-009. Agregar `tests/fixtures/multiline-arrow/` con el orden que falla. Documentar o cambiar `needsContent`/`unlessContent` de archivo completo → al menos declarar en el bloque `authoring` que es semántica de archivo completo.

### P2 — Salud de código (1–2 meses)

**R13. Extraer el backend de `vite.config.ts`.** El objetivo ya está escrito en `DEV-165`: bajar de 2.560 a <300 líneas. El camino: `scripts/server/api.ts` (middleware), `scripts/server/store.ts` (persistencia Markdown), `scripts/server/watch.ts` (SSE). `vite.config.ts` queda como `defineConfig({ plugins: [react(), tailwind(), gripmApi()] })` con un import de una línea. Esto **también** permite reducir el tarball (sacando `src/` y `vite.config.ts` de `files`).

**R14. Dejar de correr el dev server en producción.** Con R13, `bin/gripm.js` puede servir `dist/` con `sirv` o similar y usar el middleware directamente — sin Vite en runtime. Eso permite mover `vite`, `tailwindcss`, `postcss`, `autoprefixer`, `@vitejs/plugin-react` a `devDependencies` (**~200 MB de ahorro por install**), sacar `src/` y `vite.config.ts` del tarball, y **dejar de publicar `dist/` como peso muerto** a la vez. Es la corrección de mayor impacto/esfuerzo de toda la lista.

**R15. Agregar un framework de tests y cobertura de UI.** Vitest (ya es dependencia transitiva del ecosistema vite) + `@testing-library/react`. Cubrir primero: `ItemModal` (1.608 líneas, el componente más crítico), `SettingsView` (1.995), `ReleaseAssembler` (1.202). Cerrar `DEV-172`. Agregar `npm audit --audit-level=high` al CI.

**R16. Dividir los 6 archivos gigantes.** `App.tsx` (1.521) tiene 20+ `useState` + ~15 `useCallback` en un solo body, sin context ni reducer. Extraer un `useProjectData()` hook + un context. `SettingsView` (1.995) → tabs separados. No es urgente para un repo de 1 mantenedor, pero es lo que va a impedir la primera contribución externa.

**R17. Declarar `esbuild` en `devDependencies`.** Y sincronizar `package-lock.json` (nombre `@gripm/board`, 3 bins).

**R18. Ignorar correctamente los artefactos de data.** Agregar `data/*-backlog.json`, `data/releases.json`, `data/test-repo-*` a `.gitignore`. Y hacer que `verify-resilience-and-cli.js` use un repo temporal en vez de escribir en el árbol real.

### P3 — Distribución y comunidad (continuo)

**R19. Automatizar el release en ambos repos.** Workflow con `on: { tags: [...] }`, `permissions: contents: read` en CI, `id-token: write` + npm trusted publishing (OIDC, sin tokens que rotar), `npm publish --provenance`, y `attestations: write`. Esto es lo que habría prevenido la divergencia de §4.7/R10. Agregar `release-please` o Changesets para el changelog y el versionado.

**R20. Convertir la frontera en una restricción auditada.** La lección de §3.1/§3.2 es que la "una fuente de verdad" necesita enforcement mecánico, no disciplina. Agregar al `prepublishOnly` de `@gripm/board` un check que: (a) falle si `.agents/skills/**` no coincide byte-a-byte con lo que `sync-playbook.mjs` produce del playbook, y (b) falle si aparece cualquier token de la denylist — en **todas** las skills, no solo el core. Extender `checkCorePurity` → `checkAllPurity` con un patrón (no una lista de 5 tokens): solo se permite `gripm` y nombres de librería conocidos.

**R21. Discovery.** `topics` en ambos repos (el playbook ya tiene 7; `gripm` tiene 0). Habilitar GitHub Discussions en ambos. Agregar `homepage` (el API devuelve `null` en los dos). Considerar un link de `Funding`.

**R22. Documentar la adopción.** Al playbook le falta: un ejemplo de repo, un snippet de CI para el consumidor, y una sección "cómo adaptar el framework a mi org". El README son 337 líneas de *pitch*; la guía de adopción son 3 líneas de `cp`/`npx` por opción. También falta el paso 5 de la Pirámide para los usuarios de Opción B (cómo cablear `audit-ux-code.cjs` a su `package.json` y CI).

**R23. Política de idioma.** Decidir y documentar: todo inglés con summaries españoles, o bilingüe completo. Hoy es mixto sin política, lo que hace que las skills (que son lo que un agente lee) estén en español mientras el README está en inglés.

**R24. `LICENSE` y atribución.** `Copyright (c) 2026 gripm Contributors` es internamente consistente pero no asigna copyright a nadie, lo cual es un hueco legal real (menor) para un proyecto de un solo mantenedor.

---

## 7. Veredicto

**Calidad de diseño: buena. Calidad de proceso: excelente dentro del repo, ausente en la frontera.**

El modelo de estados del playbook, el catálogo de reglas UX con documentación anti-drift y fixtures coverage-gated, la disciplina de SSOT, la defensa del tarball, el MCP server sobrio, la ausencia de command injection, la higiene de secretos y la matriz CI de 6 combinaciones — todo eso es trabajo serio y bien hecho. Hay piezas aquí que son genuinamente mejores que el promedio del OSS, y que un revisor experimentado reconocería.

**El problema es que ninguna de esas disciplinas se aplicó al artefacto que los usuarios reciben.** Y el síntoma no es unlucky — es estructural: se publicaron 20 días de trabajo en una tarde, sin una sola hora de lectura externa. Por eso hay contenido de una app de iglesia con check-in QR distribuido a los usuarios de npm, un skill que enseña tools MCP inexistentes, tres archivos de doc anunciando ESLint borrado, y un tarball cuyo metadata apunta a un repo que ya no existe.

**La buena noticia: R1–R6 son trabajo de un día o dos y eliminan el 90% del daño reputacional.** Todo lo demás es ingeniería de mejora continua. La prioridad #1 absoluta es **R1 (purgar la fuga) + R4/R5 (seguridad) + R6 (install que no destruye datos) + R7 (restaurar historial)** — en ese orden, antes de promover cualquier cosa.

**Y una sugerencia no técnica:** antes de invertir en features, correr un "code review de ojos frescos" — pedirle a 3 personas que instalen `@gripm/board` siguiendo únicamente el README y reporten dónde se rompen. Ese ejercicio, en una tarde, encuentra más problemas de adopción que cualquier cantidad de trabajo arquitectural.

---

## Apéndice — Tablero de severidad

| # | Severidad | Hallazgo | Repos |
|---|---|---|---|
| 3.1 | **CRÍTICA** | Skills filtran contenido de app ajena (`YourApp`, `PermissionGate`, check-in QR) — llega a usuarios npm | ambos |
| 3.2 | **CRÍTICA** | `gripm` shippea copia sucia y aplanada de los skills (drift vs. playbook) | ambos |
| 3.3 | **CRÍTICA** | SKILL.md enseña `devboard_*` tools que no existen (15 ocurrencias) | gripm |
| 3.4 | **CRÍTICA** | Las 3 guardas de seguridad se desactivan con host `0.0.0.0` + CORS reflexivo | gripm |
| 3.5 | **CRÍTICA** | `/api/fs/browse` enumera el filesystem sin contención | gripm |
| 4.1 | ALTA | Historia 67 commits → 1 commit | gripm |
| 4.2 | ALTA | `vite.config.ts` = 2.560 líneas con el backend entero; se shippea a npm | gripm |
| 4.3 | ALTA | Tarball publica `dist/`, `src/`, `scripts/` y `vite.config.ts` innecesarios (2,2 MB) | gripm |
| 4.4 | ALTA | README/README.es/CHANGELOG anuncian ESLint eliminado; no hay linting | gripm |
| 4.5a | ALTA | 5 IDs de transición erróneos (incl. `T6` inexistente) | playbook |
| 4.5b | ALTA | `.uxaudit.json exclude` documentado e implementado en 0 | playbook |
| 4.5c | ALTA | `manifest.preserved` no lo consume nadie | playbook |
| 4.5d | ALTA | Install recomendado sobreescribe `docs/BACKLOG.md` del consumidor | playbook |
| 4.5e | ALTA | `validate-repo.mjs` se shippea pero no puede pasar en repo consumidor | playbook |
| 4.5f | ALTA | `sync-playbook.mjs` documentado en 4 lugares, nunca instalado | playbook |
| 4.5g | ALTA | Tarball playbook publicado ≠ tag ≠ main (URLs viejas, bin faltante) | registry |
| 4.6 | ALTA | Cero tests de UI; sin framework de tests; `runPlaybookSync` sin tests | ambos |
| 4.7 | ALTA | Sin automatización de release en ninguno de los dos repos | ambos |
| — | MEDIA | `buildUnits` reintroduce el bug documentado; sin test del orden que falla | playbook |
| — | MEDIA | Semántica archivo-completo en UX-006/007; `"h-8 "` con espacio final | playbook |
| — | MEDIA | `pwa-assets-audit` apunta a script inexistente | playbook |
| — | MEDIA | Sync degrada a unpinned silenciosamente al agotar la API de GitHub | playbook |
| — | MEDIA | `[Unreleased]` ya dentro del tag `v2.0.0` | playbook |
| — | MEDIA | Test de seguridad valida una copia, no producción | gripm |
| — | MEDIA | Sin `permissions:` block, sin `npm audit`, sin CodeQL | gripm |
| — | BAJA | ~20 hallazgos menores de docs/branding/higiene (tabla §4.5) | ambos |