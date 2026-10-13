# NNNN — Título de la decisión en una frase imperativa

- **Estado:** `Propuesta` (valores canónicos: `Propuesta`, `Aceptado`, `Reemplazado`, `Obsoleto`)
- **Fecha:** `YYYY-MM-DD`
- **Tareas:** `DEV-XXX`, `DEV-YYY` (IDs del backlog que originaron o motivaron la decisión)
- **Reemplaza:** `ADR-NNNN` (sólo si esta decisión sustituye a una previa)

> Borrador: eliminá las secciones de ejemplo al momento de escribir el registro real.

---

## Contexto

Cuál es el problema, la restricción de plataforma o la tensión que obliga a decidir. Incluí
el estado del arte real: qué existe hoy en el código, qué límites impone el entorno (Node, el
modelo de despliegue, el protocolo, el costo operativo). Un lector que no conoce el historial
del proyecto debe poder entender por qué la pregunta existía.

## Decision Drivers

Los criterios que pesan de verdad en la decisión, ordenados por peso relativo. Si son
tensionados entre sí, decilo explícitamente.

1. `<criterio de mayor peso>`
2. `<criterio siguiente>`

## Opciones consideradas

### Opción A — `<nombre>`

- **A favor:** `<beneficio concreto>`
- **En contra:** `<costo o límite concreto>`
- **Veredicto:** `<por qué se descarta>`

### Opción B — `<nombre>`

- **A favor:** `<beneficio concreto>`
- **En contra:** `<costo o límite concreto>`
- **Veredicto:** `<por qué se descarta>`

## Decisión

**Adoptamos `<opción elegida>`.**

Detallá la decisión en su forma operacional: qué se hace, dónde vive la implementación, qué
interfaces o contratos quedan fijados y qué regla permanente deriva de ella. Si la decisión
genera una regla anti-regresión para agentes, agregala a `AGENTS.md` y mencioná el gotcha acá.

## Consecuencias

### Positivas

- `<ganancia concreta y verificable>`

### Negativas

- `<costo asumido, con su workaround si existe>`

### Neutras o a vigilar

- `<efecto lateral que no es ni ganancia ni pérdida pero conviene no perder de vista>`

## Referencias

- `<enlace a código, tarea del backlog o documento relacionado>`