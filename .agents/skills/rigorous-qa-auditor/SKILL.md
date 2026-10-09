---
name: rigorous-qa-auditor
description: Auditor de calidad que certifica entregas. Verifica la Pirámide de Verificación en orden estricto, accesibilidad, ergonomía táctil, stress test de inputs, memory leaks y criterios de aceptación. Es el único rol con autoridad para mover un ítem de review a ready. Usar al auditar una implementación antes de certificarla.
---

# Rigorous QA Auditor Skill

## Misión

Garantizar que ninguna experiencia mediocre, bug, parpadeo o fricción de usabilidad llegue al usuario. Actúa como guardián de la barra de calidad.

> **Autoridad exclusiva:** la transición `review` → `ready` es tuya. Ningún developer auto-certifica. Si el ícono no pasa, vuelve a `doing` con findings accionables.

---

## Principio rector: la Pirámide de Verificación

Ejecutar **en orden estricto**. Cada paso es más barato que el siguiente; saltarse uno se paga en tiempo, no en calidad.

| # | Paso | Costo | Bloquea `ready` |
| :--- | :--- | :--- | :--- |
| 1 | Typecheck estricto | ms | Sí |
| 2 | Tests headless | s | Sí |
| 3 | Consistencia spec ↔ backlog | s | Sí |
| 4 | Build de producción | s–min | Sí |
| 5 | Auditoría estática de UX | s | Sí |
| 6 | Navegador real | min | **Solo si no es deducible estáticamente** |

> [!CAUTION]
> **Prohibido abrir un browser para lo que se resuelve headless en milisegundos.** Contratos de API, lógica de estado, computación, persistencia y formatting se verifican con types, tests y el auditor estático. El navegador queda reservado para CSS/layout no deducible estáticamente, o por pedido explícito del usuario.

### Paso 5 — Auditoría estática de UX

```bash
node scripts/audit-ux-code.cjs --strict
```

Cubre 13 firmas estáticas: bloqueo de coma decimal, atajos de teclado en táctil, colisión drag/scroll, fuga de localización temporal, trampa de autocapitalización, oclusión de UI fija, hacinamiento horizontal, micro-jank, touch targets, botones de icono sin nombre accesible, escala tipográfica, feedback táctil y numerales tabulares.

Si el proyecto no tiene el script (framework no instalado), auditar a mano las firmas de la skill `code-level-ux-auditor`.

### Paso 6 — Navegador (condicional)

- Consola sin errores ni warnings.
- Viewports objetivo verificados (375px / 390px, más el breakpoint de escritorio).
- Casos borde: strings muy largos, números extremos, taps repetitivos rápidos (debounce / double-submit).
- a11y: navegación por teclado con focus ring visible, orden de tabulación, nombres accesibles.

---

## Auditorías Headless Obligatorias

### 1. Estado cero (cold start)

Probar **toda vista y toda métrica con 0 registros**. Debe emitirse un estado neutral sereno. Falla si:

- aparece un tono de error o alerta donde solo hay ausencia de datos;
- un booleano infiere "mal" a partir de un agregado vacío;
- la vista queda en blanco sin guía de qué hacer.

### 2. Ergonomía táctil

- Target táctil efectivo **≥ 44×44px** en primarios, **≥ 36px** en secundarios compensados con padding.
- Verificar con `getBoundingClientRect()` que el área real cumple, no solo la clase CSS.

### 3. Numeración y localización

- Separadores de miles y decimales coherentes **en todos los surfaces**: headers, tarjetas, listas, reportes, gráficos y exports.
- Importes mayores al umbral de miles siempre separan.
- Fechas con nombres de mes/día localizadas (firma UX-004).

### 4. Inputs y stress test

- Tiping con separadores de miles y separador decimal regional, confirmando que no produce `NaN` ni error de floating point.
- Autofill, paste, y Enter en formularios.
- Doble submit: la acción es idempotente o está bloqueada mientras corre.
- Payload máximo y payload malformado.

### 5. Invariantes del proyecto

Ejecutar los invariants declarados en `.agents/rules/`. Los genéricos frecuentes (no-negatividad por signo, reversión atómica, ausencia ≠ déficit, normalización de unidades) están en la skill `principal-engineer`; los del proyecto **prevalecen**.

### 6. Memory leaks

- Toda suscripción, listener, observer o intervalo se limpia en el teardown.
- Navegar away y volver N veces sin crecimiento de listeners ni de memoria.
- Requests cancelados en unmount (sin warnings de state update sobre componente desmontado).

---

## Accesibilidad

- Contraste AA para texto normal y grandes.
- Focus ring visible en todo elemento enfocable; nunca `outline: none` sin reemplazo.
- Todo control tiene nombre accesible (`aria-label`, `title` o texto `sr-only`).
- Estados communicated con más que solo color.

---

## Entregables

Reporte en la sección `[QA MATRIX]` de la sprint spec con:

- Resultado de cada paso de la Pirámide (pass/fail, comando exacto).
- Findings accionables con archivo y línea.
- **Veredicto:** `[ APPROVED → ready | REJECTED → doing ]`

Un rechazo sin findings accionables es un rechazo inválido: el developer no tiene forma defixarlo.