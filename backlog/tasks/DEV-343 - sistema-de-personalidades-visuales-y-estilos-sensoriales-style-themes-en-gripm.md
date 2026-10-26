---
id: DEV-343
title: "Sistema de Personalidades Visuales y Estilos Sensoriales (Style Themes) en Gripm"
status: ideas
created_date: '2026-10-26'
updated_date: '2026-10-26'
labels:
  - "ui"
  - "ux"
  - "themes"
  - "design-system"
  - "discovery"
dependencies: []
priority: medium
type: feature
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Exploración, especificación y diseño de un sistema de personalidades visuales y estilos sensoriales (**Style Themes**) para Gripm Board, complementando ortogonalmente al modo lumínico existente (`dark` / `light` / `system`).

### 1. Visión y Fundamentos
El objetivo es permitir a los desarrolladores y product managers personalizar la atmósfera de su cockpit de ingeniería sin alterar la densidad de información ni la usabilidad:
- **Doble eje ortogonal:** Separar el *Modo Lumínico* (Dark, Light, System) del *Estilo Sensorial* (paleta cromática, geometría de bordes, elevación y relieve de tarjetas).
- **Alineación con la identidad de Gripm:** Cockpit ágil para pair programming con agentes de IA, sobrio, técnico, enfocado y con artesanía de diseño superior. Prohibido adoptar nomenclaturas o marcas de aplicaciones externas.

### 2. Personalidades Visuales Propuestas (Nativas de Gripm)
1. **Indigo Cockpit** (Canónico / Por defecto):
   - *Rasgo:* Balanceado y técnico.
   - *Atmósfera:* Fondo deep navy slate (`#080c14`), superficies glass sutiles, acento Índigo Eléctrico (`#6366f1`) y radios suaves estándar (`12px`).
2. **OLED Focus**:
   - *Rasgo:* Minimalista de alto contraste.
   - *Atmósfera:* Negro absoluto OLED (`#030305`), grafito técnico mate (`#0e0e12`), hairlines ultrafinos y acento Esmeralda Técnico (`#10b981`). Radios compactos (`8px`) para maximizar concentración y reducir fatiga ocular en sesiones nocturnas.
3. **Cobalt Precision**:
   - *Rasgo:* Estructurado y arquitectónico.
   - *Atmósfera:* Azul marino abismal (`#070e1e`), tarjetas navy estructurado (`#101c38`), acento Azul Cobalto Puro (`#3b82f6`) y esquinas rectas (`6px`).
4. **Phosphor Console** (Exploratorio):
   - *Rasgo:* Consola hacker / Retro-Dev.
   - *Atmósfera:* Carbón profundo con acento Ámbar / Oro neón (`#f59e0b`), tipografía mono acentuada y estética de terminal para desarrolladores.

### 3. Consideraciones Técnicas y Guardrails
- **Persistencia y Gobernanza:** Configuración persistida en `.gripm/config.json` bajo `styleTheme` y en `localStorage` con la clave canónica `gripm_style_theme`. Normalizador defensivo `normalizeStyleTheme` con fallback a `indigo`.
- **Transiciones cinematográficas:** Integración con la `View Transitions API` nativa existente en Gripm (`theme-animating` / crossfade fluido de 280ms).
- **Cumplimiento estricto de guardrails:**
  - `UX-011`: Cero dispersión tipográfica; uso exclusivo de la escala canónica (`text-xs`, `text-sm`).
  - `Anti-Em-Dash`: Uso exclusivo del guión simple ` - `.
  - Tap targets mínimos de 44px en móviles y contraste WCAG AA.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Refinamiento y aprobación de los 3 estilos sensoriales nativos (Indigo Cockpit, OLED Focus, Cobalt Precision) y sus tokens de diseño en Dark y Light
- [ ] #2 Definición del contrato de configuración en GripmConfig (campo opcional styleTheme) y clave canónica gripm_style_theme en storage.ts
- [ ] #3 Especificación del catálogo de variables CSS semánticas en index.css bajo el selector [data-style-theme="..."]
- [ ] #4 Diseño de la UI de selección de estilos en SettingsView / VisualTab con swatches geométricos, badges de rasgos y vista previa
- [ ] #5 Integración con View Transitions API garantizando transiciones suaves sin jank visual
- [ ] #6 Validación de la Pirámide de Verificación (npx tsc --noEmit, npm test, audit:ux y verify-changes.js)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Fase de Refinamiento (Discovery):**
   - Validar paletas exactas en modo Dark y modo Light para cada personalidad.
   - Definir si se incluye Phosphor Console en la primera iteración o se reserva para una etapa posterior.
2. **Fase de Arquitectura (Tokens y Tipos):**
   - Incorporar `StyleTheme` en `src/types.ts` con helper `normalizeStyleTheme`.
   - Registrar `STORAGE_KEYS.STYLE_THEME` en `src/utils/storage.ts`.
   - Configurar variables CSS en `src/index.css`.
3. **Fase de Integración React:**
   - Añadir listener y mutador en `src/App.tsx` con soporte para View Transitions.
   - Implementar selector de tarjetas en `src/components/settings/VisualTab.tsx`.
4. **Fase de Certificación:**
   - Correr Pirámide de Verificación completa y certificar en sub-agente limpio de QA.
<!-- SECTION:PLAN:END -->
