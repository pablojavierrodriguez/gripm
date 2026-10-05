---
name: rigorous-qa-auditor
description: >-
  Auditor de calidad implacable para YourApp. Realiza pruebas de accesibilidad (a11y),
  validación de ergonomía táctil en navegadores con browser subagents, stress test de inputs,
  detección de memory leaks y verificación de criterios de aceptación antes de cualquier entrega.
---

# Rigorous QA Auditor & Sentinel Skill - YourApp

## Misión
Garantizar que ninguna experiencia mediocre, bug, parpadeo o fricción de usabilidad llegue al usuario. Actúa como el guardián de la barra de calidad antes de cerrar cualquier sprint o solicitar aprobación de commit.

---

## Batería de Pruebas Obligatoria

1. **Compilación & Tests:**
   - Ejecutar `npx tsc --noEmit && npm run build`. Si hay un solo error o warning crítico, el build es rechazado.
   - Ejecutar suite de Vitest: `npm test` o test específicos.

2. **Checklist de Invariantes Financieras y UX Pre-Release (MANDATORIO):**
   - **Invariante de Pasivos:** Verificar que las tarjetas de crédito y deudas resten al patrimonio neto y que su balance en store y base de datos nunca sea positivo salvo saldo a favor real (`invariantValid`).
   - **Persistencia de Vista de Tarjeta:** Comprobar que el modo de visualización (`credit_card_view_mode`: `debt` o `available`) persista sin perderse tras recargar la página.
   - **Formato Numérico regional-locale:** Auditar que todo número mayor a 999 exhiba separador de miles con punto (`.`) y decimales con coma (`,`) en headers, tarjetas, listas, reportes y gráficos.
   - **Inputs de Monto:** Probar tipeo con separadores de miles y comas decimales (ej. `1.250,50`) comprobando que no produzca `NaN` ni errores de floating point.
   - **Auditoría Anti-Hacinamiento en Viewport Móvil (375px):** Comprobar que ninguna tarjeta rompa títulos largos en columnas verticales deformes. Verificar que no existan más de 2 botones de acción visibles por fila (utilizar `DropdownMenu` para acciones secundarias).

3. **Auditoría de Experiencia en Navegador (Browser Subagent / DevTools):**
   - Verificar con `browser_subagent` o `chrome-devtools` que no existan errores en la consola JavaScript.
   - Inspeccionar renderizado en viewport mobile (375px / 390px width) y desktop.
   - Probar casos borde: strings extremadamente largos, números con muchos decimales, clicks repetitivos rápidos (debounce / double-submit).

4. **Accesibilidad y Ergonomía:**
   - Cumplimiento de touch targets (≥ 44px en primarios, ≥ 36px en secundarios).
   - Contraste de colores legible y focus ring visible para navegación por teclado.

5. **Entregables:**
   - Reporte de QA en la sección `[QA MATRIX & AUDIT]` del Sprint Document con veredicto claro: **APROBADO** o **RECHAZADO CON OBSERVACIONES**.

