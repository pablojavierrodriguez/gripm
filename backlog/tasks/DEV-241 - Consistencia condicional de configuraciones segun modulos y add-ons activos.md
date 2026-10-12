---
id: DEV-241
title: "Consistencia condicional de configuraciones segun modulos y add-ons activos"
status: done
created_date: '2026-10-11'
updated_date: '2026-10-11'
labels:
  - "settings"
  - "ux"
  - "modules"
  - "workflow"
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Garantizar coherencia total en la vista de configuración (`SettingsView`):
1. **Disponibilidad condicional según módulos instalados/activos:** Solo exponer configuraciones correspondientes a módulos habilitados en *Módulos & Add-ons* (o seleccionados en el onboarding de `--init`).
2. **Metodologías acopladas al módulo Sprints:** Cuando el módulo Sprints está inactivo (`enabledTabs.sprint === false`), las metodologías Scrum y Scrumban se deshabilitan visual y funcionalmente (mostrando badge de advertencia y tooltip/descripción informativa), forzando y preservando la metodología en `kanban`.
3. **Vistas predeterminadas consistentes:** Las opciones de vista inicial (`sprint`, `release`) quedan deshabilitadas si sus respectivos módulos están inactivos, con fallback automático a `kanban` para evitar pantallas inaccesibles o rotas.
4. **Pestañas visibles en cabecera:** Reflejar inequívocamente el estado de los módulos de Sprints y Releases en la sección de pestañas superiores, deshabilitando su conmutación individual cuando el módulo raíz está desactivado e informando al usuario sobre su activación en *Módulos & Add-ons*.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Scrum y Scrumban quedan visual y funcionalmente deshabilitados en Workflow & Views cuando el modulo Sprints esta inactivo
- [x] #2 La vista predeterminada no permite seleccionar Sprints o Releases si sus modulos correspondientes estan inactivos y hace fallback limpio a kanban
- [x] #3 La seccion de pestanas visibles en cabecera bloquea conmutadores de modulos inactivos con indicacion explicita
- [x] #4 Al desactivar modulos en Modulos & Add-ons, el estado local y persistido ajusta automaticamente methodology y defaultView sin provocar inconsistencias
- [x] #5 Suite de pruebas y Piramide de Verificacion pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Mantener compatibilidad estricta con SettingsSwitch (DEV-239) sin agregar checkboxes nativos adicionales.
- Fix de interactividad en SettingsSwitch: el input nativo ahora cubre la superficie completa del switch (`absolute inset-0 w-full h-full z-10 cursor-pointer`) y el track visual tiene `pointer-events-none`, asegurando respuesta instantánea al click en todas las pestañas (Módulos & Add-ons, Vistas, Tablero, Apariencia).
<!-- SECTION:NOTES:END -->
