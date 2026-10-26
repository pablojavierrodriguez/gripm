<p align="center">
  <img src="docs/brand/gripm-logo-lockup.png" alt="Logo de gripm" width="140" />
</p>

<h1 align="center">gripm</h1>

<p align="center">
  <strong>Un espacio local-first para gestionar el trabajo de producto e ingeniería, planificar iteraciones y colaborar con agentes de IA.</strong>
</p>

<p align="center">
  🌐 <strong><a href="README.md">English</a></strong> | <strong><a href="README.es.md">Español</a></strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@gripm/board"><img src="https://img.shields.io/npm/v/@gripm/board.svg" alt="Versión en npm" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933.svg?logo=nodedotjs&logoColor=white" alt="Node.js: >=20.0.0 (LTS)" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Protocolo%20Listo-6366f1.svg" alt="Protocolo MCP: 2024-11-05" /></a>
  <a href="https://github.com/pablojavierrodriguez/gripm-playbook"><img src="https://img.shields.io/badge/Metodolog%C3%ADa-gripm%20Playbook-purple.svg" alt="Metodología: gripm Playbook" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Licencia-MIT-blue.svg" alt="Licencia: MIT" /></a>
  <a href="https://gripm.vercel.app"><img src="https://img.shields.io/badge/Demo%20en%20vivo-gripm.vercel.app-6366f1.svg" alt="Demo interactiva en vivo" /></a>
</p>

<p align="center">
  <a href="https://gripm.vercel.app">Pruébalo en vivo en <strong>gripm.vercel.app</strong></a> - un entorno de prueba con datos de ejemplo sin necesidad de instalación. Los cambios se guardan localmente en tu navegador y nunca viajan a la nube.
</p>

<p align="center">
  <img src="docs/screenshots/01-kanban-dark.png" alt="Tablero Kanban de Gripm en modo oscuro" width="100%" />
</p>

> **Tu hoja de ruta debe vivir junto a tu código, no en servidores ajenos.** Gripm es un espacio local para el seguimiento de tareas, planificación iterativa y empaquetado de versiones. Brinda a desarrolladores y agentes de IA autónomos (Cursor, Claude Code, Antigravity) especificaciones estructuradas, compuertas de criterios de aceptación y velocidad sin latencia de red.

---

## Por qué gripm

Los archivos estáticos `TODO.md` se vuelven inmanejables a medida que los proyectos crecen, mientras que los trackers en la nube encierran tu roadmap tras APIs propietarias, latencia de red y bases de datos externas. Gripm combina la ergonomía de un tablero web moderno con la soberanía de Git y la conectividad nativa para agentes de IA:

| Factor | Herramientas en la nube | Archivos Markdown estáticos | gripm |
| :--- | :--- | :--- | :--- |
| **Almacenamiento y privacidad** | Alojado en infraestructura de terceros | Archivos planos sin interactividad | **Local-first**. Markdown distribuido (`backlog/tasks/*.md`) o JSON único. |
| **Integración con Git** | Webhooks e integraciones externas | Ediciones manuales sin estructura | Versiona tareas en los mismos commits y Pull Requests que el código. |
| **Interfaz humana** | Aplicaciones web que requieren cuentas y login | Editor de texto plano | **Cockpit web local** (`localhost:4100`) con Kanban, Sprints y Releases. |
| **Acceso para agentes de IA** | Extensiones web sujetas a límites de tasa | Alto consumo de tokens y contexto | **Servidor MCP stdio nativo** (`gripm-mcp`) con compuertas mecánicas. |
| **Operación sin conexión** | Requiere conexión activa a internet | 100% offline | **100% offline** sin telemetría ni dependencias de servicios externos. |

---

## Inicio rápido

Requiere Node.js 20.0.0 (LTS) o posterior.

### 1. Inicializa tu proyecto

Ejecuta en la raíz de tu repositorio:

```bash
npx @gripm/board --init
```

El asistente interactivo consulta tu idioma de preferencia (`es` o `en`), el perfil de adopción (`Minimalista AI-First`, `Baterías Incluidas` o `Personalizado`), y opcionalmente permite vincular roles de equipo de [Gripm Playbook](https://github.com/pablojavierrodriguez/gripm-playbook). Configura `.gripm/config.json`, inicializa la carpeta `backlog/tasks/`, instala la skill del agente (`.agents/skills/gripm/`) y agrega los scripts `"board"` y `"mcp"` a tu `package.json`.

*Inicialización no interactiva para CI o scripts:*
```bash
npx @gripm/board --init -y
```

### 2. Abre el tablero visual

```bash
npx @gripm/board
```
*O mediante el script de npm configurado:*
```bash
npm run board
```

El servidor web se inicia en `http://localhost:4100` y abre automáticamente tu navegador predeterminado.

> [!TIP]
> Instala el paquete de forma global con `npm install -g @gripm/board` para disponer de los comandos directos `gripm`, `gripm add` y `gripm-mcp`.

---

## Integración con Agentes de IA (MCP)

Gripm incluye un servidor nativo **Model Context Protocol (MCP)** sobre `stdio` (`gripm-mcp`), permitiendo a asistentes de programación con IA consultar, crear y actualizar tareas en tiempo real.

### Configuración

Agrega Gripm a la configuración MCP de tu cliente de IA (ej: `claude_desktop_config.json` o la configuración MCP de Cursor):

```json
{
  "mcpServers": {
    "gripm": {
      "command": "npx",
      "args": ["-y", "-p", "@gripm/board", "gripm-mcp", "--repo", "/ruta/absoluta/a/mi-proyecto"]
    }
  }
}
```
*(Si omites `--repo`, el servidor toma por defecto el directorio de trabajo actual provisto por el cliente de IA).*

### Compuerta Mecánica de Calidad (Cero Alucinaciones en la Entrega)

El servidor MCP actúa como guardián de calidad antes de autorizar transiciones a `ready` o `done`:
- **Protección de Criterios de Aceptación:** Rechaza la promoción de tareas si queda algún criterio pendiente (`- [ ]`), indicando al agente con precisión cuáles restan completar.
- **Compuerta de Comandos de Verificación (`verifyCommand`):** Puede ejecutar automáticamente comprobaciones (ej: `npm test`, `npx tsc --noEmit`) antes de certificar un pase de estado.
- **Vocabulario Determinista de Estados:** Restringe la evolución de las tareas a estados válidos de entrega (`draft`, `doing`, `review`, `ready`, `done`).

<details>
<summary><strong>Ver las 12 herramientas del servidor MCP</strong></summary>

| Herramienta | Propósito | Parámetros Clave |
| :--- | :--- | :--- |
| `gripm_list_projects` | Lista proyectos registrados y su motor de persistencia. | Ninguno |
| `gripm_get_stats` | Métricas consolidadas (% avance, abiertas/cerradas, distribución por prefijo). | `projectId` |
| `gripm_list_tasks` | Consulta de bajo consumo de tokens con formato de una línea `compact`, `openOnly` y prefijo. | `projectId`, `status`, `openOnly`, `prefix`, `taskIds`, `format`, `limit` |
| `gripm_get_task` | Detalle completo de una tarea, criterios de aceptación y plan técnico. | `taskId` (ej: `"DEV-001"`) |
| `gripm_create_task` | Crea una tarea en formato Markdown o JSON. | `title`, `description`, `type`, `priority`, `acceptanceCriteria` |
| `gripm_update_task` | Actualiza estado, tilda criterios de aceptación secuencialmente o define planes. | `taskId`, `status`, `toggleAcIndex`, `implementationPlan`, `verifyCommand` |
| `gripm_bulk_update_tasks` | Actualización atómica por lotes (por prefijo o lista de IDs). | `projectId`, `taskIds`, `filterPrefix`, `updates` |
| `gripm_list_releases` | Consulta versiones publicadas, notas de changelog e ítems asociados. | `projectId`, `version` |
| `gripm_export_backlog` | Genera o actualiza el informe consolidado `BACKLOG.md`. | `projectId` |
| `gripm_sync_backlog` | Reconcilia tareas completadas con criterios de aceptación y regenera el informe. | `projectId`, `autoFix` |
| `gripm_create_retro` | Guarda una retrospectiva estructurada de iteración en `backlog/retros/`. | `projectId`, `sprintId`, `sprintName`, `whatWentWell`, `whatWentWrong` |
| `gripm_list_retros` | Lista retrospectivas históricas de sprints. | `projectId` |

</details>

---

## Vistas del Producto

| Planificación de Iteraciones y Backlog | Notas de Versión y Changelog |
| :---: | :---: |
| <img src="docs/screenshots/03-backlog-sprints.png" alt="Vista de planificación de iteraciones y backlog" width="100%" /> | <img src="docs/screenshots/04-release-changelog.png" alt="Generador de notas de versión" width="100%" /> |
| **Kanban - Modo Claro** | **Kanban - Modo Oscuro** |
| <img src="docs/screenshots/02-kanban-light.png" alt="Tablero Kanban en modo claro" width="100%" /> | <img src="docs/screenshots/01-kanban-dark.png" alt="Tablero Kanban en modo oscuro" width="100%" /> |

---

## Capacidades Principales

### Motor Dual de Almacenamiento (Markdown o JSON)
Elige cómo guardar tu proyecto sin necesidad de bases de datos externas:
- **Markdown Distribuido (`backlog-md`):** Archivos individuales en `backlog/tasks/<CODIGO> - <Titulo>.md` con frontmatter YAML. Diseñado para control de versiones con mínima probabilidad de conflictos en Git.
- **Archivo Único JSON (`json`):** Almacenamiento compacto en `.gripm/backlog.json`.
- **Conversión Bidireccional:** Cambia de formato en cualquier momento desde la configuración del proyecto con un solo clic.

### Flujo Ágil Modular
Activa o desactiva pestañas según el ritmo de tu equipo desde **Ajustes > Módulos & Add-ons** o directamente en `.gripm/config.json`:
- **Kanban Core:** Flujo continuo, columnas personalizables, límites WIP y filtrado instantáneo.
- **Sprints:** Planificación temporal opcional para equipos que operan con sprints de duración fija.
- **Releases:** Ensamblador autónomo que empaqueta valor entregado (`ready`) en versiones semánticas y genera `CHANGELOG.md` de manera independiente a los sprints.

### Trabajo Concurrente Multi-Agente con Git Worktrees
Al coordinar múltiples agentes autónomos o desarrolladores en simultáneo, evita ensuciar el working tree principal aislando las tareas en worktrees independientes:
```bash
git worktree add ../mi-app-DEV-221 -b feature/DEV-221
cd ../mi-app-DEV-221
gripm-mcp --repo .
```
Como Gripm guarda cada tarea como un archivo Markdown independiente, la reintegración de ramas mediante merge se realiza sin conflictos de archivo monolítico.

---

## Referencia de Comandos CLI

| Comando / Opción | Propósito |
| :--- | :--- |
| `gripm` | Inicia el cockpit web en `http://localhost:4100` y abre el navegador. |
| `gripm --init` | Asistente de configuración (crea `.gripm/`, `backlog/tasks/`, skill y scripts). |
| `gripm add "<título>" [opciones]` | Captura rápida de tareas desde la terminal (`--priority`, `--type`, `--due`, `--labels`). |
| `gripm import --file <ruta>` | Importador universal offline para Jira (JSON/CSV), Linear (CSV) o CSVs genéricos. |
| `gripm mcp` | Inicia el servidor MCP sobre `stdio` (equivalente a `gripm-mcp`). |
| `gripm playbook sync` | Sincroniza las skills de roles y guías metodológicas de Gripm Playbook en `.agents/`. |
| `gripm --uninstall` | Desacopla Gripm del repositorio limpiamente (preserva intactos `backlog/` y `BACKLOG.md`). |
| `--port <número>` | Puerto personalizado para el servidor web (por defecto: `4100`). |
| `--host <dirección>` | Dirección de enlace (ej: `--host 0.0.0.0` para acceso en red local con token efímero). |
| `--repo <ruta>` | Apunta a un repositorio explícito en lugar del directorio actual. |
| `--hub` / `--single` | Fuerza el modo Hub Multi-Proyecto o el modo Mono-Proyecto aislado. |
| `--no-open` | Inicia el servidor sin abrir el navegador automáticamente. |

<details>
<summary><strong>Detalles del Importador Universal (Jira, Linear, CSV)</strong></summary>

Convierte backlogs existentes en tareas individuales Markdown de forma 100% local sin llamadas a la nube:

```bash
# Simular importación detectada sin escribir en disco
gripm import --file ./jira-export.json --dry-run

# Importar asignando prefijo de código personalizado
gripm import --file ./linear-export.csv --prefix FEAT
```
Formatos admitidos: Jira JSON/CSV, Linear CSV y exportaciones tabulares estándar en CSV.
</details>

<details>
<summary><strong>Privacidad del Repositorio y Estrategias Git</strong></summary>

Gripm es local-first: tus datos residen en tu sistema de archivos.
- **Backlog público como código:** En repositorios internos o proyectos open source con hoja de ruta pública, commitea `backlog/tasks/` en Git para trazabilidad total en PRs.
- **Backlog local en repositorios públicos:** Agrega `.gripm/` y `backlog/` a tu `.gitignore` para usar el tablero y el MCP localmente sin publicar tus tareas en GitHub.
- **Repositorio de backlog dedicado:** Gestiona tus tareas en un repositorio privado hermano y apunta Gripm o el MCP mediante `--repo ../mi-proyecto-backlog`.
</details>

<details>
<summary><strong>Atajos de Teclado</strong></summary>

- `?`: Abrir panel de atajos de teclado
- `N`: Crear nueva tarea en el backlog
- `⌘K` / `Ctrl+K` o `/`: Enfocar barra de búsqueda instantánea
- `1` - `4`: Cambiar de pestaña (`1`: Tablero, `2`: Sprints y Backlog, `3`: Releases, `4`: Papelera)
- `⌘,` / `Ctrl+,`: Alternar pantalla de Configuración
- `Esc`: Cerrar modales y paneles abiertos
- `⌘+Enter` / `Ctrl+Enter`: Guardar tarea o formulario
- `⌘S` / `Ctrl+S`: Guardar cambios (en Configuración)
</details>

---

## Ecosistema de Herramientas Gripm

El ecosistema Gripm está compuesto por dos herramientas desacopladas e independientes diseñadas para complementarse:

- **Gripm Board (`@gripm/board`, este paquete):** La interfaz visual web, el CLI local, el motor de persistencia Markdown/JSON y el servidor MCP nativo. Totalmente autónomo; no requiere Gripm Playbook.
- **[Gripm Playbook](https://github.com/pablojavierrodriguez/gripm-playbook) (`@gripm/playbook`):** Marco de gobernanza ágil determinista para agentes de IA (roles: `pm-orchestrator`, `principal-engineer`, `qa-auditor`, `product-designer` y motor ejecutable de auditoría estática de UX). Puede utilizarse con Jira, Linear, Gripm Board o sin tablero visual.

Para equipar tu repositorio con los roles de Playbook usando Gripm Board, ejecuta `gripm playbook sync`.

---

<details>
<summary><strong>Contribuir y Desarrollo del Núcleo</strong></summary>

Gripm utiliza Gripm Board para gestionar su propio desarrollo; cada modificación de código se asocia a una tarea en `backlog/tasks/`.

```bash
git clone https://github.com/pablojavierrodriguez/gripm.git
cd gripm
npm install
npm run dev
```

Suite de verificación de calidad:
```bash
npm run lint          # Tipado estricto con TypeScript (tsc --noEmit)
npm test              # Suite unificada de pruebas headless (18 pasos secuenciales)
npm run backlog:check # Verificación de coherencia del backlog y tareas
npm run build         # Bundle de assets con Vite y empaquetado de binarios
```

Guías del proyecto:
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Pirámide de verificación, estándares de código y convenciones de ramas.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Contributor Covenant v2.1.
- **[SECURITY.md](SECURITY.md)** - Política de reporte responsable de vulnerabilidades.
- **[CHANGELOG.md](CHANGELOG.md)** - Historial de versiones generado desde releases.
- **[AGENTS.md](AGENTS.md)** - Guía operativa para desarrolladores y agentes autónomos.
</details>

---

## Licencia

MIT © 2026 Contribuidores de gripm
