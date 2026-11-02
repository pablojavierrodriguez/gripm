---
id: DEV-355
title: "Backend REST API: Endpoints de Auditoria e Importacion Masiva de TODOs a Tareas"
status: done
created_date: '2026-10-31'
updated_date: '2026-11-02'
labels:
  - "backend"
  - "api"
  - "audit"
  - "server"
  - "sync"
dependencies:
  - "DEV-353"
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Exponer las capacidades del motor de auditoria (`DEV-353`) a traves de endpoints REST en el servidor Express/Node.js de Gripm (`server/`), permitiendo al frontend web y a clientes externos consultar la salud del codigo y materializar tareas desde comentarios detectados.

### Endpoints Requeridos:
1. **`GET /api/audit`:**
   - Retorna el diagnostico consolidado de salud del repositorio.
   - Implementa cache ligero en memoria (TTL de 30 segundos) con revalidacion para no penalizar el rendimiento del servidor en consultas frecuentes.
   - Retorna el resumen general, desglose de LOC, supresiones detectadas, estado de pruebas y lista de TODOs/FIXMEs.

2. **`POST /api/audit/refresh`:**
   - Invalida la cache de auditoria y fuerza un escaneo fresco del arbol de trabajo en disco.

3. **`POST /api/audit/import-todos`:**
   - Permite importar uno, varios o todos los TODOs detectados hacia `backlog/tasks/`.
   - Body esperado: `{ items: Array<{ file: string, line: number, type: string, text: string }> }`.
   - Lee el ID maximo de forma atomica al momento de la creacion para evitar colisiones.
   - Genera archivos Markdown estructurados en `backlog/tasks/DEV-XXX - slug.md` con estado `draft`, descripcion con el snippet original y labels `['todo-import', 'tech_debt']`.
   - Dispara la sincronizacion inmediata (`syncBacklog()`) para actualizar `BACKLOG.md` de forma atomica.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 El endpoint GET /api/audit responde con codigo 200 y el JSON tipado del reporte de salud.
- [x] #2 El endpoint POST /api/audit/refresh invalida la cache y actualiza los datos del diagnostico ante cambios en el sistema de archivos.
- [x] #3 El endpoint POST /api/audit/import-todos valida la carga util y crea las tareas en backlog/tasks/ con IDs correlativos unicos.
- [x] #4 Las tareas importadas por la API quedan en estado draft con su respectivo frontmatter YAML valido y sin secciones malformadas.
- [x] #5 La llamada de importacion regenera BACKLOG.md automaticamente manteniendo coherencia con el arbol de tareas en disco.
- [x] #6 Se incorporan pruebas en scripts/test-backlog-service.js o test de API validando los endpoints y codigos de error (400, 500).
- [x] #7 La suite de pruebas de API y seguridad responde con codigo de salida 0.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Registrar rutas `/api/audit`, `/api/audit/refresh` y `/api/audit/import-todos` en `server/routes` o `server/index.js`.
2. Conectar las rutas con `auditService.ts` implementando mecanismo de debounce y cache TTL.
3. Implementar el servicio transaccional de importacion de TODOs reutilizando las utilidades de frontmatter y sync del proyecto.
4. Escribir pruebas de integracion automatizadas para los nuevos endpoints.
5. Ejecutar la Piramide de Verificacion.
<!-- SECTION:PLAN:END -->
