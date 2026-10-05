---
id: DEV-122
title: "Archivos Comunitarios Estándar: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY y CHANGELOG"
status: done
created_date: '2026-09-28'
updated_date: '2026-10-02 23:43'
labels: []
dependencies: []
priority: high
type: docs
sprints:
  - "Sprint 7"
sprint: "Sprint 7"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Crear los archivos comunitarios estándar que todo proyecto open-source de calidad profesional debe incluir. Seguir las convenciones de la industria adaptadas al flujo de trabajo único de DevBoard (dogfooding, MCP, pair programming con IA).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Crear `CONTRIBUTING.md` con: requisitos de entorno (Node ≥22.6), pasos de setup (clone→npm install→npm run dev), guía de branching, cómo correr tests, cómo usar DevBoard para trackear contribuciones, y sección AI contributors con MCP tools
- [x] #2 Crear `CODE_OF_CONDUCT.md` basado en Contributor Covenant v2.1 completo
- [x] #3 Crear `SECURITY.md` con política de disclosure responsable: scope de vulnerabilidades, cómo reportar, expectativas de respuesta y contact
- [x] #4 Crear `CHANGELOG.md` en formato Keep a Changelog (keepachangelog.com) con todas las versiones v0.2.0 a v0.6.1 generado a partir de releases.json
- [x] #5 Agregar links a CONTRIBUTING.md y CODE_OF_CONDUCT.md desde README.md y README.es.md en una nueva sección `## 🤝 Contributing`
- [x] #6 Verificar que todos los archivos tienen formato Markdown válido y links internos correctos
- [x] #7 El CHANGELOG se genera con `npm run changelog` (script declarado `scripts/generate-changelog.cjs`) y es idempotente: no puede desviarse de `releases.json` por edición manual
- [x] #8 El generador normaliza los `markdownContent` que traen la secuencia literal `\n` en lugar de saltos de línea reales, sin lo cual 3 de las 6 releases se renderizaban como un único párrafo
- [x] #9 El encabezado `## [x.y.z] — fecha` usa el formato que el servidor MCP ya sabe releer de `CHANGELOG.md` como fuente alternativa (`scripts/mcp-server.ts`, fallback de notas de release), de modo que el archivo nuevo no rompe ese fallback
- [x] #10 `SECURITY.md` usa el canal privado de reporte de vulnerabilidades del repositorio en lugar de un correo personal, y no incluye URLs personales (coherente con el AC #2 parcial de DEV-121, que espera la identidad canónica del repo)
- [x] #11 `npx tsc --noEmit` finishes con código 0
- [x] #12 `npm test` finishes con código 0
- [x] #13 `npm run backlog:check` finishes con código 0
- [x] #14 Se regulariza `releases.json`: la release `0.2.0` carecía de campo `status` y figuraba bajo `Unreleased` pese a ser la release fundacional. Se promovió a `released` por orden explícita del usuario, con la auditoría previa que exige `AGENTS.md` (100% de las tareas con esa versión asignada en estado `done`: 1/1, DEV-001)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Auditar `backlog/releases.json` como fuente de verdad y detectar que tres
   `markdownContent` traen la secuencia literal `\n` en vez de saltos reales.
2. Escribir `scripts/generate-changelog.cjs` con normalización de esos saltos y
   ordenamiento por semver descendente, y declararlo como `npm run changelog`.
3. Generar `CHANGELOG.md` y verificar que el encabezado sea el que el servidor MCP
   ya sabe parsear como fuente alternativa.
4. Redactar `CONTRIBUTING.md` con la pirámide de verificación, el ciclo de vida de
   tareas y la tabla de herramientas MCP.
5. Redactar `CODE_OF_CONDUCT.md` adaptado de Contributor Covenant v2.1.
6. Redactar `SECURITY.md` con canal privado, tabla de severidad y expectativas de
   respuesta, sin inventar un contacto personal.
7. Agregar la sección de contribución a ambos README.
8. Verificar formato, links internos, idempotencia del generador y la pirámide de
   calidad.
<!-- SECTION:PLAN:END -->
