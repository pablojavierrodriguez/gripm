---
id: DEV-164
title: "Code-Splitting del Bundle de Producción con React.lazy y manualChunks en Rollup"
status: draft
created_date: '2026-10-04'
updated_date: '2026-10-04 19:55'
labels:
  - "performance"
  - "bundling"
  - "vite"
  - "post-launch"
dependencies:
  - "DEV-162"
priority: medium
type: refactor
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El bundle de producción actual de la aplicación se compila en un único chunk monolítico de 647.44 kB (`dist/assets/index-CBy5mJyL.js`), provocando la advertencia de Vite / Rollup:
`(!) Some chunks are larger than 500 kB after minification.`

### Diagnóstico de Causa Raíz

1. **Cero `React.lazy` / import dinámico en la UI:** Componentes de gran porte como `SettingsView` (1.993 líneas) y `ReleaseAssembler` (1.202 líneas) se importan sincrónicamente en el arranque de `src/App.tsx`, a pesar de que el usuario no los necesita durante la carga inicial del tablero.
2. **Ausencia de `manualChunks`:** No hay partición de dependencias de terceros (`vendor`) en `vite.config.ts`, por lo que `react`, `react-dom` y librerías auxiliares se fusionan en el mismo chunk de la aplicación, invalidando el cacheo eficiente de navegadores entre releases.

### Objetivo

Implementar carga perezosa (`React.lazy` con `Suspense`) para vistas no críticas, reduciendo el trabajo de transformación que el servidor de desarrollo realiza en el arranque en frío.

> [!CAUTION]
> **Corrección de premisa (2026-10-05):** la mitad de esta tarea optimiza un artefacto que el producto **no sirve**. Verificado:
>
> ```
> bin/gripm.js:219   createServer({ root: PKG_ROOT, configFile: 'vite.config.ts' })
> index.html:56      <script type="module" src="/src/main.tsx">   ← NO /assets/
> ```
>
> El CLI arranca un **dev server de Vite contra `src/`**, no un servidor de estáticos sobre `dist/`. En consecuencia:
>
> - `dist/` viaja en el tarball pero **nadie lo carga** (752 KB de peso muerto en el paquete).
> - `manualChunks` modifica el output de `npm run build`, que **no es lo que el usuario recibe**. Configurarlo no cambia la experiencia de nadie.
> - La advertencia de Vite sobre chunks >500 kB aparece en el output de `build`, no en el arranque real del producto.
>
> **Lo que sí es válido:** `React.lazy` reduce los módulos que el dev server debe transformar bajo demanda en el arranque en frío. Ese es un efecto real y medible.
>
> **Lo que queda por decidir fuera de esta tarea:** si el producto debe servir estáticos (`vite preview`) en vez de dev server. Es una decisión de arquitectura con trade-offs reales (HMR y source maps gratis contra cold start más lento y tarball más chico) y **no** corresponde tomarla dentro de un refactor de code-splitting.

### Objetivo (corregido)

Reducir el trabajo de transformación en el arranque en frío de la interfaz mediante carga diferida de vistas no críticas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Implementar carga diferida (`React.lazy` y `<Suspense fallback={...}>`) en `src/App.tsx` para `SettingsView` y `ReleaseAssembler`
- [ ] #2 Verificar que el arranque en frío transforma menos módulos que antes: el conteo de módulos bajo demanda servidos en la carga inicial disminuye respecto de la línea de base medida al inicio de la tarea
- [ ] #3 Medir y registrar la línea de base y el resultado del AC #2 en las notas de la tarea, con los comandos usados — sin ese registro el AC no es verificable
- [ ] #4 ~~Configurar `manualChunks`~~ **retirado**: no afecta el artefacto que el producto sirve (ver la corrección de premisa)
- [ ] #5 ~~El chunk principal se reduce por debajo de 450 kB~~ **retirado**: mide `dist/`, que no se sirve
- [ ] #6 La suite de pruebas `npm test` y el check de publicación `npm run publish:check` pasan con exit code 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Medir la línea de base: cuántos módulos sirve el dev server en la carga inicial del tablero, y cuánto tarda el primer render interactivo en frío.
2. En `src/App.tsx`, reemplazar imports estáticos de `SettingsView` y `ReleaseAssembler` por `React.lazy(() => import(...))`.
3. Envolver el renderizado condicional de ambas vistas en `<Suspense fallback={<LoadingSpinner />}>`.
4. Repetir la medición del paso 1 y comparar.
5. Ejecutar la pirámide de verificación completa.
6. **No** tocar `manualChunks` sin antes resolver la decisión de arquitectura del punto anterior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Invariante: Asegurar que los fallbacks de Suspense mantengan estabilidad de layout (Zero-CLS) y no provoquen saltos visuales al abrir Ajustes o Releases.

### Antecedente de la corrección

Esta tarea nació de medir un bundle de 647 kB y asumir que ese bundle era lo que el usuario descarga. La auditoría de distribución demostró que no: el producto sirve `src/` con un dev server. **El número era correcto; la inferencia de que era un problema observable no lo era.** La misma clase de error se repitió sobre `lucide-react` en la misma auditoría.

La lección que queda registrada: antes de tratar una métrica de artefacto como problema, hay que verificar **quién consume ese artefacto**. Para este producto, la respuesta es "nadie, en el caso de `dist/`".
<!-- SECTION:NOTES:END -->
