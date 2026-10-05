---
id: DEV-165
title: "Modularización de vite.config.ts y Extracción de Capa de Servidor a server/"
status: draft
created_date: '2026-10-04'
updated_date: '2026-10-04 19:55'
labels:
  - "architecture"
  - "refactor"
  - "server"
  - "technical-debt"
  - "post-launch"
dependencies:
  - "DEV-161"
priority: medium
type: refactor
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`vite.config.ts` se ha convertido en un monolito de 2.530 líneas y 110 KB. Además de la configuración del bundler y plugins de Vite, contiene la API HTTP completa del producto, middleware de seguridad, lógica de Server-Sent Events (SSE), registro de proyectos multi-repo, watchers de disco y un parser embebido de Markdown.

### Problema

1. **Fricción para contribuidores de código abierto:** Un archivo de configuración de más de 2.500 líneas intimida a nuevos contribuidores y dificulta el code review y la trazabilidad de cambios en PRs.
2. **Distribución en el tarball:** El archivo viaja directamente en el tarball publicado en npm (`package.json: files`), mezclando la configuración del compilador con el backend embebido.
3. **Violación de Responsabilidad Única (SRP):** Configuración de empaquetado, lógica de base de datos Markdown y endpoints REST residen en el mismo archivo.

### Objetivo

Extraer la capa de backend a módulos dedicados bajo un directorio `server/` (o `src/server/`):
- `server/middleware/security.ts`: Validaciones de CSRF (Origin), Host (DNS Rebinding) y Content-Type.
- `server/routes/api.ts`: Endpoints REST (`/api/data`, `/api/tasks`, `/api/sprints`, `/api/releases`, etc.).
- `server/routes/sse.ts`: Gestión de clientes de Server-Sent Events y notificaciones de live reload.
- `server/services/registry.ts`: Detección y persistencia de proyectos multi-repo.
- Reducir `vite.config.ts` a un archivo esbelto de configuración de plugins y montaje de middleware.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Extraer middleware de seguridad (CSRF, DNS Rebinding, Content-Type) a `server/middleware/security.ts`
- [ ] #2 Modularizar rutas de API REST en submódulos temáticos (`server/routes/`)
- [ ] #3 Desacoplar la gestión de Server-Sent Events (SSE) a `server/sse/`
- [ ] #4 Reducir `vite.config.ts` a menos de 300 líneas de código
- [ ] #5 La suite completa de tests de seguridad (`scripts/test-api-security.js`) y de SSE (`scripts/verify-sse.js`) pasan con exit code 0
- [ ] #6 `npm test`, `npm run backlog:check` y `npm run publish:check` pasan sin regresiones
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Diseñar la estructura de carpetas en `server/`.
2. Extraer funciones utilitarias y middlewares de seguridad, conservando las mismas firmas y comportamientos.
3. Desacoplar los manejadores de endpoints HTTP a controladores independientes.
4. Conectar los módulos desacoplados en el plugin de Vite dentro de `vite.config.ts`.
5. Ejecutar la suite de pruebas unificada para asegurar no-regresión en endpoints y persistencia.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Invariante: Preservar intacta la compatibilidad de lectura legacy de `.devboard/` y `.devboard/config.json` durante el refactor de las rutas del servidor.
<!-- SECTION:NOTES:END -->
