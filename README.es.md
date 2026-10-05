<p align="center">
  <img src="docs/brand/gripm-logo.png" alt="gripm Logo" width="140" style="border-radius: 28px;" />
</p>

<h1 align="center">gripm ⚡</h1>

<p align="center">
  <strong>Tracción para ingeniería a velocidad de IA: Un tablero ágil de gestión de producto e ingeniería soberano y local-first para desarrolladores y pair programming con IA.</strong>
</p>

<p align="center">
  🌐 <strong><a href="README.md">English</a></strong> | <strong><a href="README.es.md">Español</a></strong>
</p>

<p align="center">
  <a href="https://github.com/pablojavierrodriguez/gripm-playbook"><img src="https://img.shields.io/badge/Metodolog%C3%ADa-gripm%20Playbook-purple.svg" alt="Metodología: gripm Playbook" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Licencia-MIT-blue.svg" alt="Licencia: MIT" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Protocolo%20Listo-6366f1.svg" alt="Protocolo MCP: 2024-11-05" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D22.6.0-339933.svg?logo=nodedotjs&logoColor=white" alt="Node.js: >=22.6.0" /></a>
</p>

**gripm** (*"grip-em"*) es un tablero autónomo de gestión de producto e ingeniería ágil diseñado para eliminar la fricción de gestionar tareas, deuda técnica, backlogs de sprint y releases directamente junto a tu código fuente. Provee el agarre (**grip**) y la firme tracción necesarios para guiar agentes de IA (Cursor, Claude Code, Copilot, Antigravity) con especificaciones estructuradas, criterios de aceptación verificables y empaquetado de releases soberano y local-first.

Construido con **React 18**, **Vite**, **TypeScript** y **Tailwind CSS**. Diseñado para operacionalizar la metodología [**Agentic Team Playbook**](docs/AGENTIC_PLAYBOOK.md).

---

## 💡 ¿Por qué gripm?

### El Problema
Al gestionar bases de código, el seguimiento de tareas suele comenzar como archivos Markdown estáticos (`BACKLOG.md`, `TODO.md`). Con el tiempo, se convierten en cementerios desestructurados de sólo escritura: difíciles de priorizar entre sprints, imposibles de filtrar interactivamente y dolorosos de reconciliar al redactar notas de release.

Las herramientas de gestión en la nube (Jira, Trello, Asana) caen en el extremo opuesto: tiempos de carga lentos, sobrecarga corporativa, desconexión de los commits de Git y la obligación de almacenar arquitectura privada, deuda técnica y fallos de seguridad en servidores de terceros.

### Ventajas de gripm frente a Herramientas en la Nube

| Factor | Herramientas Cloud (Jira, Trello, Asana) | gripm ⚡ |
| :--- | :--- | :--- |
| **Privacidad de Datos** | Alojado en la nube. Roadmaps y vulnerabilidades en servidores remotos. | **100% Soberano y Local-First**. Cero telemetría, cero fugas. Almacenado en tu repo local. |
| **Alineación con Git** | Desconectado del código; requiere sincronización manual o webhooks frágiles. | **Versionado junto a tu código**. Comitea estados de tareas junto a pull requests y ramas. |
| **Velocidad y Peso** | Bundles pesados, segundos de carga, spinners constantes. | **Arranque instantáneo en <200ms**. Cero sobrecarga, corre localmente en un único puerto. |
| **Foco del Flujo** | Sobrecargado de formularios corporativos, permisos y ruido de notificaciones. | **Enfocado en flujos de desarrollo**: Ideas → Sprint → Plan → Release. |
| **Pair-Programming con IA** | Campos de texto genéricos sin contexto estructurado para agentes de código. | **Puente Nativo para IA**: Plan Guard, Servidor MCP sobre stdio y prompts listos para agentes. |

---

## 🗄️ Motor Dual de Almacenamiento Flexible

gripm te otorga control explícito sobre cómo se almacena cada proyecto en disco, con **cero dependencias externas**:

### 1. Markdown Distribuido (`backlog-md`)
- **Formato**: `backlog/tasks/<CODIGO> - <Titulo>.md` con frontmatter YAML limpio y secciones delimitadas (`<!-- AC:BEGIN -->`, `<!-- SECTION:PLAN:BEGIN -->`).
- **Por qué usarlo**: Ideal para equipos o flujos multi-agente. Al ser cada tarea un archivo independiente, ramas concurrentes de Git y agentes de IA pueden crear, actualizar y resolver tareas con **cero conflictos de fusión (merge conflicts)**.

### 2. Archivo Único JSON (`json`)
- **Formato**: `.gripm/backlog.json`
- **Por qué usarlo**: Ideal si prefieres una huella compacta en un solo archivo sin crear archivos individuales de tareas en tu repositorio.

### 🔄 Conversión Bidireccional en 1 Clic
Desde la configuración del proyecto en gripm, puedes convertir entre motores de almacenamiento en cualquier momento sin pérdida de datos:
- **"Pasar a archivos .md individuales"**: Toma `.gripm/backlog.json` y lo divide en `backlog/tasks/*.md`.
- **"Unificar en un solo archivo JSON"**: Toma `backlog/tasks/*.md` y compacta todo en `.gripm/backlog.json`.

### 💾 Exportación y Descargas
- **Reporte Documental (`BACKLOG.md`)**: Exporta un resumen consolidado en Markdown de tu tablero o sprint activo para PRs, issues o documentación.
- **Copia de Seguridad Completa (`backlog.json`)**: Exporta todos los datos del proyecto (tareas, criterios de aceptación, planes técnicos, releases) para archivo offline o migración.

---

## 📐 Metodología: Agentic Team Playbook

gripm está diseñado desde sus cimientos para operacionalizar el [**Agentic Team Playbook**](docs/AGENTIC_PLAYBOOK.md), un marco de ingeniería riguroso para equipos que colaboran con agentes de IA (Antigravity, Cursor, Claude Code, GitHub Copilot).

Reemplaza el caos del *"vibe coding"* con salvaguardas estrictas y transparentes:
- **Fase 1: Contexto y Anclaje** — Ningún agente modifica código sin anclarse a una tarea atómica en `backlog/tasks/`.
- **Fase 2: Plan Guard** — Arquitectura explícita y plan de implementación paso a paso antes de escribir código.
- **Fase 3: Ejecución Atómica Incremental** — Seguimiento interactivo con casillas (`- [x]`) y estricto aislamiento de alcance.
- **Fase 4: Gates Automatizados de Verificación** — Hooks pre-commit (`.githooks/pre-commit`) previenen desincronizaciones entre código y backlog.
- **Fase 5: Release Hub y Trazabilidad** — Versionado histórico, compilación automática de changelogs y cero conflictos de Git.

👉 Consulta la metodología completa en [**docs/AGENTIC_PLAYBOOK.md**](docs/AGENTIC_PLAYBOOK.md).

> **Tip Pro:** Mantén las skills y reglas de agentes de tu proyecto sincronizadas con el estándar oficial ejecutando `npx gripm playbook sync` (o `npm run playbook:sync`).

---

## 🎯 Elige tu Camino: ¿Para Quién es gripm?

gripm atiende a dos perfiles principales. Elige el camino según tu objetivo:

| 👤 Perfil 1: Usuario de Producto / Desarrollador de Aplicaciones | 🛠️ Perfil 2: Contribuidor y Desarrollador del Core |
| :--- | :--- |
| **"Quiero gestionar tareas y usar IA en mi proyecto existente"** | **"Quiero modificar el código de gripm, personalizarlo o hacer un fork"** |
| ✅ Cero necesidad de clonar el repositorio de gripm | ✅ Clona o bifurca el repositorio de gripm |
| ✅ Configuración guiada en 1 minuto vía CLI (`gripm --init`) | ✅ Modifica componentes React, Tailwind y código TypeScript |
| ✅ Tablero web local + integración de IA en Cursor / Claude / Antigravity | ✅ Ejecuta servidor Vite con Hot Module Reload (`npm run dev`) |
| ⏩ **[Ir a Guía de Onboarding e Inicio Rápido](#-guía-de-onboarding-e-inicio-rápido-perfil-1)** | ⏩ **[Ir a Guía para Desarrolladores y Contribuidores](#-guía-para-desarrolladores-y-contribuidores-perfil-2)** |

---

## 🚀 Guía de Onboarding e Inicio Rápido (Perfil 1)
*Usa gripm en cualquier repositorio sin clonar ni modificar el código fuente de gripm.*

### Paso 1: Instalación Global (Recomendado, sólo una vez en tu equipo)
Instala el CLI desde npm:
```bash
npm install -g @gripm/board
# o directamente desde GitHub: npm install -g github:pablojavierrodriguez/gripm
```
*(O ejecútalo bajo demanda con zero install: `npx @gripm/board`)*

### Paso 2: Inicializa tu Repositorio (Configuración guiada en 1 minuto)
Abre un terminal en la raíz de tu proyecto (ej: `mi-app`) y ejecuta:
```bash
gripm --init
```
*(O vía npx: `npx @gripm/board --init`)*

El asistente interactivo en español te guiará a través de 5 decisiones:
1. **Modo de Instanciación**: Elige **Mono-Proyecto** (aislado y autocontenido para este repo) o **Multi-Proyecto Hub** (registrado en el Hub global `~/.gripm/registry.json`).
2. **Skill para Agentes de IA**: Instala `.agents/skills/gripm/SKILL.md` para que Cursor, Antigravity y Claude Code conozcan las herramientas MCP.
3. **Guía de Gobernanza (AGENTS.md)**: Genera `AGENTS.md` con reglas de dogfooding, salvaguardas pre-commit y flujos de trabajo con agentes.
4. **Scripts en package.json**: Agrega scripts inteligentes `"board"` y `"mcp"` con fallback automático a npm (`gripm 2>/dev/null || npx -y @gripm/board`).
5. **Reglas para Git**: Añade exclusiones recomendadas (`.gripm/update-cache.json`, etc.) a tu `.gitignore`.

*Modo no interactivo para integración continua (CI) o scripts:*
```bash
gripm --init -y
```

### Desacoplar gripm de un repositorio

Si querés quitar gripm de un proyecto, el comando `uninstall` lo hace
seleccionando el alcance, y **nunca borra tu backlog**:

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

- 🔒 `backlog/` y `BACKLOG.md` **no se tocan nunca**, en ningún modo ni flag. No es
  una precaución en el código: la lista de rutas eliminables es explícita y el
  backlog no está en ella.
- 🔒 Un script propio tuyo llamado `board` se preserva. Sólo se revierten los
  scripts que gripm inyectó.
- 🔒 En la purga global te avisa cuántos proyectos registrados se van a
  desregistrar y pide confirmación.

### Paso 3: Uso Diario — Abrir tu Tablero
Cada vez que vayas a trabajar en tu proyecto, ejecuta:
```bash
gripm
```
*(O `npm run board` si configuraste los scripts durante la inicialización).*  
*gripm iniciará el tablero visual en tu navegador predeterminado en `http://localhost:4100` en menos de 200ms.*

### Paso 4 (Opcional): Conectar tu Agente de IA (Cursor / Claude / Antigravity)
Agrega gripm a la configuración MCP de tu entorno (`.cursor/mcp.json`, Claude Desktop o Antigravity):

#### Opción A: Mediante npm run (Recomendado en el repositorio)
```json
{
  "mcpServers": {
    "gripm": {
      "command": "npm",
      "args": ["run", "mcp"]
    }
  }
}
```

#### Opción B: Mediante binario global
```json
{
  "mcpServers": {
    "gripm": {
      "command": "gripm-mcp"
    }
  }
}
```

*Tu agente de IA detectará automáticamente `backlog/tasks/` en tu repositorio y gestionará tareas a través de 12 herramientas dedicadas.*

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
*Abre `http://localhost:4100`. Los hooks de pre-commit se configuran automáticamente mediante `npm install`.*

### 2. Enlace Local de Desarrollo (`npm link`)
Para usar tu fork local de forma global en otros proyectos de tu máquina:
```bash
npm link
```
*Ahora los comandos `gripm` y `gripm-mcp` ejecutarán directamente tu versión local.*

### 3. Modos y Banderas Avanzadas del CLI
- `--single` / `--mono`: Fuerza el modo mono-proyecto aislado (bloquea el contexto a la carpeta actual e ignora otros repositorios).
- `--hub`: Fuerza el modo hub multi-proyecto (carga y gestiona todos los proyectos registrados en `~/.gripm/registry.json`).
- `--port <número>`: Especifica un puerto personalizado (ej: `gripm --port 4200`).
- `--repo <ruta>`: Apunta a una ruta de repositorio explícita en lugar de la carpeta actual.
- `--no-open`: Inicia el servidor sin abrir el navegador automáticamente.

**Silenciar Verificación de Actualizaciones:**
Al igual que Supabase CLI, gripm consulta lanzamientos de GitHub Releases una vez cada 24 horas en segundo plano. Para deshabilitarlo:
```bash
GRIPM_NO_UPDATE_CHECK=1 gripm
```

---

## 🤖 Herramientas del Servidor MCP (12 Tools)

gripm incluye un servidor MCP autónomo sobre `stdio` (`bin/gripm-mcp.js`):

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
| `gripm_create_retro` | Genera un archivo estructurado de retrospectiva para un sprint finalizado. | `projectId`, `sprintId`, `sprintName`, `whatWentWell`, `whatWentWrong`, `whatToImprove` |
| `gripm_list_retros` | Lista retrospectivas históricas registradas en `backlog/retros/`. | `projectId` |

---

## 🔒 Privacidad y Estrategias Git: Repositorios Públicos vs Privados

gripm es **100% soberano y local-first**: tus datos nunca se envían a servidores externos ni plataformas de telemetría. Al residir los datos directamente en tu disco como archivos, puedes elegir la estrategia adecuada según la visibilidad de tu repositorio:

### ⚠️ Principio Crítico de Git en Repositorios Públicos
En repositorios públicos de Git (ej: GitHub, GitLab), **todas las ramas y commits enviados (`git push`) son públicos para el mundo**, no únicamente la rama `main`. ¡Comitear un roadmap confidencial a una rama `dev` o `feature` lo expone públicamente!

### Estrategias Recomendadas

#### Estrategia 1: "Backlog as Code" (Recomendada para Repos Privados u Open-Source Público)
- **Archivos**: Comitea `backlog/tasks/*.md` (o `.gripm/backlog.json`) directamente en Git.
- **Beneficios**: Tareas, criterios de aceptación y planes viajan en las mismas Pull Requests que el código implementado. Auditoría completa en el historial de Git.
- **Cuándo usarla**: El repositorio es privado dentro de tu organización, O es un proyecto de código abierto con un roadmap deliberadamente público.

#### Estrategia 2: Backlog Soberano Local mediante `.gitignore` (Recomendada para Repos Públicos con Roadmap Interno)
- **Configuración**: Añade las carpetas de gripm a tu `.gitignore`:
  ```gitignore
  # Ignorar backlog interno de gripm en repositorios públicos
  .gripm/
  backlog/
  ```
- **Beneficios**: Disfrutas de todo el tablero visual, gestión de sprints y MCP localmente, sin que detalles de negocio, deuda técnica o vulnerabilidades sin parchear se suban a GitHub.
- **Cuándo usarla**: Trabajas en repositorios públicos o de clientes donde el seguimiento de tareas debe permanecer estrictamente confidencial.

#### Estrategia 3: Repositorio Dedicado de Backlog Privado
- Mantén el repositorio público limpio de tareas y gestiona un repositorio privado independiente (ej: `mi-proyecto-backlog`).
- Apunta gripm o el MCP a ese directorio:
  ```bash
  gripm-mcp --repo /ruta/a/mi-proyecto-backlog
  ```

---

## 📜 Política de Backlog Histórico y Cero Pérdida de Datos

En gripm, **ninguna tarea, fix o decisión arquitectónica debe desaparecer jamás sin dejar rastro en Git**:

1. **Inmutabilidad de Tareas Resueltas (`done` / `released`)**:
   - Las tareas completadas **nunca se eliminan**. Permanecen indefinidamente en `backlog/tasks/*.md` (o `.gripm/backlog.json`) como documentación viva para desarrolladores y agentes de IA futuros.
   - Al cerrar un release, las tareas se consolidan en notas de versión (`CHANGELOG.md`), vinculando commits de código con IDs de tarea (`DEV-001`, `DEV-014`).

2. **Archivado Suave No Destructivo (`backlog/archive/`)**:
   - Cuando una tarea se descarta, cancela o reemplaza, gripm **nunca realiza un borrado destructivo de disco**.
   - En su lugar, el archivo se traslada a `backlog/archive/<ID> - <Titulo>.md` con estado `dismissed`. Al comitearse a Git, la justificación de por qué se descartó la solución queda preservada para siempre.

3. **Aislamiento Estricto de Fixtures de Prueba**:
   - Las suites de tests automatizados operan sobre carpetas temporales aisladas (`data/test-repo-*`), garantizando que datos sintéticos de prueba nunca contaminen el backlog de producción.

---

## 🛠️ Comandos de Verificación e Integridad

gripm incluye salvaguardas integradas para garantizar cero desincronización entre código fuente, criterios de aceptación y documentación:

```bash
# Audita coherencia entre código, criterios tildados y estados de tareas
npm run backlog:check

# Auto-reconcilia tareas completadas y actualiza el BACKLOG.md consolidado
npm run backlog:sync

# Auditoría estática de UX y rendimiento (zero CLS, saltos de layout, touch targets)
npm run audit:ux

# Valida tipado estricto TypeScript, bundle Vite y empaqueta binarios standalone
npm run build
```

---

## ✨ Resumen de Características (v1.0.2)

- **🌐 Internacionalización Integral Bilingüe (i18n)**: Selector de idioma en asistente CLI (`--init`), cobertura total de diccionarios en todas las vistas y modales del Tablero UI y plantillas bilingües (`DEV-114`).
- **🚀 Apertura Automática del Navegador**: `npm run dev` y `npm run board` abren el tablero automáticamente en el navegador predeterminado del sistema con soporte para `--no-open` (`DEV-145`).
- **☀️ Paridad Total de Light Mode**: Transición fluida de temas sin jank ni parpadeos y coherencia visual absoluta entre temas claro y oscuro (`DEV-124`).
- **🧹 Desinstalación y Eject Seguro por CLI**: `gripm --uninstall` con preservación garantizada del backlog y scripts de usuario (`DEV-115`).
- **🔌 Detección Multi-Stack de Puertos Libres y Aislamiento**: Detección dinámica y sin colisiones de puertos libres en entornos multi-proyecto (`DEV-116`).
- **🔒 Pre-Commit Hook No Mutador**: Verificación estricta del backlog que audita sin mutar el índice de Git, preservando staging selectivo (`DEV-125`).
- **🪟 Overlays y Modales Montados en Portal**: Portals montados sobre `document.body` para modales y menús contextuales, eliminando problemas de stacking context y containing block (`DEV-129`, `DEV-130`).
- **🎨 Ergonomía de ItemModal**: Placeholders dinámicos de criterios de aceptación por tipo, tipografía homogénea y eliminación del flash de hidratación (`DEV-126`).
- **🛠️ Tooling Open Source y CI/CD**: Pipeline de GitHub Actions CI, templates comunitarios de issues/PRs, Prettier, EditorConfig y Node engines (`DEV-121`, `DEV-122`, `DEV-123`, `DEV-140`, `DEV-141`).
- **📐 Gobernanza Canónica de Sprint vs Release**: Paquetes de versión organizados estrictamente por valor entregado y timeboxing ágil sin ataduras bidireccionales artificiales (`DEV-146`).
- **⚡ Resiliencia Zero-Install y Scaffolding**: Hook `prepare` resiliente en `package.json` y scripts generados con fallback automático (`gripm 2>/dev/null || npx -y github:pablojavierrodriguez/gripm`), garantizando cero abortos en `npx` y ejecución inmediata de `npm run board` sin requerir instalaciones globales (`DEV-112`, `DEV-113`).
- **📦 Distribución Global por CLI y Empaquetado**: Binarios ejecutables nativos `gripm` y `gripm-mcp` con resolución absoluta de rutas en Tailwind CSS y bundler Vite (`DEV-108`, `DEV-144`).
- **🔒 Modo Mono-Proyecto Aislado y Hub Multi-Proyecto**: Aislamiento estricto de repositorios (`--single`) para impedir fugas de datos entre proyectos, junto con gestión centralizada (`--hub`) bajo el estándar XDG (`~/.gripm/registry.json`) (`DEV-104`, `DEV-105`).
- **🧙 Asistente Interactivo de Inicialización (`gripm --init`)**: Asistente guiado de onboarding interactivo mediante readline nativo con soporte de modo silencioso `--yes`/`-y`, configuración personalizada de skills de IA, reglas `AGENTS.md`, scripts y exclusiones Git (`DEV-109`).
- **🔔 Notificador Silencioso de Actualizaciones**: Verificador no intrusivo inspirado en Supabase CLI con caché local de 24 horas y opt-out mediante `GRIPM_NO_UPDATE_CHECK=1` (`DEV-107`).
- **🏷️ Etiquetas y Asignados Interactivos en ItemModal**: Editor interactivo de tags con adición/eliminación por teclado y selector visual de asignados en el modal de detalle (`DEV-111`).
- **📋 Compatibilidad Canónica con Motor Backlog.md**: Preservación estricta de mayúsculas/minúsculas en IDs, actualizaciones atómicas en el archivo, mapeo canónico de sprints y conservación de `itemCodes` en releases (`DEV-103`).
- **🛡️ Auditoría Automatizada Pre-Release**: Verificador de integridad en `verify-backlog-sync.js` que impide documentación desfasada o tareas huérfanas antes de sellar versiones (`DEV-102`, `DEV-110`).
- **🎨 Estética Linear y Raycast**: Glassmorphism refinado, paleta semántica oscura, alternancia con modo claro y estabilidad de layout sin saltos (zero CLS: `overflow-y: scroll`, `scrollbar-gutter: stable`).
- **🔄 Metodologías Ágiles Duales (Kanban vs Scrumban)**: 
  - **Kanban**: Flujo continuo de entrega de valor sobre todas las tareas sin empaquetado artificial.
  - **Scrumban**: Tablero enfocado en el **Sprint Goal** activo con seguimiento visual de progreso (% completado, tareas en curso, indicador de cumplimiento de objetivo).
- **🎛️ Modos Dinámicos de Columnas**:
  - **Modo Simple (3 columnas)**: Optimizado para velocidad y claridad (*Draft*, *Doing*, *Done*).
  - **Modo Ampliado (5 columnas)**: Ciclo completo de calidad (*Draft*, *Doing*, *Review*, *Ready*, *Done*).
  - **Columna de Descubrimiento (Ideas)**: Canal toggleable dedicado a ideas preliminares sin causar saltos de layout.
- **🎯 Hub de Sprints y Priorización**: Ciclo de vida completo de sprints (planificación, desarrollo activo, cierre con generación automática de retrospectivas), tablas de datos densas, grupos colapsables y ordenamiento natural.
- **🌳 Relaciones Jerárquicas y Grafo de Épicas**: Relaciones padre-hijo, subtareas y grafos de dependencia.
- **🧪 Soporte Nativo BDD**: Especificación Given/When/Then de primera clase en historias de usuario y criterios de aceptación.
- **🗑️ Papelera Directa y Ciclo Seguro**: Vista de primer nivel (`TrashView`) con soft-delete, restauración en un clic o purgado permanente, desacoplada de tareas descartadas.
- **🔔 Diálogos Contextuales y Accesibles**: Componente `ConfirmModal` de nivel profesional para acciones destructivas y promoción de releases a producción.
- **⚙️ Configuración Dedicada de Proyecto (`SettingsView`)**: Configuración persistente guardada en `.gripm/config.json` (metodología, taxonomía de tipos personalizados, columnas, límites WIP y preferencias de tema).
- **🚀 Gestión Soberana de Releases**: Seguimiento estricto entre versiones en preparación (*unreleased*) y desplegadas a producción (*released*), con compilación automatizada de changelogs y ortogonalidad absoluta entre sprints y releases.
- **🛡️ Plan Guard**: Asegura que cualquier tarea que pase a `doing` cuente con criterios de aceptación documentados y plan de implementación antes de codificar.
- **📂 Explorador de Archivos Multiplataforma**: Selector visual de carpetas (`FolderPickerModal`) para macOS, Linux y Windows con detección automática de repositorios.
- **🤖 Puente MCP Autónomo**: 12 herramientas dedicadas para agentes de IA con filtros de mínimo consumo de tokens, actualizaciones atómicas por lotes, generadores de retrospectivas y sincronización en vivo.

---

## 🐶 Dogfooding ("Git Building Git")

gripm se construye utilizando gripm para gestionar su propio desarrollo.

Este repositorio contiene una carpeta [`backlog/tasks/`](backlog/tasks/) gestionada en modo `backlog-md`, registrando funcionalidades reales, pulido de UX y releases a lo largo de **180+ tareas** (`DEV-001` a `DEV-185`), 9 sprints y 10 releases formales (`v0.2.0` a `v1.0.2`).

---

## ⌨️ Atajos de Teclado

- `N`: Crear nueva tarea en el backlog
- `⌘K` / `Ctrl+K`: Enfocar barra de búsqueda instantánea
- `1` - `5`: Cambiar de pestaña (`1`: Tablero Kanban, `2`: Sprint y Priorización, `3`: Releases, `4`: Papelera, `5`: Configuración)
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
contribución del repositorio es simplemente otra tarea trackeada.

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — requisitos de entorno, instalación, la
  pirámide de verificación de tres pasos (`tsc`, `npm test`, `backlog:check`),
  convenciones de ramas y cómo trackear tu contribución con las herramientas MCP.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — Contributor Covenant v2.1.
- **[SECURITY.md](SECURITY.md)** — cómo reportar una vulnerabilidad de forma
  privada.
- **[CHANGELOG.md](CHANGELOG.md)** — historial de versiones, generado a partir de
  `backlog/releases.json`.

¿Trabajás con un agente de IA? Levantá el servidor MCP y dejá que conduzca el
backlog:

```bash
npx -p @gripm/board gripm-mcp
# o con instalación global:
# gripm mcp
```

El ciclo de vida de tareas que sigue todo cambio está documentado en
[AGENTS.md](AGENTS.md).

---

## 📄 Licencia

MIT © 2026 Contribuidores de gripm
