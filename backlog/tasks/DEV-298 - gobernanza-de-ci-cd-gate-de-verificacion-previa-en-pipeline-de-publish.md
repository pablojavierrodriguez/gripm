---
id: DEV-298
title: "Gobernanza de CI/CD: Gate de verificación previa obligatoria en pipeline de publish a npm"
status: done
created_date: '2026-10-15'
updated_date: '2026-10-17'
labels:
  - "ci"
  - "cd"
  - "npm"
  - "governance"
dependencies: []
priority: p2
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Garantizar que ningún paquete de `@gripm/board` sea emitido al registro público de npm sin que la suite integral de CI (`ci.yml`, incluyendo la matriz multi-OS de Ubuntu, macOS y Windows, y los smoke tests de navegador Playwright) haya finalizado exitosamente sobre el commit del release.

### Diagnostico del Defecto de Arquitectura:
El pipeline previo ejecutaba la publicación de forma desacoplada y en paralelo:
1. Al pushear el tag, se disparaba un workflow separado de publicación que corría solo en Ubuntu.
2. En caso de fallas que solo emergían en runners de Windows/macOS o en el smoke test de UI, el paquete se publicaba a npm antes de que CI terminara de detectar el problema, dejando a los usuarios con una versión inmutable defectuosa en npm.
3. El sondeo paralelo vía API introducía esperas ociosas de runners y riesgos de rate limits.

### Solucion Tecnica Implementada:
- **Orquestacion Nativa de 3 Fases en `ci.yml`:**
  1. Fase 1: Matriz de verificación estricta (`verify`) en 6 runners (Ubuntu, macOS, Windows en Node 22.6 y 22.x).
  2. Fase 2: Smoke test de navegador Playwright (`ui-smoke`) sobre bundle de producción.
  3. Fase 3: Job de publicación (`publish`) bloqueado físicamente bajo `needs: [verify, ui-smoke]` y restringido a la rama `main`.
- **Certificacion Idempotente:**
  El job consulta `npm view @gripm/board@<version>`: si la versión ya existe, concluye de inmediato sin publicar.
- **Auto-Tagging y GitHub Release Oficial:**
  Tras la publicación exitosa en npmjs con provenance, el pipeline genera automáticamente el tag anotado `vX.Y.Z` y la GitHub Release correspondiente con las notas de `releases.json`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] AC #1: Pipeline de release integrado bajo orquestación nativa (`needs: [verify, ui-smoke]`) garantizando que ningún paquete sea emitido a npm sin que la suite multi-plataforma completa esté 100% aprobada.
- [x] AC #2: Si algún check de CI falla (en Ubuntu, Windows, macOS o browser smoke test), el engine de GitHub Actions cancela/omite el job de publicación automáticamente, impidiendo cualquier emisión a npm.
- [x] AC #3: Detección automática e idempotente de versión en npmjs para omitir el despliegue en commits regulares a main.
- [x] AC #4: Creación automática del tag anotado de Git y de la GitHub Release oficial tras la publicación exitosa en npmjs.
<!-- AC:END -->

## Notes

<!-- SECTION:NOTES:BEGIN -->
Identificado durante el release de v1.5.0/v1.5.1, donde un fallo en `ui-smoke` de CI ocurrió en paralelo a la publicación exitosa del paquete en npm.
<!-- SECTION:NOTES:END -->
