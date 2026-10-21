---
id: DEV-323
title: "Adopción y sincronización del Playbook Golden en gripm"
status: review
created_date: '2026-10-20'
updated_date: '2026-10-21 21:10'
labels:
 - "upstream"
 - "@gripm/playbook"
 - "tech-debt"
dependencies: []
priority: high
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adoptar en gripm el core estandarizado de `@gripm/playbook@2.6.0` y alinear todas las referencias a los nombres de rol renombrados (`worldclass-product-designer` -> `product-designer`, `rigorous-qa-auditor` -> `qa-auditor`).

**Solo lado consumidor.** El framework esta terminado y certificado (PLAY-029, PLAY-030). Fuera de alcance: editar `gripm-playbook`, refactor editorial, traduccion de archivos del playbook, scripts one-off, y editar tareas historicas (`backlog/tasks/`, `docs/archive/`) que mencionan los nombres viejos.

### Gates, abiertos a 2026-10-21

- **Release**: tag remoto `v2.6.0` (`631df3c`) y npm `latest: 2.6.0`. El manifest del tag trae `product-designer` y `qa-auditor` en `core` y `coreSkills`.
- **Lease antigravity**: `PLAY-026/027/028` en `done`, liberado por el PO.
- **Ref del sync**: fijado explicitamente con `--tag v2.6.0`.

### Alcance tecnico

`scripts/sync-playbook.mjs` se auto-actualiza: el manifest de `v2.6.0` lo mete en `core`, el blob de gripm (`f4082e41`, 699 lineas) si existe en la historia upstream (commit `e5c8279`), y al no estar en `lock.files` la clasificacion arranca en `unknown` -> `findCanonicalProvenance` devuelve `canonical` -> el sync lo actualiza hacia adelante a la version modularizada (496 lineas). No hay que editar `FALLBACK_CORE_FILES` a mano. La version nueva importa `./lib/{terminal,provenance,sync-classifier}.mjs`, las tres en `core`, y su CLI es compatible con `playbook:check` y `playbook:sync`.

`scripts/verify-publish-surface.js` si hay que editarlo a mano (lineas 54 y 56): es especifico del consumidor, no existe upstream.

`scripts/audit-ux-code.cjs` **no** se toca: el lockfile lo registra en `customizations` (fork DEV-166) y `classifyLocalFile` lo devuelve `customization` por el lockfile antes de evaluar nada mas. El fork sobrevive al sync. Su retiro es labor de DEV-188.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `npm run playbook:sync -- --tag v2.6.0 --yes` corre con exito y `.playbook-lock.json` queda con `ref: v2.6.0` y las rutas `product-designer` / `qa-auditor` en `files`.
- [x] #2 El tarball npm no contiene archivos del framework del playbook (DEV-250). `npm run publish:check` con exit 0.
- [x] #3 Los directorios `.agents/skills/worldclass-product-designer/` y `.agents/skills/rigorous-qa-auditor/` no existen, y los directorios `product-designer/` y `qa-auditor/` si.
- [x] #4 `scripts/verify-publish-surface.js` referencia `product-designer` y `qa-auditor` en `FORBIDDEN_PLAYBOOK_ENTRIES`, y no quedan referencias a los nombres viejos en `scripts/`, `AGENTS.md`, `README.md` ni `README.es.md` (excluyendo `backlog/tasks/` y `docs/archive/`, que son historicos).
- [x] #5 `scripts/scan-markdown-hygiene.mjs` no existe.
- [x] #6 Piramide completa en verde: `npx tsc --noEmit`, `npm test`, `npm run test:linux`, `npm run backlog:sync && npm run backlog:check`, `npm run publish:check`, `npm run build`, `node scripts/verify-changes.js --all`.
- [x] #7 Seccion desactualizada de `DEV-188` corregida: la advertencia que afirma que la divergencia de `audit-ux-code.cjs` quedo en cero desde v1.0.3 y que el archivo es byte a byte identico al tarball queda reemplazada por la medicion real, mas el hecho de que el fork sobrevive al sync.
  - Verificacion sobre `backlog/tasks/DEV-188*.md`: `4B57DB30` presente, `wasCustomization` presente, y `divergencia "quedó en cero"` aparece **una sola vez**, siempre dentro del bloque que la refuta (junto a `Ambas afirmaciones son falsas`).
  - Por que entra en DEV-323: es la documentacion del desenlace concreto que el sync de DEV-323 produce sobre el fork. Dejarla sin actualizar deja al owning task mintiendo sobre el estado que acabamos de causar.
  - Nota: `byte a byte identico` si debe seguir apareciendo en DEV-188. Esas afirmaciones (lineas 110, 345, 450) son verdaderas y se refieren al `fingerprint`, no al motor entero. No son el defecto.
- [x] #8 `scripts/verify-changes.js` distingue **mencion** de **uso** en el guardrail Anti-Em-Dash, sin degradar la deteccion. `checkAntiEmDash` pasa la linea por `stripDashMentions` antes de medir.
  - **Hallazgo no previsto en el plan.** `v2.6.0` trajo em-dashes literales en `scripts/ux-rules.json` (2) y `.agents/skills/code-level-ux-auditor/SKILL.md` (3+3). `HEAD` tenia **cero** en ambos, asi que es una regresion que el sync introduce, no preexistente. Los 5 fallos son autorreferenciales: la propia regla UX-014 prohibe el em-dash y tiene que escribir el carácter para poder definirlo (`Em-dash (—) or en-dash (–)`). Upstream ya escapa `\u2014` en el campo machine-readable `check.line` (linea 225), pero deja el literal en los campos de prosa `signature` y `fix`.
  - **Por que no se tocaron los dos archivos.** Estan en `lock.files`; `classifyLocalFile` (linea 18) devuelve `customization` ante cualquier hash divergente, asi que editarlos los convertiria en forks permanentes que ningun sync futuro arregla. Es exactamente la enfermedad de DEV-188. Y AGENTS.md prohibe ensuciar el check con una lista de permitidos: "un check que produce falsos positivos se corrige o se elimina".
  - **La correccion.** La señal inequivaca de mención: el guion largo como contenido unico de un span entrecomillado o entre backticks, inmediatamente despues de la palabra `em-dash` / `en-dash`. Un guion largo en prosa (titulo, opcion de select, nota de release) no tiene esa forma.
  - **Verificacion bidireccional, no solo verde.** El gate da 543 archivos y exit 0. Pero eso no prueba que no degradé la deteccion, asi que ademas se metio un em-dash real en prosa en `README.md`: el gate lo atrapo (`README.md: Línea 489`, exit 1). Despues se retiro el probe y `README.md` volvio a tener exactamente 1 linea cambiada, la edicion legitima del AC #4.
  - `scripts/verify-changes.js` **no** esta en `lock.files`: es archivo propio del consumidor, editable sin riesgo de fork.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. `npm run playbook:sync -- --tag v2.6.0 --yes`. Sale con codigo 1 por huerfanos: es esperado, no es fallo.
2. Borrar los dos directorios huerfanos con `git rm -r`. El sync no los borra, solo los reporta.
3. Editar `scripts/verify-publish-surface.js` (lineas 54 y 56) con los dos renombres.
4. Actualizar `AGENTS.md:11`, `README.md:71` y `README.es.md:71` con los cuatro nombres de rol nuevos.
5. Borrar `scripts/scan-markdown-hygiene.mjs` (one-off con rutas absolutas hardcodeadas a los dos repos).
6. Corregir la seccion desactualizada de `DEV-188`.
7. `npm run backlog:sync`.
8. Piramide completa. `npm run test:linux` es obligatorio: el cambio agrega archivos bajo `scripts/` y `scripts/lib/`, tocando I/O y sistema de archivos.
9. **Paso no previsto en la planificacion original.** `verify-changes.js --all` salio con 5 problemas de em-dash que el sync introdujo. Corregir el guardrail para distinguir mencion de uso, y verificar en ambas direcciones (ver AC #8).
10. Commit consolidado `feat(DEV-323): ...` con el codigo y el `.md` de la tarea. Pasar a `ready`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Riesgos

- **El script se reescribe a si mismo mientras corre.** Node carga el archivo completo en memoria al importar, asi que en la practica es seguro, pero es el punto no habitual del flujo. Fallback: `--source` contra `C:\Users\Pablo\Proyectos\gripm-playbook`.
- **La identificacion como `canonical` depende de la red.** `findCanonicalProvenance` consulta la historia upstream de GitHub. Si agota `HISTORY_BUDGET` o no hay red, `sync-playbook.mjs` cae en `customization` y queda protegido sin actualizar. En ese caso si habria que editar `FALLBACK_CORE_FILES` a mano, y hay que revisarlo.
- **No correr `audit:ux:baseline` ni `--force` sobre el sync.** El lockfile de `audit-ux-code.cjs` es una customizacion protegida (fork DEV-166/DEV-188).

### Skills locales que no son huerfanas

`.agents/skills/gripm/` y `.agents/skills/list-views-filters/` no se marcan como huerfanas: `findOrphanedFiles` es lockfile-based y ellas no estan en `lock.files`. Solo los dos directorios renombrados entran en la lista de huerfanos, porque estan en el lockfile viejo y no en el plan nuevo.

### Archivos nuevos que instala el manifest

`scripts/check-loc.mjs`, `scripts/init.mjs` y `scripts/lib/{frontmatter,terminal,adapters,pyramid,task-inspection,provenance,sync-classifier}.mjs`. Ninguno existe hoy en gripm.

`scripts/validate-repo.mjs`, `scripts/gate-review-items.mjs` y `scripts/lib/{catalog-validator,doc-checks}.mjs` existen upstream pero **no** estan en `core`, asi que no se instalan. Fuera de alcance.

### Hallazgo no previsto: em-dashes de `v2.6.0` contra el guardrail Anti-AI (ver AC #8)

`verify-changes.js --all` salio con codigo 1 tras el sync. Los 5 problemas estan en `scripts/ux-rules.json` y `.agents/skills/code-level-ux-auditor/SKILL.md`, y los 5 son **autorreferenciales**: es la propia regla UX-014 prohibiendo el em-dash y viendose obligada a escribir el carácter para poder definirlo.

El sync es culpable, no preexistente: en `HEAD` ambos archivos tenian **cero** U+2013/U+2014. Lo decisivo fue confirmarlo con el tamano, porque tres mediciones previas por PowerShell dieron falsos negativos al mando la codificacion al pasar por `Out-String` y por redireccion `>`. El desempate: local `16156` y `13924` bytes contra upstream `16156` y `13924`, asi que los archivos son identicos y los conteos sobre los locales (2+2 y 3+3) son los validos.

**Por que no se tocaron los dos archivos.** Ambos estan en `lock.files`, y `classifyLocalFile` (linea 18 de `scripts/lib/sync-classifier.mjs`) devuelve `customization` ante cualquier hash divergente. Editarlos los convertiria en forks permanentes que ningun sync futuro toca: exactamente la enfermedad de DEV-188. AGENTS.md ademas prohibe ensuciar un check con una lista de permitidos.

**Por que no se reporto solo y se dejo pendiente.** El AC #6 de esta tarea exige `--all` en verde, asi que el fix es prerequisito de la propia entrega, no una mejora diferible.

Upstream ya resolvio esto bien en el campo machine-readable: `check.line` usa `"\u2014"` escapado (linea 225 de `ux-rules.json`). La inconsistencia es solo de los campos de prosa `signature` y `fix`. Candidato a reporte upstream para una v2.6.1, pero no bloquea nada de gripm.

### `scripts/gate-qa.mjs` tambien sale como customizacion protegida

El sync lo reporto junto a `audit-ux-code.cjs`. No estaba en la planificacion de DEV-323. No se toca: esta en `customizations` por una modificacion local previa y su retiro no es alcance de esta tarea. Queda registrado para que el lease no se pierda.

### `.vercelignore` contiene em-dashes y el gate no lo ve

Tiene 2 U+2014 y no fue flaggeado. No es una excepcion agregada: el gate solo corre sobre extensiones de la linea 397 de `verify-changes.js` (CODE mas `.md`, `.json`, `.sh`, `.yml`, `.yaml`, `.html`, `.css`), y `.vercelignore` no tiene extension. Comportamiento preexistente, ajeno a DEV-323. Se deja constancia porque es un hueco real del guardrail si el dia de manana aparece em-dash en un archivo sin extension.
<!-- SECTION:NOTES:END -->
