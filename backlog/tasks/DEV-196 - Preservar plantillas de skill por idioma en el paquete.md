---
id: DEV-196
title: "Preservar plantillas de skill por idioma en el paquete"
status: done
created_date: '2026-10-06'
updated_date: '2026-10-07 23:29'
labels:
  - "bug"
  - "i18n"
  - "packaging"
dependencies: []
priority: medium
type: bug
milestone: "1.0.4"
releases:
  - "1.0.4"
release: "1.0.4"
targetRelease: "1.0.4"
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Al inicializar el propio repositorio Gripm en inglés, `gripm --init` escribe la skill inglesa sobre `.agents/skills/gripm/SKILL.md`, que también funciona como plantilla canónica española del paquete. Después, el test `verify-dist` instala una skill inglesa incluso cuando pide `--language es` y falla su aserción. Las plantillas de distribución deben ser estables e independientes del idioma escogido para inicializar el repo fuente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El idioma configurado para el repo Gripm no puede sobrescribir la plantilla canónica de otro idioma
- [x] #2 `npm test` verifica la instalación de skills en inglés y español después de inicializar el repo fuente en inglés
- [x] #3 El tarball npm contiene las fuentes canónicas para ambos idiomas
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `SKILL.es.md` conserva la versión española canónica del repositorio; `SKILL.en.md` y `SKILL.es.md` son fuentes inmutables para el instalador.
- `SKILL.md` puede seguir siendo la copia activa del idioma elegido por el repositorio sin alterar los templates distribuidos.
- La verificación del tarball exige ambas fuentes y comprueba la selección inglesa y española mediante `gripm --init`.
<!-- SECTION:NOTES:END -->
