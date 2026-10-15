---
id: DEV-285
title: "Carga diferida y asíncrona bajo demanda de diccionarios i18n"
status: draft
created_date: '2026-10-15'
updated_date: '2026-10-15'
labels:
  - "performance"
  - "i18n"
  - "frontend"
  - "bundle"
dependencies:
  - "DEV-284"
priority: low
type: tech_debt
estimate: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optimización del sistema de internacionalización ([src/utils/i18n.tsx](file:///c:/Users/Pablo/Proyectos/gripm/src/utils/i18n.tsx)) para cargar únicamente el diccionario del idioma activo (`es.json` o `en.json`) en lugar de incluir ambos de forma estática en el paquete principal de la aplicación.

### Problemas identificados:
1. Actualmente `i18n.tsx` importa directamente ambos archivos JSON al inicio del archivo:
   ```ts
   import esDict from '../locales/es.json';
   import enDict from '../locales/en.json';
   ```
2. Esto suma más de **108 kB de datos JSON planos** al bundle inicial de JavaScript, a pesar de que el usuario solo puede usar un idioma a la vez.

### Solución propuesta:
- Modificar el proveedor `I18nProvider` para resolver dinámicamente mediante `import()` el archivo de idioma requerido según la preferencia del usuario o del sistema.
- Cargar inicialmente solo el idioma determinado por `getInitialLanguage()`.
- Si el usuario cambia de idioma en `SettingsView` o vía selector, cargar asíncronamente el nuevo diccionario y almacenarlo en caché en memoria.
- Mantener las firmas de tipado estricto `TranslationKey` usando `typeof` sobre una definición de tipo sin forzar la importación del contenido completo en tiempo de ejecución.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 El bundle inicial no incluye los diccionarios de idiomas que no coincidan con el idioma activo
- [ ] #2 Al cambiar de idioma en configuración, el nuevo diccionario se carga bajo demanda de forma asíncrona sin errores
- [ ] #3 La función `t(...)` mantiene total compatibilidad hacia atrás y conserva el tipado estricto de TypeScript
- [ ] #4 `npx tsc --noEmit` y `npm test` pasan sin fallas
<!-- AC:END -->

## Implementation Notes

- Archivos a modificar: `src/utils/i18n.tsx`.
- Dependencia: Recomendado tras `DEV-284`.
