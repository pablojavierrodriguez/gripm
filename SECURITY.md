# Security Policy

🌐 **[English](#security-policy)** | **[Español](#política-de-seguridad)**

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | ✅ |
| < 1.0.0 | ❌ |

gripm is in stable version 1.x. Security patches are applied to the most recent release branch. Backports to older versions are not provided: if you encounter an issue on an earlier version, please update to the latest release.

## Reporting a Vulnerability

**Do not open a public issue.**

gripm manages backlogs directly as Markdown files within the user's repository, exposes an MCP server that writes to disk, and executes binaries under the user's OS privileges. A public report could expose third parties before a fix is available.

Please use the repository's private security reporting channel:

1. Navigate to the **Security** tab of the repository on GitHub.
2. Select **Report a vulnerability**.
3. Describe the vulnerability and provide step-by-step reproduction instructions.

This channel is private by design: only maintainers with explicit permissions can view it.

### What to Include

- gripm version and Node.js version.
- Operating system and platform architecture.
- Clear reproduction steps, ideally with a minimal reproduction repository.
- Expected impact: what an attacker could achieve or compromise.

### What NOT to Include

- Personal identifiable information (PII) of third parties.
- Real credentials, API keys, or secret tokens.
- Proprietary contents of third-party repositories without authorization.

## Response Expectations

| Stage | Target Timeframe |
|---|---|
| Acknowledgment of receipt | 3 business days |
| Severity assessment | 7 business days |
| Published mitigation plan | 14 business days |
| Patch / fix release | Dependent on severity |

These are operational targets rather than contractual obligations, but they represent our commitment for well-formed security reports.

## Scope

**In Scope:**

- The MCP server (`gripm-mcp`) and its protocol handling.
- The CLI (`gripm`, `board`), including `--init` and the scaffolding written to the user's repository.
- The Markdown persistence layer: serialization, schema migrations, and project registry migrations.
- File path resolution at runtime. Any bundle resolving relative paths against the current working directory instead of the package directory could touch unintended files.
- Git hooks installed by the project.

**Out of Scope:**

- Vulnerabilities in the Node.js runtime or web browser (report upstream).
- Dependency vulnerabilities without a practical exploit vector within the context of gripm.
- Lack of isolation between projects that the user has explicitly registered. The board displays and manages projects that the user chooses to register.

## Severity Criteria

| Severity | Description | Example |
|---|---|---|
| **Critical** | Arbitrary code execution (RCE) or unauthorized file access outside the user's project | An MCP parameter permits arbitrary file writing outside `backlogDir`. |
| **High** | Silent corruption or data loss in the backlog | The serializer overwrites a `.md` file with content belonging to another task. |
| **Medium** | Information disclosure between registered projects | A project reads tasks from another project due to insufficient ID validation. |
| **Low** | Local Denial of Service (DoS) or non-sensitive information leakage | A malformed `.md` file crashes server startup. |

## Threat Model and Risk Surface

### 1. Absence of HTTP Authentication (Single-User Local Daemon, SEC-10)
gripm is designed as a local developer cockpit tool running on a single machine. The HTTP API does not implement authentication layers, user sessions, or access tokens. The trust boundary is the developer's local machine and the operating system user executing the process.

### 2. Local Network Exposure via `--host 0.0.0.0` (SEC-06)
Starting gripm with `--host 0.0.0.0` (or `GRIPM_HOST=0.0.0.0`) binds the server to all network interfaces on the host. Any device connected to the same local area network (LAN) can query and mutate the backlog without credentials. This capability is a documented trade-off intended for ergonomic mobile device previewing on trusted local networks; **it must never be used on public Wi-Fi networks, shared hosts, or internet-exposed servers**.

### 3. Folder Browser Scope and Home Directory Traversal (SEC-07)
The `/api/fs/browse` endpoint allows navigating the filesystem starting from authorized roots (`os.homedir()`, `process.cwd()`, registered projects, and paths configured in `GRIPM_ALLOWED_PATHS`). Every query strictly validates path containment via `path.relative` and symbolic link resolution (`fs.realpathSync`), blocking any attempt to escape or traverse outside authorized roots.

### 4. MCP Server Security Boundary (stdio, SEC-03, SEC-05)
The MCP server (`bin/gripm-mcp.js` / `scripts/mcp-server.ts`) communicates exclusively over standard `stdin`/`stdout` streams. It does not open TCP network ports or remote endpoints. Its trust boundary is the parent process invoking it (the user's IDE or AI client). All arguments are validated strictly against their `inputSchema` (rejecting invalid types, negative offsets, or nonexistent AC indexes), and the `--repo` argument is validated for existence and containment.

### 5. Gatekeeper and Verification Command Execution (SEC-01)
When certifying tasks towards terminal states (`ready` or `done`), the Gatekeeper may execute a verification command (`verifyCommand`). To prevent Remote Code Execution (RCE) originating from external repositories or shared files:
- **The command is executed ONLY if explicitly provided as an argument in the MCP call.**
- **Code or scripts located in the YAML frontmatter of Markdown files on disk are NEVER read or executed.**
- **The MCP server never persists executable scripts or commands into the task file or its frontmatter.**
- Execution is strictly bounded by a 15-second timeout (`timeout: 15000`) to prevent server deadlocks.

### 6. Bypass Audit Trail with `force: true` (SEC-09)
The `force: true` flag mechanically bypasses Gatekeeper checks for exceptional manual interventions. Any usage of `force: true` outputs an explicit warning in the response and logs an audited timestamped trail (`audit: { bypassedGatekeeper: true }`).

## Disclosure

We appreciate responsible security research. If you discover a vulnerability:

- **Do not** disclose it publicly until a patch has been released.
- Do not access third-party data to demonstrate severity.
- We will gladly credit you in release notes and advisories upon request.

Once a fix is released, we publicly acknowledge the report unless you prefer anonymity.

---

# Política de Seguridad

🌐 **[English](#security-policy)** | **[Español](#política-de-seguridad)**

## Versiones soportadas

| Versión | Soporte |
|---|---|
| 1.x | ✅ |
| < 1.0.0 | ❌ |

gripm se encuentra en versión estable 1.x. Las correcciones de seguridad se aplican sobre la rama
más reciente. No se emiten parches para versiones antiguas: si encontrás un
problema en una versión anterior, actualizá a la última.

## Cómo reportar una vulnerabilidad

**No abras un issue público.**

gripm gestiona el backlog en archivos Markdown dentro del repositorio del
usuario, expone un servidor MCP que escribe en el disco y ejecuta binarios con
permisos del usuario. Un reporte público puede exponer a terceros antes de que
exista una corrección.

Usá el canal privado del repositorio:

1. Abrí la pestaña **Security** del repositorio.
2. Elegí **Report a vulnerability**.
3. Describí el problema con los pasos de reproducción.

Ese canal es privado por diseño: solo los mantenedores con permiso de lectura
lo ven.

### Qué incluir

- Versión de gripm y de Node.js.
- Sistema operativo.
- Pasos para reproducir, idealmente con un repositorio de prueba mínimo.
- Impacto esperado: qué puede hacer un atacante con esto.

### Qué no incluir

- Datos personales de terceros.
- Credenciales reales o tokens.
- Contenido de repositorios de terceros sin su autorización.

## Expectativas de respuesta

| Etapa | Objetivo |
|---|---|
| Confirmación de recepción | 3 días hábiles |
| Evaluación de severidad | 7 días hábiles |
| Plan de mitigación publicado | 14 días hábiles |
| Corrección publicada | Según severidad |

Estas son metas, no compromisos contractuales, pero son el piso de lo que se
espera de un reporte bien formado.

## Alcance

**En alcance:**

- El servidor MCP (`gripm-mcp`) y su protocolo.
- El CLI (`gripm`, `board`), incluido `--init` y el scaffolding que escribe en el
  repositorio del usuario.
- La capa de persistencia Markdown: serialización, migraciones y la migración
  del registro de proyectos.
- Las rutas de archivo resueltas en tiempo de ejecución. Un bundle que resuelve
  rutas relativas al directorio de trabajo en vez de al directorio del paquete
  puede operar sobre archivos inesperados.
- Los hooks de git que el proyecto instala.

**Fuera de alcance:**

- Vulnerabilidades en el runtime de Node.js o en el navegador: reportalas
  upstream.
- Vulnerabilidades en las dependencias sin un escenario de explotación
  razonable en el contexto de gripm.
- Falta de segregation entre proyectos que el usuario vinculó explícitamente.
  El board registra y muestra proyectos que el usuario elige registrar.

## Criterios de severidad

| Severidad | Descripción | Ejemplo |
|---|---|---|
| **Crítica** | Ejecución de código arbitraria o acceso a archivos fuera del proyecto del usuario | Un parámetro del MCP permite escribir fuera de `backlogDir`. |
| **Alta** | Corrupción o pérdida silenciosa de datos del backlog | El serializador sobrescribe un `.md` con contenido de otra tarea. |
| **Media** | Filtración de información entre proyectos | Un proyecto lee tareas de otro por un id mal validado. |
| **Baja** | Denegación de servicio local o información no sensible | Un `.md` malformado impide arrancar el servidor. |

## Modelo de Amenazas y Superficie de Riesgo

### 1. Ausencia de autenticación HTTP (Daemon local monousuario)
gripm está concebido como una herramienta local de cockpit de ingeniería para desarrollo en máquina individual. La API HTTP no implementa capas de autenticación, sesiones ni tokens de acceso. La frontera de seguridad es la máquina del desarrollador y el usuario del sistema operativo bajo el cual corre el proceso.

### 2. Exposición a red local vía `--host 0.0.0.0` (SEC-06)
Al iniciar gripm con `--host 0.0.0.0` (o `GRIPM_HOST=0.0.0.0`), el servidor escucha en todas las interfaces de red de la máquina. Cualquier dispositivo conectado a la misma red local (LAN) puede consultar y mutar el backlog sin credenciales. Esta capacidad es un trade-off documentado para permitir previsualización ergonómica desde dispositivos móviles en redes locales confiables; **nunca debe utilizarse en redes Wi-Fi públicas, servidores compartidos o entornos expuestos a Internet**.

### 3. Alcance del explorador de carpetas y Home Directory (SEC-07)
El endpoint `/api/fs/browse` permite navegar por el sistema de archivos partiendo de raíces autorizadas (`os.homedir()`, `process.cwd()`, proyectos registrados y rutas en `GRIPM_ALLOWED_PATHS`). Cada consulta valida rigurosamente la contención mediante `path.relative` y resolución de enlaces simbólicos (`fs.realpathSync`), bloqueando cualquier intento de escape o traversal fuera de las raíces designadas.

### 4. Frontera de seguridad del servidor MCP (stdio)
El servidor MCP (`bin/gripm-mcp.js` / `scripts/mcp-server.ts`) se comunica exclusivamente por canales estándar `stdin`/`stdout`. No abre puertos de red TCP ni endpoints remotos. Su frontera de confianza reside en el proceso padre que lo ejecuta (el IDE o agente de IA). Todos los argumentos son validados estrictamente contra su `inputSchema` (rechazando tipos incorrectos, offsets negativos o índices de AC inexistentes), y el argumento `--repo` está sujeto a comprobaciones de existencia y contención de rutas (SEC-03, SEC-05).

### 5. Gatekeeper y ejecución de comandos de verificación (SEC-01)
Al certificar tareas hacia estados terminales (`ready` o `done`), el Gatekeeper puede ejecutar un comando de verificación (`verifyCommand`). Para prevenir ejecución arbitraria de código (RCE) proveniente de repositorios externos o archivos compartidos:
- **Solo se ejecuta si el comando se proporciona explícitamente como argumento de la llamada MCP.**
- **Nunca se lee ni se ejecuta código proveniente del frontmatter YAML de los archivos Markdown en disco.**
- **El servidor MCP nunca persiste comandos ejecutables dentro del frontmatter ni del archivo de la tarea.**
- La ejecución tiene un tiempo límite estricto de 15 segundos (`timeout: 15000`) para evitar bloqueos del servidor.

### 6. Auditoría de bypass con `force: true` (SEC-09)
El parámetro `force: true` permite saltar mecánicamente las validaciones del Gatekeeper en situaciones excepcionales de intervención humana. Todo uso de `force: true` emite una advertencia explícita en la respuesta y genera una traza de auditoría con timestamp (`audit: { bypassedGatekeeper: true }`).

## Divulgación

Agradecemos la investigación responsable. Si encontrás algo:

- **No** lo publiques hasta que se publique una corrección.
- No accedas a datos de terceros para demostrar el impacto.
- Te acreditamos en la corrección si lo pedís.

Una vez publicada la corrección, agradecemos públicamente el reporte salvo que
prefieras mantener el anonimato.
