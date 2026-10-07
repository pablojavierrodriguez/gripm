---
id: DEV-203
title: "Configurar metadatos visibles en tarjetas de ítems"
status: ideas
created_date: '2026-10-07'
updated_date: '2026-10-07'
labels:
  - "ux"
  - "settings"
  - "kanban"
priority: medium
type: improvement
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Permitir que cada usuario elija qué información de una tarea se muestra directamente en las tarjetas del Kanban sin abrir el modal, por ejemplo módulo, sprint, release, avance de criterios, etiquetas, asignados y relaciones. La preferencia debe persistir, ser fácil de descubrir desde configuración y evitar saturar las tarjetas, con el mismo resultado en las vistas donde se reutiliza el componente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Configuración permite activar o desactivar campos de metadatos visibles en tarjetas
- [ ] #2 Las preferencias persisten entre sesiones y cuentan con valores por defecto razonables para instalaciones existentes
- [ ] #3 Las tarjetas Kanban respetan la selección sin abrir el modal
- [ ] #4 La opción de jerarquía/relaciones no duplica información ya visible ni colisiona con interacciones de tarjetas
- [ ] #5 La configuración es accesible, responsiva y localizada en español e inglés
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Definir los campos permitidos y sus defaults junto con el usuario.
2. Diseñar controles de configuración persistentes dentro de Settings.
3. Conectar las preferencias a la composición de ItemCard y validar saturación visual en móvil.
<!-- SECTION:PLAN:END -->
