---
id: DEV-230
title: "Exportación Liviana de Eventos de Calendario sin Dependencias Cloud (Web Intent e iCal)"
status: ideas
created_date: '2026-10-09'
updated_date: '2026-10-09'
labels:
  - "ui"
  - "calendar"
  - "dx"
  - "privacy"
  - "local-first"
priority: low
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Permitir a los usuarios vincular tareas o hitos de entrega con sus calendarios personales de manera inmediata y sin comprometer la privacidad:
1. **Web Intent directo de Google Calendar:** Acción contextual en `ItemModal` ("Agendar en Calendario") que construye y abre una URL de intención web directa (`calendar.google.com/calendar/render?action=TEMPLATE...`) con el título `[ID] Título`, enlace local y notas de la tarea precargadas.
2. **Descarga de archivo estándar iCalendar (.ics):** Generación instantánea en el navegador de un archivo `.ics` para usuarios de Apple Calendar, Outlook o clientes locales de calendario.
3. **Cero dependencias cloud:** No requiere OAuth, permisos corporativos de Google Workspace, almacenamiento de tokens ni sincronizadores en segundo plano. Privacidad absoluta y cero mantenimiento de servidores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Accion contextual en ItemModal para agendar sesion o evento a partir de los datos de la tarea
- [ ] #2 Generacion de enlace Web Intent para Google Calendar con titulo y notas de la tarea precargados sin requerir OAuth
- [ ] #3 Opcion de descarga de archivo .ics universal compatible con clientes de calendario de escritorio
- [ ] #4 Cero almacenamiento o transmision de credenciales y cero dependencias de APIs cloud
- [ ] #5 Textos localizados en espanol e ingles en src/utils/i18n.ts
- [ ] #6 npm test y npx tsc --noEmit pasan con codigo 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implementación 100% client-side aprovechando blobs de descarga para .ics y window.open para Web Intents.
<!-- SECTION:NOTES:END -->
