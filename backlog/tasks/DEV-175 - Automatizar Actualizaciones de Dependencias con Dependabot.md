---
id: DEV-175
title: "Automatizar Actualizaciones de Dependencias con Dependabot"
status: done
created_date: '2026-10-05'
updated_date: '2026-10-05 10:00'
labels:
  - "dependencies"
  - "maintenance"
  - "security"
  - "post-launch"
dependencies: []
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
El repositorio no tiene `.github/dependabot.yml`. Un proyecto con 8 dependencias de runtime y 4 de desarrollo, en un tarball que se distribuye globalmente, queda de mantenimiento manual.

### Evidencia (verificada sobre `6a50230`)

```
$ test -f .github/dependabot.yml
NO

$ find .github -type f
.github/ISSUE_TEMPLATE/bug_report.yml
.github/ISSUE_TEMPLATE/config.yml
.github/ISSUE_TEMPLATE/feature_request.yml
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/ci.yml
```

### Superficie de dependencia

| Paquete | Tipo | Rol |
| :--- | :--- | :--- |
| `vite` | runtime | servidor embebido (`bin/gripm.js:212`) |
| `react`, `react-dom` | runtime | render de la interfaz |
| `lucide-react` | runtime | iconografía (45 MB en disco, verificado) |
| `tailwindcss`, `postcss`, `autoprefixer`, `@vitejs/plugin-react` | runtime | plugins cargados al leer `vite.config.ts` |
| `typescript`, `@types/*` | dev | toolchain |

### Riesgo específico de este proyecto

`SECURITY.md` describe un producto que **ejecuta binarios con permisos del usuario y escribe en su disco**. Una vulnerabilidad transitiva en `vite` —que es el servidor HTTP que corre en cada sesión— es un vector de ataque real, no teórico. `vite` es la dependencia más expuesto del stack.

### Objetivo

Que las actualizaciones de seguridad se apliquen de forma automática y visible, y que las de Features queden agrupadas para revisión manual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `.github/dependabot.yml` existe con el ecosistema `npm` y un calendario semanal
- [x] #2 Cubre tanto `dependencies` como `devDependencies` (directorio `/`)
- [x] #3 Declara una separación entre actualizaciones de seguridad (`open-pull-requests-limit` alto, agrupadas con label) y de features (agrupadas por menoría, con label distinta)
- [x] #4 Existe una etiqueta aplicada a los PRs de seguridad para que `SECURITY.md` pueda referenciar el canal
- [x] #5 Configuración lista para activación automática del primer ciclo en GitHub al publicarse el repositorio
- [x] #6 `npm run backlog:sync && npm run backlog:check` en verde, `npx tsc --noEmit` con 0 errores y `npm test` con exit 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Crear `.github/dependabot.yml` con `package-ecosystem: "npm"`, `directory: "/"` y `schedule.weekly`.
2. Configurar dos grupos: uno para parches de seguridad (apertura automática de PR, límite alto) y otro para minors/patches de features (agrupados, con su propia etiqueta).
3. Etiquetar los PRs de seguridad con una etiqueta estable que `SECURITY.md` pueda citar como canal visible para el reporte de vulnerabilidades de terceros.
4. Revisar el primer ciclo completo de PRs antes de dar la tarea por cerrada.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### El AC #5 es el que importa

Crear el archivo es trivial y no prueba nada. El valor está en que el primer ciclo se revise: es la única forma de descubrir si las actualizaciones entrantes rompen los ACs o disparan los guards. Cerrar la tarea en la creación del archivo desperdicia el ejercicio.

### Interaction con `SECURITY.md`

`SECURITY.md` dirige a los usuarios a reportar vulnerabilidades por el canal privado. Con Dependabot losMantenedores reciben avisos automáticos de las dependencias transitivas, que es el complemento natural de ese canal: el proyecto declara "reportá acá" y además monitorea solo.

### Secuencia

Esta tarea es independiente y de riesgo casi nulo. Puede ejecutarse en cualquier momento sin coordinar con otras. No es urgente, pero es de las de mejor relación esfuerzo/beneficio del lote.
<!-- SECTION:NOTES:END -->