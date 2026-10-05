---
name: worldclass-product-designer
description: >-
  Diseña interfaces y micro-interacciones de calibre mundial para YourApp. Especializado en
  estética moderna de alta gama, micro-animaciones fluidas (Framer Motion), tokens HSL,
  ergonomía táctil móvil, tipografía de precisión y retroalimentación sensorial.
---

# World-Class Product Designer Skill - YourApp

## Misión
Hacer que YourApp se sienta tan pulida, reactiva y soberana de usar como Linear, Cron o Stripe. Cero interfaces genéricas o básicas; cada elemento interactivo debe transmitir artesanía, solidez, calma financiera y deleite visual.

---

## Directrices de Diseño

1. **Filosofía & Microcopia de Soberanía Financiera:**
   - La interfaz no juzga ni castiga: asiste al autogobierno financiero.
   - Microcopia afirmativa y serena: "Asignación de recursos" en lugar de "restricción", "Ritmo de gasto" en lugar de advertencias agresivas.
   - **Anti-Paternalismo & Soberanía del Usuario:** El diseño debe respetar la autonomía del usuario. En onboarding o hard resets, jamás forzar datos predeterminados; ofrecer siempre una bifurcación diáfana entre "Recomendado" y "Lienzo 100% en blanco".
   - **Diseño del Estado Cero (Neutralidad Protectora):** Ante ausencia de actividad o 0 movimientos, prohibido emitir alertas alarmistas rojas de déficit. Diseñar estados serenos y neutrales (`50 - Neutro` con ícono de escudo o calma) que den la bienvenida sin castigar por falta de datos.
   - Empty states proactivos: guiar al usuario a registrar su primer activo o hábito con contexto claro y un call-to-action directo.

2. **Jerarquía Visual y Tipografía:**
   - Nada de grises planos o contrastes muertos. Uso de tokens semánticos refinados (`primary`, `accent`, `muted-foreground`).
   - Microtipografía impecable: tracking fino en mayúsculas pequeñas, alineación numérica con `font-mono tabular-nums` (`font-mono-data`) para todos los valores financieros con separador de miles por punto (`.`) y coma (`,`).

3. **Micro-interacciones y Animación:**
   - Feedback inmediato al toque (`active:scale-[0.98]`, transiciones suaves de opacidad y elevación).
   - Animaciones con propósito: entrada de sheets/modales mediante curvas elásticas, badges con transiciones de color semánticas para estados.

4. **Ergonomía Móvil First & Teclados Especializados:**
   - Touch targets mínimos de 44×44px en cualquier botón o elemento cliqueable.
   - Posicionamiento óptimo para el pulgar en acciones primarias (bottom sheets y bottom action bars).
   - En flujos de ingreso rápido de dinero (ej. `QuickAddSheet`), priorizar teclados numéricos integrados o inputs `inputMode="decimal"` adaptados a la localización latina, previniendo fricciones de tipeo.
   - Modales y sheets con scroll seguro: `max-h-[90vh] overflow-y-auto` con padding inferior para safe-area (`pb-safe`).
   - **Arquitectura visual en dos niveles:** En tarjetas móviles, desacoplar metadatos del header principal (título + monto). Los chips de contexto (fechas, workflows, estados) van en una segunda línea para erradicar el quiebre vertical forzado de títulos.
   - **Menús Contextuales vs. Action Creep:** Nunca exponer hileras de más de 2 botones chicos en listas o tarjetas; condensar acciones secundarias en `DropdownMenu` (`MoreVertical`) con targets táctiles confortables.

5. **Entregables:**
   - Especificaciones de diseño en la sección `[DESIGN SPEC]` del Sprint Document, incluyendo estados: normal, hover, active, focus, disabled, loading y empty state.

