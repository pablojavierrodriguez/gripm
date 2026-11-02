---
id: DEV-358
title: "Configurar Vercel Web Analytics en la demo web estatica"
status: done
created_date: '2026-11-01'
updated_date: '2026-11-02'
labels:
  - "analytics"
  - "vercel"
  - "demo"
  - "privacy"
dependencies: []
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configurar Vercel Web Analytics (`@vercel/analytics`) para la demo web pública desplegada en Vercel (`https://gripm.vercel.app`), permitiendo medir métricas de uso (visitantes únicos, páginas vistas, referrers, países y dispositivos).

### Guardrail de Privacidad OSS / Local-First:
- El tracking de telemetría debe activarse **única y exclusivamente** cuando la aplicación corre en la demo web pública alojada en Vercel (`isSandboxMode()` y hostname `vercel.app` o producción web).
- En ejecuciones locales (CLI `gripm`, `board`, `npm run dev`, entorno local con daemon), el componente de Analytics no debe inicializarse bajo ninguna circunstancia, garantizando cero telemetría y privacidad absoluta para desarrolladores locales.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El paquete @vercel/analytics esta incorporado en las dependencias del proyecto.
- [x] #2 El componente Analytics se monta en la aplicacion condicionando su activacion exclusivamente a la demo web (isSandboxMode() y entorno web).
- [x] #3 En ejecuciones locales con daemon o entornos de desarrollo local, Analytics no emite eventos ni rastrea actividad.
- [x] #4 La suite de verificacion (npx tsc --noEmit, npm test, npm run backlog:check, npm run build) compila y pasa con codigo 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear la tarea DEV-358 en backlog/tasks/ y sincronizar con npm run backlog:sync.
2. Instalar la dependencia @vercel/analytics.
3. Integrar condicionalmente `<Analytics />` en `src/App.tsx` resguardando la privacidad local-first.
4. Validar la pirámide de verificación completa.
5. Transicionar a review y pasar por la certificación QA en subagente aislado antes de ready.
<!-- SECTION:PLAN:END -->
