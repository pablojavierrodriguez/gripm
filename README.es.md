<p align="center">
  <img src="docs/brand/gripm-logo-lockup.png" alt="Logo de gripm en su marco oscuro" width="140" />
</p>

<h1 align="center">gripm ⚡</h1>

<p align="center">
  <strong>Un espacio local-first para gestionar el trabajo de producto e ingeniería, planificar iteraciones y colaborar con agentes de IA.</strong>
</p>

<p align="center">
  🌐 <strong><a href="README.md">English</a></strong> | <strong><a href="README.es.md">Español</a></strong>
</p>

<p align="center">
  <a href="https://github.com/pablojavierrodriguez/gripm-playbook"><img src="https://img.shields.io/badge/Metodolog%C3%ADa-gripm%20Playbook-purple.svg" alt="Metodología: gripm Playbook" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Licencia-MIT-blue.svg" alt="Licencia: MIT" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Protocolo%20Listo-6366f1.svg" alt="Protocolo MCP: 2024-11-05" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D22.6.0-339933.svg?logo=nodedotjs&logoColor=white" alt="Node.js: >=22.6.0" /></a>
  <a href="#capturas-de-pantalla"><img src="https://img.shields.io/badge/Demo-Capturas%20del%20producto-6366f1.svg" alt="Ver capturas de demostración" /></a>
</p>

<p align="center">
  <a href="#capturas-de-pantalla"><img src="docs/screenshots/01-kanban-dark.png" alt="Tablero Kanban de Gripm en modo oscuro con tareas de demostración" width="100%" /></a>
</p>

> **Tu hoja de ruta no debería vivir en servidores ajenos.** Gripm mantiene el trabajo de producto e ingeniería junto a tu código: local-first, versionable con Git y preparado para agentes de IA.

**gripm** (*"grip-em"*) es un espacio local para gestionar listas de trabajo de producto e ingeniería, planificar iteraciones y preparar versiones. Da a los agentes de IA (Cursor, Claude Code, Copilot, Antigravity) especificaciones estructuradas y criterios de aceptación verificables sin trasladar tu hoja de ruta a servicios de terceros.

Construido con **React 18**, **Vite**, **TypeScript** y **Tailwind CSS**. Gripm Board puede usarse por separado o junto con el producto independiente Gripm Playbook.

> **Historial de marca:** v1.0.0 fue la última versión bajo el nombre DevBoard. Desde v1.0.1, las versiones se publican con la marca Gripm. Los datos de proyectos existentes se siguen detectando y migrando; el cambio de marca no los renombra ni elimina.

## 🧭 Qué es cada producto y qué comando usar

**Gripm** es el ecosistema y tiene dos productos independientes:

| Producto | Qué hace | Paquete / acceso |
| :--- | :--- | :--- |
| **Gripm Board** | Gestiona el backlog del proyecto con una interfaz web local y un CLI. | `@gripm/board` → `gripm` |
| **Gripm Playbook** | Proporciona metodología y skills para trabajar con agentes; puede usarse sin Board. | Paquete independiente: `@gripm/playbook` ([repositorio](https://github.com/pablojavierrodriguez/gripm-playbook)) |

**MCP es una interfaz para Board, no un tercer producto ni un paquete separado.** Permite que un agente lea y actualice el mismo backlog sin abrir la interfaz web. Una vez configurado, el cliente de IA inicia el proceso MCP por `stdio` cuando se conecta.

Elige el comando según lo que quieras hacer:

| Objetivo | Comando | Efecto |
| :--- | :--- | :--- |
| Instalar Board y sus comandos (una vez por equipo) | `npm install -g @gripm/board` | Instala `gripm` y `gripm-mcp`; no instala Playbook |
| Usar Board sin instalación global | `npx @gripm/board --repo <ruta>` | Abre el tablero para el proyecto indicado |
| Preparar un proyecto para Board | Desde su carpeta: `gripm --init` | Configura el proyecto; no instala otro producto |
| Abrir el tablero | Desde el proyecto: `gripm` | Abre Board en el navegador |
| Conectar un agente al backlog | Configura `gripm-mcp --repo <ruta>` en tu cliente de IA | El cliente inicia el proceso MCP por `stdio`; si omites `--repo`, se usa el directorio de trabajo que le indique el cliente |
| Actualizar materiales del Playbook en un proyecto | `gripm playbook sync --repo <ruta>` | Sincroniza archivos/skills; no instala ni actualiza el paquete Playbook |
| Usar solo Playbook | Sigue las instrucciones de su [repositorio y paquete](https://github.com/pablojavierrodriguez/gripm-playbook) | No requiere instalar Board |

**Gripm Suite todavía no tiene paquete ni instalador.** Si quieres ambos productos, instala/configura Board y Playbook por separado. `gripm --help` muestra los comandos del CLI; los subcomandos desconocidos se rechazan en vez de abrir el tablero por accidente.

## 🖼️ Capturas de pantalla

Explora el tablero local-first, la planificación por iteraciones y las notas de versión con un proyecto de demostración limpio:

| Kanban — Modo oscuro | Kanban — Modo claro |
| :---: | :---: |
| <img src="docs/screenshots/01-kanban-dark.png" alt="Tablero Kanban de Gripm en modo oscuro" width="100%" /> | <img src="docs/screenshots/02-kanban-light.png" alt="Tablero Kanban de Gripm en modo claro" width="100%" /> |
| Iteraciones y backlog | Notas de versión |
| <img src="docs/screenshots/03-backlog-sprints.png" alt="Vista de planificación de iteraciones y backlog; la interfaz demo muestra la etiqueta Sprint" width="100%" /> | <img src="docs/screenshots/04-release-changelog.png" alt="Generador de notas de versión" width="100%" /> |

---

## 💡 ¿Por qué gripm?

### El Problema
Al gestionar bases de código, el seguimiento suele comenzar con archivos Markdown estáticos (`BACKLOG.md`, `TODO.md`). A medida que crece el trabajo, puede hacer falta priorizarlo mejor, filtrarlo de forma interactiva y reunir con claridad las notas de cada versión.

Las herramientas de gestión en la nube suelen centralizar los datos en servicios de sus proveedores y ofrecen funciones de colaboración amplias. Para algunos equipos, un backlog local y versionado junto al código puede ser una alternativa más directa y mantener esos datos bajo su propio control.

### Ventajas de gripm frente a Herramientas en la Nube

| Factor | Servicios de gestión alojados | gripm ⚡ |
| :--- | :--- | :--- |
| **Datos** | Se alojan en la infraestructura del proveedor. | **Local-first**. El backlog se guarda en archivos locales bajo tu control; Gripm no lo carga a un servicio propio. El CLI puede consultar GitHub Releases para buscar actualizaciones. |
| **Git** | La relación con el código depende de las funciones e integraciones del servicio. | Puedes versionar tareas junto con el código y colaborar mediante Git. |
| **Acceso** | Se accede al servicio del proveedor, normalmente a través de la web. | El tablero se sirve desde tu equipo; no requiere un servicio de gestión alojado. |
| **Flujo de trabajo** | Ofrecen distintos flujos de gestión y colaboración. | Enfocado en backlogs de desarrollo: Ideas → Planificar → Construir → Entregar, con planificación opcional por iteraciones. |
| **Agentes de IA** | La integración depende de las funciones e integraciones disponibles. | Incluye un servidor MCP para que los agentes consulten y actualicen el backlog. |

---

## 🗄️ Motor Dual de Almacenamiento Flexible

gripm te permite elegir cómo almacenar cada proyecto en disco. No requiere una base de datos ni un servicio de almacenamiento externo:

### 1. Markdown Distribuido (`backlog-md`)
- **Formato**: `backlog/tasks/<CODIGO> - <Titulo>.md` con frontmatter YAML limpio y secciones delimitadas (`<!-- AC:BEGIN -->`, `<!-- SECTION:PLAN:BEGIN -->`).
- **Por qué usarlo**: Útil para equipos o flujos multi-agente. Los archivos de tarea independientes reducen la contención, aunque los cambios en archivos compartidos todavía pueden generar conflictos de Git.

### 2. Archivo Único JSON (`json`)
- **Formato**: `.gripm/backlog.json`
- **Por qué usarlo**: Ideal si prefieres una huella compacta en un solo archivo sin crear archivos individuales de tareas en tu repositorio.

### 🔄 Conversión Bidireccional
Desde la configuración del proyecto puedes convertir entre motores de almacenamiento. Haz una copia de seguridad antes de cambiar el formato:
- **"Pasar a archivos .md individuales"**: Toma `.gripm/backlog.json` y lo divide en `backlog/tasks/*.md`.
- **"Unificar en un solo archivo JSON"**: Toma `backlog/tasks/*.md` y compacta todo en `.gripm/backlog.json`.

### 💾 Exportación y Descargas
- **Reporte Documental (`BACKLOG.md`)**: Exporta un resumen Markdown del tablero o de la iteración seleccionada para PRs, issues o documentación.
- **Copia de Seguridad Completa (`backlog.json`)**: Exporta los datos del proyecto (tareas, criterios de aceptación, planes técnicos y versiones) para archivo offline o migración.

---

## 📐 Trabajo con agentes de IA

Board proporciona a los agentes de código contexto estructurado del backlog y criterios de aceptación mediante MCP. Puede usarse por separado o junto con el producto independiente [**Gripm Playbook**](https://github.com/pablojavierrodriguez/gripm-playbook), que ofrece metodología y skills para agentes. Playbook es opcional; `gripm playbook sync` copia materiales seleccionados al proyecto, pero no instala el producto Playbook.

---

## 🎯 Elige tu Camino: ¿Para Quién es gripm?

gripm atiende a dos perfiles principales. Elige el camino según tu objetivo:

| 👤 Perfil 1: Usuario de Producto / Desarrollador de Aplicaciones | 🛠️ Perfil 2: Contribuidor y Desarrollador del Core |
| :--- | :--- |
| **"Quiero gestionar tareas y usar IA en mi proyecto existente"** | **"Quiero modificar el código de gripm, personalizarlo o hacer un fork"** |
| ✅ Cero necesidad de clonar el repositorio de gripm | ✅ Clona o bifurca el repositorio de gripm |
| ✅ Configuración guiada vía CLI (`gripm --init`) | ✅ Modifica componentes React, Tailwind y código TypeScript |
| ✅ Tablero web local + integración de IA en Cursor / Claude / Antigravity | ✅ Ejecuta servidor Vite con Hot Module Reload (`npm run dev`) |
| ⏩ **[Ir a Guía de Onboarding e Inicio Rápido](#-guía-de-onboarding-e-inicio-rápido-perfil-1)** | ⏩ **[Ir a Guía para Desarrolladores y Contribuidores](#-guía-para-desarrolladores-y-contribuidores-perfil-2)** |

---

## 🚀 Guía de Onboarding e Inicio Rápido (Perfil 1)
*Usa gripm en cualquier repositorio sin clonar ni modificar el código fuente de gripm.*

### Paso 1: Instala Gripm Board
Requiere Node.js 22.6.0 o posterior. Instala el CLI desde npm:
```bash
npm install -g @gripm/board
```
También puedes ejecutarlo bajo demanda con `npx @gripm/board`.

### Paso 2: Inicializa tu repositorio (opcional)
Abre un terminal en la raíz de tu proyecto (ej: `mi-app`) y ejecuta:
```bash
gripm --init
```
*(O vía npx: `npx @gripm/board --init`)*

El asistente puede configurar un espacio de un solo proyecto o un hub multiproyecto y, de manera opcional, agregar instrucciones para agentes, `AGENTS.md`, scripts de npm y exclusiones recomendadas en `.gitignore`. También puedes seleccionar opciones sin interacción con `--yes` / `-y`.

*Modo no interactivo para integración continua (CI) o scripts:*
```bash
gripm --init -y
```

### Desacoplar gripm de un repositorio

Para quitar gripm de un proyecto sin borrar los archivos del backlog, usa
`uninstall` y elige el alcance:

```bash
gripm --uninstall
```

| Flag | Efecto |
|---|---|
| `--uninstall`, `--clean` | Desacopla gripm de este repositorio |
| `--global` | Purga también el registro global del dispositivo (`~/.gripm/`) |
| `--remove-agents` | Elimina además `.agents/skills/` y `AGENTS.md` (por defecto se preservan) |
| `--yes`, `-y` | Sin preguntas: desacopla el proyecto actual (o purga global con `--global`) |

En modo interactivo ofrece dos alcances: **desacoplar sólo este proyecto** —limpia
`.gripm/`, revierte los scripts `board` y `mcp` del `package.json` y quita las
reglas que gripm agregó al `.gitignore`— o **erradicar de todas las instancias
locales**, que además limpia el registro central.

Tres garantías del diseño:

- 🔒 `backlog/` y `BACKLOG.md` se preservan al desinstalar, en cualquier modo y
  con cualquier flag. La lista de rutas eliminables es explícita y los excluye.
- 🔒 Un script propio tuyo llamado `board` se preserva. Sólo se revierten los
  scripts que gripm inyectó.
- 🔒 En la purga global te avisa cuántos proyectos registrados se van a
  desregistrar y pide confirmación.

### Paso 3: Uso Diario — Abrir tu Tablero
Cada vez que vayas a trabajar en tu proyecto, ejecuta:
```bash
gripm
```
El CLI abre el tablero en tu navegador predeterminado. El puerto inicial es `4100`, pero puede cambiar si ya está ocupado. Si al inicializar habilitaste el script opcional `board`, también puedes ejecutar `npm run board`.

### Paso 4 (Opcional): Conectar tu Agente de IA (Cursor / Claude / Antigravity)
Configura Gripm MCP en los ajustes de tu cliente de IA. El cliente inicia el proceso cuando se conecta; normalmente no necesitas abrirlo en una terminal aparte. Indica el proyecto con `--repo`:

```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp",
      "args": ["--repo", "/ruta/absoluta/a/mi-proyecto"]
    }
  }
}
```

El servidor usa el backlog del proyecto indicado. Si omites `--repo`, usará el directorio de trabajo que le proporcione el cliente MCP. Si no instalaste Board globalmente, configura el cliente para iniciarlo con `npx`:

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

Más abajo se listan las herramientas disponibles.

---

## 🛠️ Guía para Desarrolladores y Contribuidores (Perfil 2)
*Para desarrolladores que desean extender gripm, personalizar componentes visuales o contribuir al core.*

### 1. Clonar y Ejecutar el Entorno de Desarrollo
Clona el repositorio e inicia Vite con recarga rápida (HMR):
```bash
git clone https://github.com/pablojavierrodriguez/gripm.git
cd gripm
npm install
npm run dev
```
El servidor de desarrollo abre `http://localhost:4100` (o el puerto disponible que determine Vite). Los hooks de pre-commit se configuran mediante `npm install`.

### 2. Enlace Local de Desarrollo (`npm link`)
Para usar tu fork local de forma global en otros proyectos de tu máquina:
```bash
npm link
```
*Ahora los comandos `gripm` y `gripm-mcp` ejecutarán directamente tu versión local.*

### 3. Modos y Banderas Avanzadas del CLI
- `--hub`: Fuerza el modo hub multi-proyecto (carga y gestiona todos los proyectos registrados en `~/.gripm/registry.json`).
- `--port <número>`: Especifica un puerto personalizado (ej: `gripm --port 4200`).
- `--repo <ruta>`: Apunta a un proyecto explícito en lugar de la carpeta actual. Lo aceptan Board, MCP y `playbook sync`.
- `--no-open`: Inicia el servidor sin abrir el navegador automáticamente.

**Desactivar la búsqueda de actualizaciones:**
El CLI puede consultar GitHub Releases en segundo plano y guarda el resultado en una caché local durante 24 horas. Para desactivarlo:
```bash
GRIPM_NO_UPDATE_CHECK=1 gripm
```

En PowerShell:
```powershell
$env:GRIPM_NO_UPDATE_CHECK = "1"; gripm
```

---

## 🤖 Servidor MCP incluido en Board (12 herramientas)

El paquete `@gripm/board` incluye un servidor MCP sobre `stdio` (`bin/gripm-mcp.js`). Puede ejecutarse como proceso propio sin abrir la interfaz web, pero usa el motor de backlog de Board y no se publica como paquete separado:

| Herramienta | Propósito | Parámetros Clave |
| :--- | :--- | :--- |
| `gripm_list_projects` | Lista los proyectos registrados en el tablero y su motor de almacenamiento (`backlog-md` o `json`). | Ninguno |
| `gripm_get_stats` | Consulta métricas consolidadas (% completado, abiertas vs cerradas, agrupadas por prefijo). | `projectId` |
| `gripm_list_tasks` | Consulta de tareas con filtros de alta eficiencia de tokens (formato `compact` de 1 línea, `openOnly`, `prefix`). | `projectId`, `status`, `openOnly`, `prefix`, `taskIds`, `format`, `limit` |
| `gripm_get_task` | Obtiene el detalle completo de una tarea, sus criterios de aceptación y plan de implementación. | `taskId` (ej: `"DEV-001"`, `"TASK-010"`) |
| `gripm_create_task` | Registra una nueva tarea en el formato nativo del proyecto (`backlog/tasks/*.md` o JSON). | `title`, `description`, `type`, `priority`, `acceptanceCriteria` |
| `gripm_update_task` | Actualiza estado (`draft`, `doing`, `review`, `ready`, `done`), tilda criterios secuencialmente o define planes técnicos. | `taskId`, `status`, `toggleAcIndex`, `implementationPlan` |
| `gripm_bulk_update_tasks` | Actualización masiva de decenas de tareas en una sola llamada (por prefijo o lista de IDs). | `projectId`, `taskIds`, `filterPrefix`, `updates` |
| `gripm_list_releases` | Consulta versiones publicadas, notas de changelog y tareas asociadas. | `projectId`, `version` |
| `gripm_export_backlog` | Genera o actualiza el informe consolidado `BACKLOG.md`. | `projectId` |
| `gripm_sync_backlog` | Audita y reconcilia tareas completadas con criterios de aceptación y sincroniza `BACKLOG.md`. | `projectId`, `autoFix` |
| `gripm_create_retro` | Genera una retrospectiva estructurada al cerrar una iteración. | `projectId`, `sprintId`, `sprintName`, `whatWentWell`, `whatWentWrong`, `whatToImprove` |
| `gripm_list_retros` | Lista retrospectivas históricas registradas en `backlog/retros/`. | `projectId` |

---

## 🔒 Privacidad y Estrategias Git: Repositorios Públicos vs Privados

gripm es local-first: los datos del backlog se guardan en archivos locales bajo tu control y no se cargan a un servicio de Gripm. El CLI puede consultar GitHub Releases para buscar actualizaciones; la consulta se guarda en caché y puedes desactivarla con `GRIPM_NO_UPDATE_CHECK=1`. Elige una estrategia de Git según la visibilidad de tu repositorio:

### ⚠️ Principio Crítico de Git en Repositorios Públicos
En repositorios públicos de Git (ej: GitHub, GitLab), **todas las ramas y commits enviados (`git push`) son públicos para el mundo**, no únicamente la rama `main`. ¡Comitear un roadmap confidencial a una rama `dev` o `feature` lo expone públicamente!

### Estrategias Recomendadas

#### Estrategia 1: «Backlog como código» (para repositorios privados o proyectos open source con hoja de ruta pública)
- **Archivos**: Comitea `backlog/tasks/*.md` (o `.gripm/backlog.json`) directamente en Git.
- **Beneficios**: Tareas, criterios de aceptación y planes viajan en las mismas Pull Requests que el código implementado. Auditoría completa en el historial de Git.
- **Cuándo usarla**: El repositorio es privado dentro de tu organización o es un proyecto open source con una hoja de ruta deliberadamente pública.

#### Estrategia 2: Backlog local mediante `.gitignore` (para repositorios públicos con roadmap interno)
- **Configuración**: Añade las carpetas de gripm a tu `.gitignore`:
  ```gitignore
  # Ignorar backlog interno de gripm en repositorios públicos
  .gripm/
  backlog/
  ```
- `.gitignore` solo afecta archivos que Git todavía no tiene bajo seguimiento. Si ya los sigue, agregar estas reglas no los elimina del historial ni evita que se incluyan en commits posteriores.
- **Beneficios**: Puedes usar el tablero y MCP localmente sin subir los archivos ignorados del backlog a GitHub.
- **Cuándo usarla**: Trabajas en repositorios públicos o de clientes donde el seguimiento de tareas debe permanecer privado.

#### Estrategia 3: Repositorio Dedicado de Backlog Privado
- Mantén el repositorio público limpio de tareas y gestiona un repositorio privado independiente (ej: `mi-proyecto-backlog`).
- Apunta gripm o el MCP a ese directorio:
  ```bash
  gripm-mcp --repo /ruta/a/mi-proyecto-backlog
  ```

---

## 📜 Historial del backlog y Git

Gripm ofrece historial del proyecto y una papelera, que incluye acciones de purgado permanente. Si necesitas una auditoría en Git, mantén bajo seguimiento los archivos relevantes y guarda sus cambios en commits; el almacenamiento local por sí solo no es una copia de seguridad.

Las versiones también pueden resumirse en `CHANGELOG.md`. El historial de Git conserva únicamente los archivos y cambios que elijas enviar al repositorio.

---

## 🛠️ Comandos de Verificación e Integridad

gripm incluye verificaciones para detectar inconsistencias entre el backlog y su documentación consolidada:

```bash
# Audita coherencia entre código, criterios tildados y estados de tareas
npm run backlog:check

# Auto-reconcilia tareas completadas y actualiza el BACKLOG.md consolidado
npm run backlog:sync

# Auditoría estática de UX y rendimiento (zero CLS, saltos de layout y áreas táctiles)
npm run audit:ux

# Actualiza la línea base tras un cambio intencional para detectar solo
# regresiones nuevas, no observaciones cosméticas ya conocidas
npm run audit:ux:baseline

# Valida tipado estricto TypeScript, bundle Vite y empaqueta binarios standalone
npm run build
```

---

## ✨ Funcionalidades

- **Backlog de producto:** crea y organiza tareas con criterios de aceptación, etiquetas, prioridades y relaciones.
- **Dos formatos de almacenamiento:** usa tareas en archivos Markdown o un backlog JSON; la configuración del proyecto permite convertirlos.
- **Flujos flexibles:** trabaja con Kanban continuo o planifica por iteraciones; configura columnas, tipos de tarea y límites de trabajo en curso.
- **Versiones:** agrupa el trabajo por valor entregado y compila notas independientemente de la planificación por iteraciones.
- **Acceso para agentes de IA:** conecta el servidor MCP incluido para consultar y actualizar el mismo backlog de Board.
- **Configuración local:** inicializa Board con `gripm --init` y agrega opcionalmente instrucciones para agentes, scripts de npm y reglas de Git.
- **CLI multiplataforma:** abre el tablero local, selecciona proyectos, configura el puerto o inicia MCP sin abrir la interfaz web.

---

## 🐶 Dogfooding ("Git Building Git")

gripm utiliza Gripm Board para gestionar su propio desarrollo. El backlog del proyecto y su configuración están disponibles en [`backlog/tasks/`](backlog/tasks/) y `.gripm/`.

---

## ⌨️ Atajos de Teclado

- `N`: Crear nueva tarea en el backlog
- `⌘K` / `Ctrl+K`: Enfocar barra de búsqueda instantánea
- `1` - `5`: Cambiar de pestaña (`1`: Tablero Kanban, `2`: planificación —la pestaña se llama “Sprints y Backlog” en la interfaz—, `3`: Versiones, `4`: Papelera, `5`: Configuración)
- `Esc`: Cerrar modales activos
- `⌘+Enter`: Guardar tarea / formulario

---

## 🤝 Ecosistema e Interoperabilidad

gripm promueve flujos de desarrollo abiertos y soberanos sin ataduras propietarias. Su motor de almacenamiento en Markdown distribuido adopta la convención de archivos independientes (`backlog/tasks/*.md`) popularizada por estándares comunitarios como [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md).

Este diseño permite a los equipos de ingeniería combinar libremente herramientas CLI de terminal con el tablero visual de gripm y agentes de IA en el mismo repositorio, fomentando un ecosistema colaborativo, interoperable y basado en archivos.

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. gripm se dogfoodea a sí mismo: **cada cambio
de código se asocia a una tarea en `backlog/tasks/`**, y la propia guía de
contribución del repositorio es otra tarea versionada.

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — requisitos de entorno, instalación, la
  pirámide de verificación de tres pasos (`tsc`, `npm test`, `backlog:check`),
  convenciones de ramas y cómo registrar tu contribución con las herramientas MCP.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — Contributor Covenant v2.1.
- **[SECURITY.md](SECURITY.md)** — cómo reportar una vulnerabilidad de forma
  privada.
- **[CHANGELOG.md](CHANGELOG.md)** — historial de versiones, generado a partir de
  `backlog/releases.json`.

Para probar el servidor MCP desde una terminal, ejecuta el comando desde el
proyecto que quieres consultar:

```bash
npx -y -p @gripm/board gripm-mcp --repo .
# o con instalación global:
gripm mcp --repo .
```

Para el uso habitual, configura MCP en los ajustes del cliente de IA como se
indica en la guía de inicio; el cliente administra el proceso.

El ciclo de vida de tareas que sigue todo cambio está documentado en
[AGENTS.md](AGENTS.md).

---

## 📄 Licencia

MIT © 2026 Contribuidores de gripm
