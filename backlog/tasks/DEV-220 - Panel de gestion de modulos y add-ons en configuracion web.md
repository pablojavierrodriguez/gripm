---
id: DEV-220
title: "Panel de gestión de módulos y add-ons en configuración web"
status: draft
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "ui"
  - "settings"
  - "modules"
  - "ux"
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Diseñar e incorporar en `SettingsView` un panel centralizado de **"Módulos & Add-ons"** para activar o desactivar capacidades en caliente:
1. **Catálogo visual de add-ons:** Presentar tarjetas con interruptores claros para cada módulo del producto:
   - 🗂️ **Kanban Core & Backlog:** Siempre activo (núcleo base indispensable).
   - ⏱️ **Sprints & Timeboxing (Scrum):** Activa/desactiva la pestaña Sprints y sus campos en tareas/filtros.
   - 🚀 **Release Management & Versioning:** Activa/desactiva la pestaña Releases y el empaquetado formal de versiones.
   - 🌐 **Multi-Project Hub:** Switcher de proyectos y registro en el hub global.
2. **Activación instantánea sin recarga:** Al encender o apagar un add-on, la barra superior de navegación y los modales reaccionan de inmediato y persisten el cambio en `.gripm/config.json`.
3. **Descubribilidad no invasiva:** Si el usuario está en modo minimalista, mostrar en la configuración una vía obvia y simple para expandir capacidades cuando el equipo o el proyecto lo requiera.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 SettingsView incluye seccion dedicada de Modulos y Add-ons con explicacion clara de cada capacidad
- [ ] #2 Toggles individuales para Sprints, Releases y Multi-Hub con persistencia inmediata en .gripm/config.json
- [ ] #3 La barra de navegacion principal refleja altas y bajas de pestanas de forma reactiva y sin recargar la pagina
- [ ] #4 Textos completamente localizados en espanol e ingles en utils/i18n.ts
- [ ] #5 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Integrar armónicamente con las pestañas de SettingsView existentes.
<!-- SECTION:NOTES:END -->
