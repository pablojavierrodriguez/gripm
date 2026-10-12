# Política de Seguridad

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
