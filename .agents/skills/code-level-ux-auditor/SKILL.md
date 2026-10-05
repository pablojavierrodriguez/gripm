---
name: code-level-ux-auditor
description: Audita estáticamente el código fuente (React, TypeScript, CSS) en busca de anti-patrones de UX móvil, colisiones de gestos y scroll, vulnerabilidades de teclado virtual, micro-janks de renderizado e inconsistencias de localización sin requerir ejecución en vivo.
---

# Code-Level UX & Mobile Anti-Patterns Auditor 

## Misión y Filosofía
La calidad de experiencia de usuario (UX) no es una capa superficial de pintura: **se programa en el código**. La inmensa mayoría de bugs que frustran a los usuarios (drag trabado, saltos de scroll, inputs que rechazan comas, oclusión por barras de navegación o fallos de login) poseen **firmas estáticas inequívocas en el código fuente**.

Esta skill proporciona las reglas de inspección, heurísticas y herramientas de análisis estático para detectar, mitigar y prevenir estos defectos leyendo directamente los archivos `.tsx` y `.ts`.

---

## 🎯 Las 8 Firmas Estáticas de Anti-Patrones de UX

### 1. [UX-001] Bloqueo de Coma Decimal Regional (`input[type="number"]`)
- **Firma en código:** `<input type="number">` o `<Input type="number">` para captura de montos o saldos.
- **Impacto en Runtime:** En teclados móviles de Argentina y países hispanohablantes (`regional-locale`), el teclado numérico nativo muchas veces solo muestra la coma `,` y desactiva el punto `.`, pero el estándar HTML5 de `type="number"` rechaza la coma en WebKit/Blink, arrojando valor vacío o error silencioso.
- **Regla de corrección:** Reemplazar por `inputMode="decimal"` con utilidades bidireccionales `formatThousandsInput` y `parseThousandsInput`.

### 2. [UX-002] Contaminación de Atajos Físicos en Pantallas Táctiles
- **Firma en código:** Renderizar chips `<kbd>`, símbolos `⌘`, `Ctrl+` o textos de atajos sin clases condicionales `hidden sm:inline-flex`.
- **Impacto en Runtime:** En smartphones no existe teclado físico ni tecla Command; mostrar estos elementos contamina el espacio visual de la barra de acciones o cabeceras móviles.
- **Regla de corrección:** Envolver todo atajo en `hidden sm:inline-flex` o validar mediante `useIsMobile()`.

### 3. [UX-003] Colisión Mortal: Gesto/Drag dentro de Scroll Container
- **Firma en código:** `<Reorder.Group>` o elementos con `drag="y"` montados dentro de contenedores con `overflow-y-auto` sin compensar `scrollTop` ni emplear `setPointerCapture`.
- **Impacto en Runtime:** El navegador móvil interpreta el movimiento vertical sobre el elemento como intención de scroll nativo y dispara `pointercancel`, trabando el arrastre a mitad de camino. Además, el scroll previo descalibra los cálculos de coordenadas de Framer Motion, haciendo que los ítems salten cientos de píxeles bruscamente.
- **Regla de corrección:** Utilizar motor nativo de Pointer Events con `setPointerCapture`, aceleración GPU pura (`translate3d`), detección dinámica del scroll parent y auto-scroll en bordes. Mantener botones accesibles de Subir/Bajar.

### 4. [UX-004] Fuga de Localización Temporal (Nombres de Meses en Inglés)
- **Firma en código:** `format(date, "MMM yyyy")` o `format(date, "EEEE")` de `date-fns` sin el argumento `{ locale: es }`.
- **Impacto en Runtime:** Genera interfaces mixtas ("January 2026", "Monday") en una app 100% en español.
- **Regla de corrección:** Importar siempre `es` de `date-fns/locale` y pasar `{ locale: es }` (o usar el helper `activeLocale`).

### 5. [UX-005] Trampa de Autocorrección y Mayúsculas en Login
- **Firma en código:** `<input type="email">` o handlers de `signIn` sin `.trim().toLowerCase()` ni flags de mobile.
- **Impacto en Runtime:** Teclados virtuales de Android e iOS fuerzan la primera letra en mayúscula (`Usuario@mail.com`) o agregan un espacio al final tras autocompletar, provocando el recurrente error de "Credenciales inválidas".
- **Regla de corrección:**
  ```tsx
  <Input
    type="email"
    inputMode="email"
    autoCapitalize="none"
    autoCorrect="off"
    spellCheck={false}
    onChange={e => setEmail(e.target.value.trim().toLowerCase())}
  />
  ```

### 6. [UX-006] Oclusión por Elementos Fijos Inferiores
- **Firma en código:** Vistas principales con scroll que usan `pb-16` o `pb-20` en lugar de `pb-32` cuando coexisten con `BottomNav` fijo en `bottom-0`.
- **Impacto en Runtime:** Los últimos ítems de las listas quedan tapados físicamente por la barra de navegación o el FAB.
- **Regla de corrección:** Asignar `pb-32` y `safe-area-inset-bottom` en contenedores de scroll principales.

### 7. [UX-007] Hacinamiento Horizontal en Tarjetas Móviles (< 640px)
- **Firma en código:** `flex items-center justify-between` empaquetando 3 o 4 elementos complejos (icono + categoría + cuenta bancaria + badge + monto) en una sola fila sin `truncate` ni wrap.
- **Impacto en Runtime:** Títulos de gastos o nombres de tarjetas se superponen o empujan el monto fuera del viewport en pantallas de 375px.
- **Regla de corrección:** Cumplir el *Invariante de Dos Niveles*: Fila 1 para Identidad y Monto; Fila 2 para Contexto/Chips; acciones agrupadas en menú secundario.

### 8. [UX-008] Micro-Jank por I/O Síncrono o Cálculos sin Memo
- **Firma en código:** `localStorage.setItem` sincrónico o `fetch` ejecutado en cada píxel dentro de callbacks de arrastre/scroll, o `.reduce()`/`.filter()` pesados en el cuerpo de un componente sin `useMemo`.
- **Impacto en Runtime:** Caída abrupta de 60 a < 15 FPS, lag perceptible en interacción táctil.
- **Regla de corrección:** Aislar estado local en memoria durante el gesto; persistir con debounce al soltar o cerrar.

---

## 🛠️ Herramientas de Auditoría Automatizada

Para ejecutar la verificación estática automatizada en el proyecto:

```bash
node scripts/audit-ux-code.cjs
```

Este script inspecciona todo `src/` y genera un diagnóstico instantáneo clasificando los hallazgos en:
- ❌ **ERROR:** Defectos críticos que rompen funcionalidad básica en mobile.
- ⚠️ **WARNING:** Anti-patrones que degradan la experiencia o el rendimiento.
- ℹ️ **INFO:** Sugerencias de higiene visual y micro-ergonomía.

---

## 📋 Checklist de Aceptación Pre-Merge / Pre-Commit

Antes de dar por concluido un componente o refactor, verificar:
1. [ ] ¿Los inputs de texto/email tienen `autoCapitalize` y sanitización?
2. [ ] ¿Los inputs numéricos usan `inputMode="decimal"` y comas para decimales?
3. [ ] ¿El contenedor desplazable tiene despeje suficiente contra el `BottomNav` (`pb-32`)?
4. [ ] ¿Los elementos interactivos tienen un touch target de al menos 44×44px?
5. [ ] ¿Si hay arrastre (drag), se ejecuta con `setPointerCapture` y aceleración GPU?
6. [ ] ¿Las fechas usan `{ locale: es }` de `date-fns`?
7. [ ] ¿El script `node scripts/audit-ux-code.cjs` corre sin errores?
