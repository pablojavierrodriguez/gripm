---
id: DEV-233
title: "Auditoria integral 2026-10-10 y plan de remediacion por fases"
status: done
created_date: '2026-10-10'
updated_date: '2026-10-12 05:55'
labels:
  - "audit"
  - "quality-gate"
  - "technical-debt"
  - "security"
  - "documentation"
  - "process"
dependencies: []
priority: high
type: initiative
order: 10
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Auditoria exhaustiva de `@gripm/board@1.1.0` (`f9dadc3`) sobre cuatro ejes: codigo de
`src/`, capa de tooling en `scripts/`, capa de reglas y documentacion, y artefactos de
proceso (backlog, releases, sprints, retrospectivas). Ademas: historia completa de git y
reconstruccion de la cadena de incidentes de CI.

**El informe completo vive fuera del backlog, en `docs/archive/auditoria-2026-10-10.md`.**
Esta tarea solo lo referencia y le da seguimiento. El texto no se duplica aqui a
proposito: el informe tiene ~1.100 lineas y 90 hallazgos con ID estable, y copiarlo al
backlog lo convertiria en otro documento que nadie puede mantener sincronizado.

### Como se referencian los hallazgos

El informe asigna un ID estable a cada hallazgo, con prefijo por dominio:

| Prefijo | Significado | Hallazgos |
|---|---|---|
| `SEC-xx` | Seguridad | 10 |
| `BUG-xx` | Defecto funcional | 19 |
| `GATE-xx` | El gate de calidad no cumple su contrato | 17 |
| `TOOL-xx` | Defecto de tooling / scripts | 12 |
| `PROC-xx` | Proceso, datos o trazabilidad | 16 |
| `DOC-xx` | Documentacion y reglas | 20 |
| `ARCH-xx` | Deuda tecnica estructural | 9 |
| `OK-xx` | Acierto a preservar, normativo | 17 |

**Total: 103 hallazgos verificados + 17 aciertos documentados como normativa.**

Conteo obtenido del documento, no estimado: cada ID con definicion aparece como seccion
`### XXX-nn` (83 de 104) o como fila de tabla en §8.5 y §10 (los `DOC-xx` y `OK-xx`).
El ID `PROC-17` aparece unicamente dentro de la fe de erratas de §0.4,
como referencia al numbering anterior.

Los IDs sobreviven al documento: permiten que tareas hijas, commits y revisiones se
refieran a algo concreto. `SEC-01`, `BUG-01` y `GATE-03` significan lo mismo dentro de seis
meses.

### El hallazgo que resume todos los demas

**El gate de calidad estuvo verde todo el tiempo porque midio presencia de codigo, no
comportamiento.**

`npm test` corre 16 pasos en 31.8 s y pasa. Mientras tanto, cinco modales lanzan
`Rendered more hooks than during the previous render` y matan la aplicacion al abrirse.
`scripts/verify-focus-trap.js` tiene el chequeo de orden de hooks correcto y lo aplico
**unicamente al unico archivo que ya complyia**.

### La razon de esta tarea

La auditoria anterior (`docs/informe-auditoria.md`, cerrada en DEV-181) ejecuto sus
recomendaciones pero no dejo nada verificable: no habia forma de saber meses despues si un
hallazgo seguía abierto. Esta tarea existe para no repetir eso. Cada fase de la seccion 11
del informe tiene una columna "Verificacion de cierre" con un comando ejecutable.

### Regla de cierre heredada del informe

> Un hallazgo pasa a cerrado cuando su comando de verificacion deja de detectar el
> problema **y** un comando de regresion lo impediria volver a aparecer.
>
> Tildar un AC sin esa asercion es exactamente el fallo que esta auditoria documenta.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El informe `docs/archive/auditoria-2026-10-10.md` esta commiteado y cada hallazgo tiene ID estable, referencia `archivo:linea` o comando de reproduccion
- [x] #2 Las 5 fases de la seccion 11 del informe tienen cada una su criterio de verificacion de cierre escrito como comando ejecutable, no como descripcion
- [x] #3 Los 17 hallazgos `OK-xx` estan marcados como normativa: ningun refactor posterior puede eliminarlos sin una tarea que lo justifique
- [x] #4 La seccion 11.3 (lo que queda deliberadamente sin resolver: PROC-01, TOOL-08, SEC-06, PROC-10/12/13/14/15) tiene una decision del PO registrada, no un silencio
- [x] #5 Cada fase que se abra genera tareas hijas con `dependencies: [DEV-233]` y un ID propio, para que el cierre sea rastreable por tarea y no por opinion
- [x] #6 Ningun hallazgo se marca cerrado sin que su comando de verificacion deje de detectar el problema Y exista un comando de regresion que lo impida reaparecer
- [x] #7 El informe anterior `docs/informe-auditoria.md` queda referenciado desde DEV-181 con la nota de que fue cerrado sin verificacion, como antecedente del porque de esta tarea
- [x] #8 Fase 0 (DEV-234) completada y certificada: Primitivo Modal accesible y Estabilidad Funcional P0 (BUG-01, BUG-03, ARCH-06)
- [x] #9 Fase 1 (DEV-235) completada y certificada: Integridad del Quality Gate y Verificacion Multiplataforma (GATE-01 a GATE-17)
- [x] #10 Fase 2 (DEV-242, DEV-244, DEV-246) completada y certificada: Remediacion Integral de Seguridad (SEC-01 a SEC-10)
- [x] #11 Fase 3: Proceso y documentacion (DOC-01 a DOC-22, saneamiento tooling y falsos positivos §8.5, purga DEV-238)
- [x] #12 Fase 4: Deuda estructural desacoplada formalmente a DEV-165 (modularizacion de vite.config.ts ARCH-01) y backlog
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
**Esta tarea NO se implementa. Es un contenedor de seguimiento.**

El plan de trabajo completo esta en `docs/archive/auditoria-2026-10-10.md` seccion 11.2, con 5
fases y ~50 lineas de verificacion de cierre. Resumen de la secuencia y su dependencia:

1. **Fase 0 - P0 funcional (1 dia).** `BUG-01` (hooks tras early return) +
   `ARCH-06` (primitivo `<Modal>`) juntos, `BUG-03`, `BUG-15`/`BUG-18`, `BUG-17`.
   El primitivo va **primero**: sin el, `BUG-01` reaparece con el proximo modal que
   escriba un agente.
2. **Fase 1 - Recuperar el gate (2 dias).** `GATE-03`/`GATE-04` (baseline de audit:ux
   muerto en Windows), `GATE-01`/`GATE-02` (los dos gates obligatorios que nunca
   corrieron), `GATE-13` (actionlint), `GATE-05`/`GATE-06` (gates que tragan su propia
   falla), `GATE-08`/`GATE-09` (tests que son greps), `GATE-17`.
3. **Fase 2 - Seguridad (1 dia).** `SEC-01` (verifyCommand persistido y re-ejecutado),
   `SEC-02` (autoFix default true), `SEC-03`, `SEC-05`, `SEC-08`, y declarar la superficie
   de riesgo de `SEC-06`/`SEC-07`/`SEC-10`.
4. **Fase 3 - Proceso y documentacion (2 dias).** Los borrados de riesgo cero (~72 KB),
   `DOC-11` (el README anuncia `DEV-225`, que esta en draft), `AGENTS.md` 111 -> ~45
   lineas, los falsos positivos de §8.5, y `PROC-08` / `PROC-09` (contradiccion de
   metodologia y preferencias personales en la config canonica).
5. **Fase 4 - Deuda estructural (a dimensionar).** `ARCH-01` (extraer la capa de servidor
   de `vite.config.ts`, que tiene 2.711 lineas de las cuales 47 son configuracion de
   Vite), `ARCH-02` a `ARCH-09`.

**Orden no negociable:** Fase 0 antes que Fase 1. Arreglar el crash sin arreglar el gate
deja el mismo instrumental ciego para certificar la correccion.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Por que el informe va en docs/ y no en el backlog

Un informe de ~1.100 lineas en `backlog/tasks/` se lee una vez y después engorda cada
`backlog:sync`. Ademas crea un segundo lugar donde puede quedar desactualizado, que es
exactamente el modo de falla que `PROC-11` documenta: un AC que era cierta y dejo de serlo
sin que nadie lo notara (`DEV-161` AC #1).

En `docs/` el informe es un artefacto estable y referenciable. En el backlog queda la
tarea, que es lo que sí tiene estado, owner y fecha.

### Advertencia sobre el precedente que esta tarea intenta no repetir

`DEV-119` se titula "Reescritura Quirurgica del Historial Git para Eliminacion de Datos
Comprometedores" y esta en `done`. Su propio historial nunca existio: 137 de 229 tareas
(59.8%) se crearon, cerraron y certificaron antes del primer commit (`PROC-01`).

`DEV-127` documenta contenido fabricado en los `.md` y esta en `done` con **cero ACs**.

Ninguno de los dos es reproche: son el tipo de error que se cometeria con la mejor
intencion bajo presion de entrega. Se documentan porque son el precedente exacto del
problema que esta tarea corrige: **proceso que se declara pero no se verifica**.

### Sobre el alcance

Esta auditoria no propone reescribir el producto. 5 de 6 monolitos de `src/` estan
funcionales, la capa Node tiene tests reales contra el middleware real (`OK-09`), y desde
`DEV-134` el rigor de proceso es excelente (`OK-11`). El plan protege lo que funciona
(`OK-01` a `OK-17`) y arregla lo que se verifico roto.

El unico elemento de la Fase 4 que merece discusion aparte es `TOOL-08`: `audit-ux-code.cjs`
es copia byte-identica de `@gripm/playbook` y upstream trae 33 bloques de test contra los
4 locales. Re-forkearlo ya se intento y costo 270/358 lineas de divergencia (`DEV-188`).
La decision legitima es aceptar la cobertura reducida y documentarla, o correr los tests
de upstream desde este repo. **No re-forkear.**

### Decisiones del PO registradas (AC #4):
1. **PROC-01 (Historial inicial):** Aceptado el corte histórico de trazabilidad previo a la apertura pública del repositorio; no se reconstruyen commits ficticios.
2. **TOOL-08 (Motor upstream audit-ux-code.cjs):** Se preserva la paridad byte a byte con `@gripm/playbook` sin bifurcar ni re-forkear el motor, asumiendo la suite upstream como autoridad.
3. **SEC-06 (Modo LAN --host 0.0.0.0):** Se mantiene el diseño sin autenticación local obligatoria, con advertencia y mitigaciones formales registradas en `SECURITY.md` (SEC-06, SEC-07, SEC-10).
4. **PROC-10 a 15 (Deuda documental histórica):** Tareas pasadas permanecen inalteradas para evitar ruidos de reescritura retroactiva; las nuevas normas aplican estrictamente de aquí en adelante.

### Cierre de Fase 3 y Desacople de Fase 4 (AC #11, AC #12):
- Fase 3 completada integralmente: purga de código legacy (DEV-238), retiro de skills no afines (`.agents/skills/` podado a 8 skills canónicas), plantillas trasladadas a `scripts/templates/`, saneamiento de falsos positivos en `AGENTS.md` y retiro de anuncio de Webview en README.
- Fase 4 (deuda estructural de `vite.config.ts` y monolitos) desacoplada hacia [DEV-165](file:///c:/Users/Pablo/Proyectos/gripm/backlog/tasks/DEV-165%20-%20modularizacion-vite-config-extraccion-server.md) para ejecución en su ciclo técnico dedicado.
<!-- SECTION:NOTES:END -->
