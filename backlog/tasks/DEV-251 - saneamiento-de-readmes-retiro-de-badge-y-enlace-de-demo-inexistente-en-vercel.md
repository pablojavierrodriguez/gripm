---
id: DEV-251
title: "Saneamiento de READMEs: retiro de badge y enlace a demo inexistente en Vercel"
status: done
created_date: '2026-10-12'
updated_date: '2026-10-12'
labels:
  - "docs"
  - "readme"
  - "hotfix"
dependencies: []
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Retirar el badge y el párrafo de demostración interactiva que referenciaban a `https://gripm.vercel.app` en `README.md` y `README.es.md`:
1. La funcionalidad pertenece a la tarea DEV-222, la cual continúa en estado `draft` sin código ni infraestructura de despliegue en Vercel.
2. Evitar promesas de producto no existentes y enlaces rotos en la portada pública del repositorio en GitHub.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Removido badge de Live Sandbox en Vercel de README.md
- [x] #2 Removido bloque con enlace a gripm.vercel.app de README.md
- [x] #3 Removido badge de Demo en Vivo en Vercel de README.es.md
- [x] #4 Removido bloque con enlace a gripm.vercel.app de README.es.md
- [x] #5 npm run backlog:check y npm test pasan con código 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- DEV-222 permanece en el backlog como tarea draft para cuando efectivamente se implemente el sandbox web y su pipeline de hosting.
<!-- SECTION:NOTES:END -->
