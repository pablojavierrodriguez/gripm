---
id: DEV-180
title: "Evaluación y Migración Arquitectónica de Dependencias Core a React 19 y Tooling Moderno"
status: draft
created_date: '2026-10-05'
updated_date: '2026-10-05'
labels:
  - "tech-debt"
  - "dependencies"
  - "architecture"
  - "tooling"
dependencies:
  - DEV-121
  - DEV-174
  - DEV-175
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Planificar y ejecutar la migración arquitectónica integral de las dependencias principales del stack hacia sus versiones mayores modernas (React 19, TypeScript moderno y plugins actualizados de Vite).

**Contexto del parche temporal:**
Durante el monitoreo automatizado de dependencias (DEV-175), Dependabot intentó actualizar automáticamente `react`/`react-dom` a v19.x y `typescript`/`@types/node` a versiones mayores. Esto provocó fallos en el pipeline de CI debido a incompatibilidades de tipos en `vite.config.ts` (TS2769: sobrecargas incompatibles de `@vitejs/plugin-react`) y diferencias en las definiciones de tipos de React 19. Para preservar la estabilidad de la rama `main` en producción, se aplicó una regla de contención en `.github/dependabot.yml` ignorando actualizaciones `semver-major`.

**Alcance de la resolución de fondo:**
1. **Auditoría de compatibilidad de React 19:**
   - Evaluar soporte y compatibilidad de `@vitejs/plugin-react`, `lucide-react` y Tailwind CSS con React 19.
   - Revisar tipado estricto en componentes (adaptar definiciones de `FC`, `ReactNode`, eventos sintéticos y ref handling nativo de React 19).
2. **Actualización de Vite y Tooling:**
   - Evaluar actualización coordinada de Vite (`vite` v6+) y sus plugins asociados.
   - Alinear `@types/react`, `@types/react-dom` y `@types/node` a las versiones meta.
3. **Validación de Rendimiento y Cero Regresiones:**
   - Comprobar compatibilidad con el sistema de portales (`createPortal` en `ConfirmModal` y menús contextuales).
   - Verificar estabilidad de renderizado en Kanban y vistas de tabla (Zero-CLS y 60 FPS).
4. **Desbloqueo de Dependabot:**
   - Retirar las reglas de `ignore` en `.github/dependabot.yml` una vez consolidado el nuevo baseline arquitectónico.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Auditar matriz de breaking changes de React 19 y compatibilidad con el catálogo de dependencias del proyecto
- [ ] #2 Actualizar react, react-dom, @types/react y @types/react-dom en package.json resolviendo contratos de tipos
- [ ] #3 Actualizar vite.config.ts y @vitejs/plugin-react garantizando compilación estricta (npx tsc --noEmit con 0 errores)
- [ ] #4 Verificar suite de pruebas completa (npm test), build de producción y empaquetado standalone (binarios bin/)
- [ ] #5 Remover los ignores de semver-major en .github/dependabot.yml para React y sus tipos
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear rama de spike/investigación para probar la actualización aislada de dependencias.
2. Resolver incompatibilidades de tipos en `vite.config.ts` y en el árbol de componentes.
3. Ejecutar suite de integración, smoke tests de npm pack y pruebas de empaquetado.
4. Ajustar `.github/dependabot.yml` y documentar cambios de compatibilidad en changelog.
<!-- SECTION:PLAN:END -->
