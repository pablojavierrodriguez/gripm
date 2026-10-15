---
id: DEV-279
title: "Internacionalización (i18n) de plantillas BDD para Historias de Usuario y Criterios de Aceptación"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "bug"
  - "i18n"
  - "item-modal"
dependencies: []
priority: medium
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
En `src/components/ItemModal.tsx`, las plantillas predefinidas que se insertan al presionar los botones de ayuda de BDD se encuentran hardcodeadas en español:

1. **Plantilla de Historia de Usuario (línea 728):**
   ```ts
   const bddTemplate = `\n\n**COMO** [rol del usuario]\n**QUIERO** [capacidad o acción]\n**PARA** [beneficio o valor de negocio]\n`;
   ```
2. **Criterio de Aceptación BDD (línea 797):**
   ```ts
   text: 'DADO [contexto inicial], CUANDO [evento o acción], ENTONCES [resultado esperado]'
   ```

Cuando la aplicación está configurada en inglés (`config.language = 'en'`), presionar estos botones sigue insertando texto literal en español en lugar de los equivalentes canónicos en inglés (`AS A... I WANT... SO THAT...` y `GIVEN... WHEN... THEN...`).

### Objetivos:
1. Extraer los textos y plantillas de BDD al catálogo de traducciones `src/utils/i18n.ts`.
2. Proporcionar las versiones canónicas en inglés:
   - Story: `**AS A** [user role]\n**I WANT** [action or capability]\n**SO THAT** [business value or benefit]\n`
   - AC Scenario: `GIVEN [initial context], WHEN [event or action], THEN [expected outcome]`
3. Mantener las versiones canónicas en español en `t(...)`.
4. Asegurar que la inserción respete el idioma activo del usuario en la sesión.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Al insertar plantilla de Historia de Usuario con la app en inglés, se genera el formato `**AS A** / **I WANT** / **SO THAT**`
- [ ] #2 Al insertar plantilla de Historia de Usuario con la app en español, se genera el formato `**COMO** / **QUIERO** / **PARA**`
- [ ] #3 Al agregar Criterio de Aceptación BDD con la app en inglés, el texto predeterminado es `GIVEN ..., WHEN ..., THEN ...`
- [ ] #4 Al agregar Criterio de Aceptación BDD con la app en español, el texto predeterminado es `DADO ..., CUANDO ..., ENTONCES ...`
- [ ] #5 `npm test` y validación de tipos sin errores
<!-- AC:END -->
