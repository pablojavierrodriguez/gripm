---
id: DEV-205
title: "Evaluar e implementar Gripm Suite"
status: ideas
created_date: '2026-10-07'
updated_date: '2026-10-07'
labels:
  - "product"
  - "npm"
  - "ecosystem"
  - "suite"
priority: medium
type: feature
dependencies:
  - DEV-204
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluar y, si la experiencia de usuario lo justifica, crear una forma sencilla de instalar Gripm Board y Gripm Playbook juntos desde una sola invocación, preservando que cada producto se pueda instalar, actualizar, usar y desinstalar independientemente.

No asumir que un paquete agregador de npm instala automáticamente los ejecutables de sus dependencias ni que una instalación conjunta debe ser global. Definir primero el alcance global y/o por proyecto, la selección de productos, los requisitos de Node y el comportamiento de actualización/desinstalación. Las operaciones deben preservar el backlog y los archivos existentes del usuario y solicitar confirmación explícita antes de cualquier acción destructiva.

Esta iniciativa depende de DEV-204 para que el modelo de productos, los nombres y los comandos individuales estén claros antes de introducir otra capa de instalación.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Está justificado el valor de Suite frente a instalar Board y Playbook por separado.
- [ ] #2 Se define y documenta qué productos incluye Suite y cómo se seleccionan, manteniendo Board y Playbook opcionales e independientes.
- [ ] #3 Se decide y documenta el alcance de instalación (global, por proyecto o ambos), los defaults y los comandos reproducibles.
- [ ] #4 Se valida con los artefactos empaquetados/publicados que una invocación instala los ejecutables previstos y no depende de suposiciones sobre npm.
- [ ] #5 Instalar, actualizar y desinstalar preserva backlogs y archivos del usuario; cualquier eliminación requiere consentimiento explícito.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Investigar las modalidades reales de instalación y distribución npm de Board y Playbook.
2. Comparar el flujo de Suite con la instalación individual y decidir si reduce fricción de forma significativa.
3. Definir arquitectura, selección de productos, alcance, defaults, actualización y desinstalación segura.
4. Prototipar y probar las invocaciones con paquetes empaquetados en un entorno aislado.
5. Si el valor y el contrato quedan demostrados, implementar Suite, documentar ambos productos y probar ciclos completos de instalación.
<!-- SECTION:PLAN:END -->
