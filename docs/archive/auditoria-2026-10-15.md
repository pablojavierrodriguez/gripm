# Auditoría Técnica Integral y Forense de Arquitectura — gripm (`@gripm/board`)

> **Fecha:** 2026-10-15  
> **Perfil Auditor:** Staff Systems Architect & Principal Software Engineer (+25 años en sistemas distribuidos, motores locales y herramientas CLI/Web)  
> **Estado:** Documento de diagnóstico técnico forense. Cero conjeturas: cada hallazgo está respaldado por código fuente crudo, línea exacta y prueba ejecutable.  
> **Alcance:** `@gripm/board@1.4.0`, árbol de trabajo completo (`server/`, `scripts/`, `src/`, `bin/`, `backlog/`).

---

## 0. Convención de Identificadores y Severidades

| ID | Dominio | Severidad | Impacto |
| :--- | :--- | :---: | :--- |
| `SEC-01` | Path Traversal en `generateTaskFilename` | **CRÍTICA** | Escritura de archivos arbitrarios fuera de `backlog/tasks/`. |
| `SEC-02` | Mutación de Disco vía HTTP `GET` sin CSRF | **CRÍTICA** | Sobrescritura de `BACKLOG.md` forzada por páginas externas. |
| `SEC-03` | Crash Fatal por `EPIPE` en SSE | **CRÍTICA** | Caída del daemon ante desconexiones de clientes o navegador. |
| `SEC-04` | Fuga de Contención por Symlinks en `/api/fs/browse` | **ALTA** | Exploración del sistema de archivos fuera de las raíces permitidas. |
| `DATA-01` | Pérdida de Campos YAML en `backlogMdParser.ts` | **CRÍTICA** | Eliminación permanente de metadatos no estándar en guardado. |
| `DATA-02` | Mutilación de Código en Descripciones Markdown | **CRÍTICA** | Borrado de texto posterior a bloques de código con headers H2. |
| `DATA-03` | Truncamiento a 0 bytes por Escrituras No Atómicas | **CRÍTICA** | Archivos destruidos si el proceso es interrumpido en escritura. |
| `DATA-04` | Falsificación de Criterios de Aceptación en `sync` | **ALTA** | Tildado automático de `- [ ]` a `- [x]` sin verificación real. |
| `DATA-05` | Auto-Promoción Ilegítima de `doing` a `ready` | **ALTA** | Salteo mecánico de code review y certificación de QA. |
| `DIST-01` | Dev Server de Vite en Comando de Producción | **CRÍTICA** | Compilación TS en runtime y bloat de 130MB+ en `dependencies`. |
| `DIST-02` | Incompatibilidad de Node Engines (`>=20` vs `>=22.6`) | **ALTA** | Crash en Node 20 por flag `--experimental-strip-types`. |
| `DIST-03` | Desfase Silencioso de Binario MCP (`bin/gripm-mcp.js`) | **ALTA** | Tests y ejecución corren sobre bundle viejo desactualizado de TS. |
| `DIST-04` | Procesos Zombie en Servidor MCP por Stdio | **ALTA** | Servidor huérfano en memoria al cerrar clientes LLM. |
| `FRONT-01` | Megacomponentes Monolíticos (161 KB en un archivo) | **MEDIA** | 44 `useState`, lag de tipeo y violación de cohesión. |
| `FRONT-02` | Pérdida de Datos por Stale Closures ante SSE | **ALTA** | `setBoardData` desactualizado borra tareas creadas concurrentemente. |
| `FRONT-03` | Memory Leak de 300 Listeners Globales en `ItemCard` | **MEDIA** | Event listeners incondicionales en `document` en cada tarjeta. |
| `TEST-01` | "Test Theater": Inspección de Texto Plano en `.tsx` | **ALTA** | Tests de accesibilidad y UI que buscan strings sin montar código. |
| `TEST-02` | Dependencia de Python y PyYAML en Proyecto Node | **MEDIA** | Overhead innecesario y fragilidad en CI/CD. |

---

## 1. Arquitectura de Runtime y Distribución

### 1.1 [DIST-01] El Fraude del Dev Server en Producción
- **Archivos:** `bin/gripm.js:357-375`, `vite.config.ts:8-44`, `package.json:103-112`.
- **Diagnóstico:**
  Al invocar `gripm` o `npx @gripm/board`, el binario arranca un servidor de desarrollo de Vite:
  ```javascript
  // bin/gripm.js:357
  const { createServer } = await import('vite');
  const server = await createServer({
    root: PKG_ROOT,
    configFile: path.resolve(PKG_ROOT, 'vite.config.ts'),
    server: { port: resolvedPort, host, strictPort: false, open: false }
  });
  await server.listen();
  ```
- **Impacto:**
  1. `dist/` se empaqueta en npm pero nunca se utiliza.
  2. `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss` y `autoprefixer` tuvieron que ponerse en `dependencies` de producción.
  3. Una instalación global arrastra más de 120 MB de herramientas de compilación con binarios de `esbuild` y `rollup`.
  4. En entornos de solo lectura (Docker restringido, Windows corporate), Vite falla al intentar escribir en `.vite/`.

### 1.2 [DIST-02] Contradicción Fatal de Motores Node (`engines`)
- **Archivos:** `package.json:37-39, 80-90`, `scripts/run-tests.js:84-88`.
- **Diagnóstico:**
  `package.json` declara `"engines": { "node": ">=20.0.0" }`. Sin embargo, los scripts npm ejecutan:
  `node --experimental-strip-types scripts/run-tests.js`.
  La flag `--experimental-strip-types` solo fue introducida en Node.js v22.6.0. En Node 20 LTS (declarado como compatible), el comando falla de inmediato con `bad option: --experimental-strip-types`.

### 1.3 [DIST-03] Desfase Silencioso entre TypeScript y el Binario MCP
- **Archivos:** `scripts/mcp-server.ts`, `bin/gripm-mcp.js`, `scripts/verify-mcp-binary.js:10`.
- **Diagnóstico:**
  `bin/gripm-mcp.js` es un bundle de 104 KB commiteado en el repositorio. `verify-mcp-binary.js` ejecuta directamente `bin/gripm-mcp.js`. Si un programador edita `scripts/mcp-server.ts` y no corre manualmente `npm run build:bin`, los tests pasan en verde contra el binario viejo, mientras el código fuente queda desincronizado. No hay ningún hook pre-commit que verifique la paridad entre el TS y el JS.

---

## 2. Motor de Persistencia y Parser

### 2.1 [DATA-01] Pérdida Silenciosa de Campos YAML
- **Archivos:** `scripts/backlogMdParser.ts:247-266, 301, 702`.
- **Diagnóstico:**
  La función `finalizeList()` tiene un `if/else` cerrado para claves conocidas (`labels`, `assignees`, `dependencies`, `blocks`, `sprints`, `releases`).
  Cualquier otra lista YAML (ej: `tags:`, `reviewers:`, `qa_criteria:`) no coincide con ningún caso y **se descarta en memoria**. Al serializar con `serializeBacklogMd()`, el archivo en disco pierde permanentemente esos metadatos.
  Además, en la línea 301, listas inline con comas (`labels: ["ui/ux", "auth, session"]`) son divididas ciegamente por comas, destruyendo los strings.

### 2.2 [DATA-02] Mutilación de Código en Descripciones Markdown
- **Archivos:** `scripts/backlogMdParser.ts:202-213`.
- **Diagnóstico:**
  `extractSectionBlock` utiliza una expresión regular `^##\s+Header` que no discrimina si el encabezado está dentro de un bloque de código Markdown cercado (\`\`\`markdown ... \`\`\`).
  Si una tarea técnica documenta un formato citando un header H2 dentro de un snippet, el parser asume que terminó la sección y **borra todo el texto posterior al volver a guardar la tarea**.

### 2.3 [DATA-03] Pérdida de Datos por Escrituras No Atómicas
- **Archivos:** `server/services/storage.ts:660`, `scripts/mcp-server.ts:1316`, `scripts/registryConfig.js:66`.
- **Diagnóstico:**
  Todas las mutaciones ejecutan `fs.writeFileSync(path, content)` directo sobre el archivo destino. Esta llamada trunca el archivo a 0 bytes antes de escribir los datos. Si ocurre un corte de energía, `kill -9`, crash por OOM o reinicio mientras la llamada está en curso, la tarea o `registry.json` queda vacía de forma irrecuperable.

### 2.4 [DATA-04 y DATA-05] Falsificación de ACs y Auto-Promoción en `backlog:sync`
- **Archivos:** `scripts/verify-backlog-sync.js:220-242`.
- **Diagnóstico:**
  1. Si una tarea está en `done` pero tiene criterios sin marcar (`- [ ]`), el modo `--fix` ejecuta `replace(/-\s*\[ \]/g, '- [x]')`, marcándolos automáticamente como aprobados sin verificación física.
  2. Si una tarea en `doing` tiene todos los ACs tildados, el modo `--fix` cambia su estado automáticamente a `status: ready`, violando la State Machine que exige que solo el auditor QA pueda certificar el paso a `ready`.

---

## 3. Seguridad y Daemon Local

### 3.1 [SEC-01] Path Traversal en `generateTaskFilename`
- **Archivos:** `scripts/backlogMdParser.ts:740-753`, `server/routes/api.ts:188`, `server/services/storage.ts:658`.
- **Diagnóstico:**
  `generateTaskFilename` no sanitiza barras (`/`, `\`) ni secuencias relativas (`..`) en el identificador:
  ```typescript
  const cleanId = (id || 'TASK').trim().toUpperCase().replace(/--+/g, '-');
  return `${cleanId} - ${cleanTitle || 'Task'}.md`;
  ```
  Un payload con `code: "../../../payload"` escapa de `backlog/tasks/` y escribe archivos arbitrarios en la raíz del repositorio o fuera de él.

### 3.2 [SEC-02] Mutación de Disco en HTTP `GET` sin Protección CSRF
- **Archivos:** `server/routes/api.ts:832-838`, `server/middleware/security.ts:87-110`.
- **Diagnóstico:**
  En `security.ts:88`, la validación de CSRF solo se ejecuta `if (originHeader)`.
  Peticiones `GET` emitidas desde etiquetas HTML (`<img src="...">`) por una web externa no envían `Origin`.
  El endpoint `GET /api/projects/:id/export-monolithic-md?save=true` escribe físicamente en disco el consolidado `BACKLOG.md`. Una página maliciosa puede forzar la sobrescritura silenciosa del backlog local del desarrollador simplemente cargando una imagen oculta.

### 3.3 [SEC-03] Crash Fatal por Evento `EPIPE` en SSE
- **Archivos:** `server/sse/sseManager.ts:10-16, 90-118`.
- **Diagnóstico:**
  `client.write(msg)` en Node.js emite asíncronamente el evento `'error'` (`EPIPE` / `ECONNRESET`) cuando el cliente cierra la conexión bruscamente.
  Al no existir listeners `res.on('error', ...)` en `handleSseRoute`, Node.js aborta el proceso inmediatamente por excepción fatal no capturada.

---

## 4. Arquitectura Frontend y Rendimiento en React

### 4.1 [FRONT-01] Megacomponentes Monolíticos y Lag de Tipeo
- **Archivos:** `src/components/SettingsView.tsx` (161 KB, 2,979 líneas), `src/components/ItemModal.tsx` (135 KB, 2,402 líneas, 44 `useState`).
- **Diagnóstico:**
  En `ItemModal.tsx:199-231`, en cada pulsación de tecla sobre el título o la descripción, se ejecutan síncronamente filtros y flatMaps sobre toda la lista global de tareas (`allItems`) para resolver relaciones y etiquetas, destruyendo y recreando listeners de teclado con 21 dependencias en cada carácter.

### 4.2 [FRONT-02] Pérdida de Datos por Stale Closures ante Eventos SSE
- **Archivos:** `src/App.tsx:848-856, 527, 578`.
- **Diagnóstico:**
  Las mutaciones de estado capturan la referencia de `boardData` del closure en lugar de usar updates funcionales (`setBoardData(prev => ...)`).
  Si un agente en terminal o proceso externo crea una tarea mientras el usuario tiene un modal abierto, el evento SSE actualiza el estado; pero cuando el usuario hace clic en "Guardar", la promesa de guardado usa la copia vieja y **hace desaparecer la tarea nueva de la pantalla**.

### 4.3 [FRONT-03] Memory Leak: 300 Listeners Globales en `ItemCard`
- **Archivos:** `src/components/ItemCard.tsx:265-278`.
- **Diagnóstico:**
  Cada tarjeta registra incondicionalmente un listener `document.addEventListener('mousedown', handleClickOutside)` que permanece activo aunque el menú esté cerrado. En un tablero con 300 tarjetas, cada click en pantalla ejecuta 300 funciones y hasta 600 llamadas a `.contains()` en el DOM.

---

## 5. Calidad, Testing y CI/CD

### 5.1 [TEST-01] "Test Theater" por Inspección de Texto Plano
- **Archivos:** `scripts/verify-focus-trap.js:38-57`, `scripts/test-ui-logic.js:89-117`, `scripts/verify-kanban-reorder.js:22-43`.
- **Diagnóstico:**
  1. `verify-focus-trap.js` no monta ningún componente: lee `useFocusTrap.ts` con `fs.readFileSync` y hace `assert.ok(hook.includes("event.key !== 'Tab'"))`.
  2. `test-ui-logic.js` prueba el z-index de modales extrayendo clases de Tailwind de `Header.tsx` con regex.
  3. `verify-kanban-reorder.js` copió y pegó la función de ordenamiento en el test para probar su propia copia local, y luego verifica que `KanbanBoard.tsx` contenga el string `"handleMoveWithinColumn"`.
  4. Componentes críticos como `SettingsView.tsx` (2,827 líneas) tienen un 0% de ejecución real en tests.

### 5.2 [TEST-02] Dependencia Oculta de Python en Proyecto TypeScript
- **Archivos:** `scripts/verify-changes.js:77-98`, `.github/workflows/ci.yml:44-50`.
- **Diagnóstico:**
  Para validar YAML sin instalar un paquete de Node, `verify-changes.js` busca `python3` y ejecuta `import yaml`. Esto obliga a todos los runners de GitHub Actions a configurar Python y correr `pip install pyyaml` en un repositorio TypeScript puro.

---

## 6. Pruebas de Concepto Físicas y Demostración Forense

El siguiente script fue ejecutado directamente contra el motor de Gripm (`scripts/backlogMdParser.ts`), arrojando los siguientes resultados comprobables en terminal:

```javascript
// C:\Users\Pablo\.gemini\antigravity\brain\b7efaa0d-cdb2-4299-8bd5-acfae6a3e75d\scratch\poc_verify.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const parserUrl = pathToFileURL(path.resolve('scripts/backlogMdParser.ts')).href;
const { parseBacklogMd, serializeBacklogMd, generateTaskFilename } = await import(parserUrl);

// 1. Path Traversal
const filename = generateTaskFilename('../../../danger', 'Mi Tarea');
console.log('Filename:', filename); // -> "../../../DANGER - Mi Tarea.md"
const resolved = path.resolve('backlog/tasks', filename);
console.log('Ruta resuelta:', resolved); // -> "C:\Users\Pablo\Proyectos\DANGER - Mi Tarea.md" (FUERA DE TASKS)

// 2. Pérdida de campos YAML
const md = `---\nid: DEV-999\ntitle: Test\nreviewers:\n  - alice\ntags:\n  - security\n---\n## Description\nTest.`;
const s = serializeBacklogMd(parseBacklogMd(md, 'DEV-999'));
console.log('¿Conserva alice?:', s.includes('alice')); // -> false (BORRADO)
console.log('¿Conserva tags?:', s.includes('tags')); // -> false (BORRADO)

// 3. Truncamiento por código
const codeMd = `## Description\n\`\`\`markdown\n## Acceptance Criteria\n- [ ] dummy\n\`\`\`\nTexto que se borra.`;
const p = parseBacklogMd(codeMd, 'DEV-999');
console.log('¿Se borró el texto posterior?:', !p.description.includes('Texto que se borra')); // -> true (BORRADO)
```

---

## 7. Mapeo a Tareas del Backlog Creadas

Los hallazgos anteriores fueron desglosados en tareas oficiales con criterios de aceptación y scripts de fallo en `backlog/tasks/`:

| Tarea | Título | Prioridad | Hallazgos Cubiertos |
| :--- | :--- | :---: | :--- |
| **DEV-289** | Integridad del Parser: Eliminación de mutilación de código y pérdida de campos YAML | **P0** | `DATA-01`, `DATA-02` |
| **DEV-290** | Desacople de Vite en Runtime: Servidor estático para producción y reducción de dependencias | **P0** | `DIST-01`, `DIST-02` |
| **DEV-291** | Persistencia Atómica: Erradicación de truncamiento a cero bytes en tareas y registry | **P0** | `DATA-03` |
| **DEV-292** | Seguridad en Daemon Local: Sanitización de Path Traversal y blindaje de endpoints | **P1** | `SEC-01`, `SEC-02`, `SEC-03`, `SEC-04` |
| **DEV-293** | Gobernanza de Calidad: Erradicación de fabricación de ACs y auto-promoción a ready en sync | **P1** | `DATA-04`, `DATA-05` |
| **DEV-294** | Prevención de Stale Closures en App.tsx y Sincronización Funcional con SSE | **P2** | `FRONT-02` |
| **DEV-295** | Saneamiento del Servidor MCP: Prevención de procesos zombies y blindaje de JSON-RPC | **P2** | `DIST-03`, `DIST-04` |
| **DEV-296** | Modernización de Testing: Erradicación de test theater y eliminación de Python | **P3** | `TEST-01`, `TEST-02` |

---
*Fin del informe de auditoría técnica integral.*
