---
id: DEV-330
title: "Badges y notificaciones locales de vencimiento"
status: ideas
created_date: '2026-10-22'
updated_date: '2026-10-22'
labels:
  - "product"
  - "ux"
  - "notifications"
priority: medium
type: feature
dependencies:
  - DEV-327
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
OpenTodo envía recordatorios vía Web Push, lo que exige servidor persistente, claves VAPID y un servicio de push de terceros. gripm no necesita nada de eso: su servidor corre en la máquina del usuario, así que con la Notifications API del navegador y un contador en la pestaña puede ofrecer el mismo valor ("3 tareas vencidas") sin que un solo byte salga de la máquina.

Explorar un badge en el tab del board y notificaciones locales opcionales para tareas que vencen hoy o están vencidas, alimentados por el mismo `dueDate` que ya existe. La funcionalidad debe ser opt-in, con permiso del navegador solicitado en contexto, y desactivable desde configuración. Depende de la definición de la vista Hoy (DEV-327) porque comparte la misma lógica de agrupamiento por fecha.

Es una iniciativa de descubrimiento: verificar primero que la ventana local tenga oportunidad real de mostrarse (el board no siempre está abierto) para no prometer recordatorios que no se disparan.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Se documenta cuándo pueden dispararse las notificaciones dado que el board solo corre con el servidor local abierto.
- [ ] #2 No se realiza ninguna petición de red hacia servicios de push externos ni se introduce dependencia de terceros.
- [ ] #3 El badge y las notificaciones son opt-in y se pueden desactivar desde la configuración del proyecto.
- [ ] #4 El conteo usa `dueDate` existente y coincide con el agrupamiento de la vista Hoy (DEV-327).
- [ ] #5 Con permiso denegado o navegador sin soporte, la app degrada sin errores en consola.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Validar la viabilidad y el momento de disparo con un prototipo mínimo.
2. Definir la política de agrupación compartida con la vista Hoy.
3. Implementar badge y notificación local opt-in con degradación segura.
4. Testear permisos, soporte ausente y desactivación.
<!-- SECTION:PLAN:END -->
