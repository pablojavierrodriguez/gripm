---
releases:
  - "1.0.5"
targetRelease: "1.0.5"
release: "1.0.5"
milestone: "1.0.5"
id: DEV-217
title: "Corrección de paridad multiplataforma en CI y smoke test de jerarquías"
status: done
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "ci"
  - "testing"
  - "ux"
  - "playwright"
  - "cross-platform"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolver las fallas en GitHub Actions tras la publicación de v1.0.5:
1. **Fallo en Browser smoke test (`scripts/test-ui-smoke.js`):** Al mover el selector de Épica/Padre al panel de atributos lateral derecho en DEV-212, el smoke test de Playwright esperaba encontrar el badge de padre huérfano (`ORPHAN-PARENT-001`) y el botón de remoción rápida dentro de la pestaña de Relaciones. Además, si el padre es huérfano, el nuevo `<select>` no tenía una opción para renderizar su identificador, provocando que desapareciera visualmente del DOM y produciendo un timeout de 30 segundos.
2. **Fallo en Verify en Ubuntu y macOS (`scripts/verify-audit-ux-baseline.js`):** En Windows las aserciones de delta se omitían por diferencias de separadores de ruta (`\`), pero en runners POSIX (Ubuntu/macOS) el verificador evalúa que no existan hallazgos nuevos fuera de los 12 falsos positivos conocidos de `UX-010`. Las modificaciones de interfaz introducidas en v1.0.5 generaron 11 observaciones (en `ItemCard.tsx`, `ItemModal.tsx` y `SettingsView.tsx`) no registradas en el baseline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 En ItemModal.tsx, renderizar opcion para parentId no resuelto en el selector de Jerarquia y permitir su remocion rapida accesible
- [x] #2 En scripts/test-ui-smoke.js, sincronizar las aserciones con la nueva ubicacion del atributo de jerarquia y validar ejecucion verde en Playwright
- [x] #3 Subsanar las 11 observaciones de UX y micro-tipografia en ItemCard.tsx, ItemModal.tsx y SettingsView.tsx
- [x] #4 Actualizar audit-ux-baseline.json con rutas POSIX normalizadas preservando los 12 casos residuales de UX-010
- [x] #5 La suite de pruebas npm test, npm run test:ui y npm run backlog:check pasa con codigo 0
<!-- AC:END -->
