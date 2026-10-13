# Registro de Decisiones de Arquitectura (ADR)

Este directorio es el **registro de decisiones de arquitectura** de gripm. Cada archivo es un *Architecture Decision Record* (ADR): un registro inmutable, breve y fechado de **una** decisión arquitectónica, por qué se tomó y qué se descartó.

Complementa, no reemplaza, a los otros documentos del repositorio:

| Documento | Responde a | Naturaleza |
| :--- | :--- | :--- |
| [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | ¿Cómo es el sistema **hoy**? | Referencia técnica mutable (topología, catálogo de archivos, modelo de datos). |
| [`AGENTS.md`](../../AGENTS.md) | ¿Cómo se opera el proyecto? | Reglas, gotchas y guardrails anti-regresión. |
| `docs/adr/*` | ¿Por qué el sistema **es** así? | Registro histórico inmutable de decisiones y alternativas descartadas. |

Si una decisión cambia, `ARCHITECTURE.md` se actualiza y se escribe un ADR nuevo que marca al anterior como `Reemplazado`. Un ADR nunca se edita para cambiar de opinión.

---

## 1. Cuándo escribir un ADR

Escribí un ADR cuando la decisión **no es derivable del código** y su reversión costaría trabajo real. En la práctica:

**Sí merece un ADR:**
- Elección de una tecnología o patrón estructural con trade-offs reales (ej.: Markdown como fuente de verdad vs. base de datos).
- Límites de seguridad asumidos explícitamente (ej.: un daemon local sin autenticación).
- Restricciones de plataforma que condicionan el diseño (ej.: el MCP sobre `stdio`).
- Decisiones que ya provocaron un bug o un jank y que por eso quedaron blindadas por una regla (ej.: overlays vía portales).

**No merece un ADR:**
- Detalles de implementación locales a un solo archivo.
- Refactors sin cambio de trade-offs.
- Bug fixes que restauran el comportamiento ya documentado.

Cuando la decisión nace de una tarea del backlog, el ADR referencia el ID de esa tarea (`DEV-129`, `DEV-190`, ...). El campo `ADR Recorded` de [`docs/sprints/SPRINT_SPEC_TEMPLATE.md`](../sprints/SPRINT_SPEC_TEMPLATE.md) apunta a la ruta del ADR correspondiente.

---

## 2. Convención de nombres y numeración

```
docs/adr/NNNN-slug-en-kebab-case.md
```

- `NNNN`: número de 4 dígitos, **secuencial e inmutable**. Se asigna como `máximo actual + 1` en el momento de crear el registro.
- `slug`: resumen de la decisión en kebab-case, en español.
- `0000-plantilla.md` está reservado a la plantilla y no es un registro.

Ejemplos: `0001-markdown-como-fuente-de-verdad.md`, `0002-backend-embebido-como-plugin-de-vite.md`.

**Los ADR aceptados son append-only.** Para cambiar una decisión: se agrega un registro nuevo y en el anterior sólo se actualizan `estado` y `reemplazado_por`. Nunca se renumera, no se borra y no se reescribe el cuerpo de un ADR aceptado.

---

## 3. Estados canónicos

| Estado | Significado |
| :--- | :--- |
| `Propuesta` | Redactado y en discusión. No obliga a nada todavía. |
| `Aceptado` | Vigente. El código y la documentación deben ser consistentes con esta decisión. |
| `Reemplazado` | Hubo una decisión posterior que lo dejó de hecho. Debe referenciar `reemplazado_por`. |
| `Obsoleto` | El contexto que lo justificaba ya no existe, sin que otra decisión lo sustituya. |

> Un ADR en `Reemplazado` u `Obsoleto` **no se borra**: el valor del registro es precisamente poder leer por qué se descartó una opción y evitar que un futuro cambio la re-introduzca sin conocer su costo.

---

## 4. Formato del documento

Cada registro sigue el formato derivado de **MADR** (*Markdown Any Decision Records*), adaptado al idioma y a la trazabilidad del backlog. La plantilla completa está en [`0000-plantilla.md`](0000-plantilla.md).

```markdown
# NNNN — Título de la decisión

- **Estado:** Aceptado
- **Fecha:** YYYY-MM-DD
- **Tareas:** DEV-XXX, DEV-YYY

## Contexto
## Decision Drivers
## Opciones consideradas
## Decisión
## Consecuencias
## Referencias
```

Reglas de redacción:

- **Una decisión por registro.** Si el título necesita la palabra "y", probablemente son dos ADR.
- **Los descartes se justifican.** Una opción sin motivo de rechazo es contexto perdido.
- **Las consecuencias negativas son obligatorias.** Un ADR que sólo lista beneficios no registra el costo real de la decisión.
- **Afirmaciones verificables.** Si un ADR cita un archivo, una ruta o un comportamiento, debe seguir siendo cierto en el código.

---

## 5. Índice de registros

| # | Decisión | Estado | Fecha |
| :--- | :--- | :--- | :--- |
| [0001](0001-markdown-como-fuente-de-verdad.md) | Markdown como fuente de verdad del backlog | Aceptado | 2026-10-13 |
| [0002](0002-backend-embebido-como-plugin-de-vite.md) | Backend embebido como plugin de middleware de Vite | Aceptado | 2026-10-13 |
| [0003](0003-servidor-mcp-por-stdio.md) | Servidor MCP sobre stdio con núcleo de persistencia compartido | Aceptado | 2026-10-13 |
| [0004](0004-daemon-local-sin-autenticacion-http.md) | Daemon local monousuario sin autenticación HTTP | Aceptado | 2026-10-13 |
| [0005](0005-overlays-via-portales-y-layout-estable.md) | Overlays montados vía portales y layout raíz estable (cero CLS) | Aceptado | 2026-10-13 |

---

## 6. Candidatas pendientes

Decisiones vivas del backlog que **todavía** no tienen registro y son candidatas naturales a un ADR:

- Servir estáticos de producción (`vite preview`) en lugar del dev server (trade-off cold start vs. HMR y source maps), diferido explícitamente por `DEV-164`.
- Migración a React 19 y tooling core (`DEV-180`).
- Empaquetado de binarios standalone en `bin/` y su efecto en el tarball de npm (`DEV-155`).