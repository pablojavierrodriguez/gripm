---
name: worldclass-product-designer
description: Diseña interfaces y micro-interacciones de calibre mundial. Jerarquía visual, tokens semánticos, tipografía de precisión, feedback táctil, motion con propósito y estados completos. Usar al diseñar o revisar un componente, flujo, pantalla o sistema de diseño.
---

# World-Class Product Designer Skill

## Misión

Que el producto se sienta tan pulido, reactivo y sobrio de usar como los mejores herramientas de su categoría. Cero interfaces genéricas: cada elemento interactivo debe comunicar artesanía, solidez y cuidado.

> Esta skill define **criterio de diseño**. El design system concreto (tokens, librería de componentes, framework de motion) es el del proyecto: consultalo antes de proponer valores concretos.

---

## 1. Filosofía y microcopy

La interfaz **asiste, no juzga**.

- Microcopy afirmativo y específico. Nombrar la acción, no la ausencia: "Sin movimientos en este período", no "Sin datos".
- **Anti-paternalismo:** el diseño respeta la autonomía del usuario. En onboarding o hard resets nunca se imponen defaults; se ofrece siempre una bifurcación explícita entre la opción recomendada y el lienzo en blanco.
- **Estado cero:** ante ausencia de actividad o 0 registros, nunca emitir alerta ni color de error. Un estado vacío es un estado **válido**: comunícalo con serenidad y ofrecé el siguiente paso.
- Empty states proactivos: guían al primer uso con contexto y una acción concreta, no con un "no hay nada".

---

## 2. Jerarquía visual y tipografía

- Nada de grises planos ni contrastes muertos. Tokens semánticos (`primary`, `accent`, `muted-foreground`) para que el tema cambie sin tocar componentes.
- Escala tipográfica cerrada. Un tamaño arbitrario es deuda: promovelo a token o usá la escala.
- **Cifras tabulares** (`tabular-nums` o token monoespaciado de datos) en **toda** columna numérica, y en todo valor que cambie en vivo. Sin esto, los dígitos bailan.
- Separadores de miles y decimales coherentes en todos los surfaces, incluido export y gráficos.
- Tracking fino en mayúsculas pequeñas para etiquetas; nunca mayúsculas en párrafos.

---

## 3. Micro-interacciones y motion

- **Feedback inmediato al toque:** toda acción táctil responde en el mismo frame (`active:scale-[0.98]`, cambio de fondo).
- **Motion con propósito:** entrada de sheets y modales con curvas que comuniquen origen. Nada de animación decorativa que delays la respuesta.
- Transiciones cortas (150–250ms) para estado; más largas solo para entrada/salida de superficies.
- Respetar `prefers-reduced-motion`: es una accesibilidad, no un extra.

---

## 4. Ergonomía táctil

- **Target táctil efectivo ≥ 44×44px** en cualquier elemento clickeable. Verificado con `getBoundingClientRect()`, no con la clase CSS.
- Acciones primarias al alcance del pulgar en móvil: bottom sheets y bottom action bars.
- **Nunca más de 2 acciones visibles por fila** en listas y tarjetas. Las secundarias van a un menú con target cómodo.
- Inputs numéricos: teclado declarado según el tipo de dato (`inputMode="decimal"`, `inputMode="tel"`), con parseo por locale. Nunca `type="number"` para montos.
- Sheets y modales con scroll seguro: alto máximo acotado, `overflow-y-auto`, y padding inferior que respete la safe area.

---

## 5. Layout móvil

- **Arquitectura de dos niveles en tarjetas:** desacoplar metadatos del header principal. Fila 1 = identidad y valor. Fila 2 = contexto y chips. Evita el quiebre vertical forzado de títulos largos.
- Todo contenedor scrolleable con **despeje suficiente contra la UI fija inferior** (`pb-32` + `env(safe-area-inset-bottom)`), no `pb-16`.
- Sin desbordes horizontales en 375px/390px. Probado, no asumido.
- Densidad responsive: en móvil menos columnas, más scroll vertical. Nunca una tabla de 6 columnas en 375px.

---

## 6. Estados

Todo componente interactivo define **todos** estos estados, explícitamente:

| Estado | Contenido |
| :--- | :--- |
| Default | — |
| Hover | Solo en dispositivos con puntero |
| Active / Focus | Focus ring **siempre visible** para navegación por teclado |
| Disabled | Con motivo comunicado, no solo atenuado |
| Loading | Skeleton o spinner según la latencia esperada |
| Empty | Estado cero sereno + acción siguiente |
| Error | Qué pasó + qué hacer + si es recuperable |

---

## Entregables

Especificación en la sección `[DESIGN SPEC]` de la sprint spec:

- Tokens y jerarquía visual definidos.
- Targets táctiles declarados.
- Micro-interacciones y feedback sensorial especificados.
- Los 7 estados de la sección 6 resueltos, con nombre de token donde aplique.
- Tokens como **variables semánticas**, nunca hex hardcodeado en el componente.