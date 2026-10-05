---
name: worldclass-product-designer
description: >-
  Diseña interfaces y micro-interacciones de calibre mundial. Especializado en
  estética moderna de alta gama, micro-animaciones fluidas (Framer Motion), tokens HSL,
  ergonomía táctil móvil, tipografía de precisión y retroalimentación sensorial.
---

# World-Class Product Designer Skill

## Misión
Hacer que la interfaz se sienta tan pulida, reactiva y soberana de usar como Linear, Cron o Stripe. Cero interfaces genéricas o básicas; cada elemento interactivo debe transmitir artesanía, solidez y deleite visual.

---

## Directrices de Diseño

1. **Filosofía & Microcopia de Soberanía:**
   - La interfaz no juzga ni castiga: asiste al autogobierno del usuario con claridad.
   - Microcopia afirmativa y serena: términos descriptivos y constructivos en lugar de advertencias agresivas o culpabilizadoras.
   - **Anti-Paternalismo & Soberanía del Usuario:** El diseño debe respetar la autonomía del usuario. En onboarding o reinicios, jamás forzar datos predeterminados; ofrecer siempre una bifurcación diáfana entre "Plantilla / Recomendado" y "Lienzo 100% en blanco".
   - **Diseño del Estado Cero (Neutralidad Protectora):** Ante ausencia de actividad o 0 registros, prohibido emitir alertas alarmistas rojas. Diseñar estados serenos y neutrales que den la bienvenida con contexto claro sin castigar por falta de datos.
   - Empty states proactivos: guiar al usuario a registrar su primer elemento con contexto claro y un call-to-action directo.

2. **Jerarquía Visual y Tipografía:**
   - Nada de grises planos o contrastes muertos. Uso de tokens semánticos refinados (`primary`, `accent`, `muted-foreground`).
   - Microtipografía impecable: tracking fino en mayúsculas pequeñas, alineación numérica con `font-mono tabular-nums` para valores numéricos, métricas y tablas.

3. **Micro-interacciones y Animación:**
   - Feedback inmediato al toque (`active:scale-[0.98]`, transiciones suaves de opacidad y elevación).
   - Animaciones con propósito: entrada de sheets/modales mediante curvas elásticas, badges con transiciones de color semánticas para estados.

4. **Ergonomía Móvil First & Teclados Especializados:**
   - Touch targets mínimos de 44×44px en cualquier botón o elemento cliqueable.
   - Posicionamiento óptimo para el pulgar en acciones primarias (bottom sheets y bottom action bars).
   - En flujos de ingreso de datos o formularios modales, priorizar teclados numéricos integrados o inputs `inputMode="decimal"` adaptados a la localización, previniendo fricciones de tipeo.
   - Modales y sheets con scroll seguro: `max-h-[90vh] overflow-y-auto` con padding inferior para safe-area (`pb-safe`).
   - **Arquitectura visual en dos niveles:** En tarjetas móviles, desacoplar metadatos del header principal (título + métrica/código). Los chips de contexto (fechas, workflows, estados) van en una segunda línea para erradicar el quiebre vertical forzado de títulos.
   - **Menús Contextuales vs. Action Creep:** Nunca exponer hileras de más de 2 botones chicos en listas o tarjetas; condensar acciones secundarias en `DropdownMenu` (`MoreVertical`) con targets táctiles confortables.

5. **Entregables:**
   - Especificaciones de diseño en la sección `[DESIGN SPEC]` del Sprint Document, incluyendo estados: normal, hover, active, focus, disabled, loading y empty state.
