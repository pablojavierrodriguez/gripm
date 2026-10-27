---
id: DEV-351
title: "Escala semanal con anchos proporcionales de grilla y sincronizacion de scroll vertical"
status: draft
created_date: '2026-10-27'
updated_date: '2026-10-27'
labels:
  - "roadmap"
  - "calendar"
  - "ux"
  - "timeline"
dependencies:
  - DEV-348
priority: medium
type: enhancement
estimate: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mejora de la precision temporal y ergonomia visual del lienzo de Roadmap:
1. **Escala Semanal:** Incorporar la opcion de escala de tiempo semanal (`Semanas` / `Weeks`), permitiendo visualizar hitos con granularidad de semanas ISO (iniciando lunes) y subdivision de dias para una planificacion mas detallada.
2. **Anchos Proporcionales de Grilla:** Sustituir anchos rigidos arbitrarios por calculos proporcionales a los dias reales de cada mes (evitando el desfase visual entre meses de 28, 30 y 31 dias).
3. **Sincronizacion de Scroll Vertical:** Unificar o ligar el scroll vertical de la lista lateral izquierda con el lienzo de barras de Gantt para que nunca se desalineen las filas al desplazarse en backlogs con muchas tareas.
4. **Pulido de i18n y Etiquetas:** Erradicar textos duros en espanol cuando el idioma configurado es ingles (ej. `ítems`, `Sin Sprint`, `Ir a Hoy`) y formatear de manera sobria las etiquetas de cabecera.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] Selector de escala incluye la vista 'Semanas' con numeracion ISO y fechas de inicio/fin de semana
- [ ] Las columnas mensuales y semanales ajustan su ancho exactamente a la cantidad real de dias correspondientes
- [ ] El scroll vertical entre el panel de jerarquia y el lienzo de barras se mantiene 100% alineado
- [ ] Todas las cadenas de texto del componente utilizan las claves de i18n correspondientes sin texto duro
<!-- AC:END -->
