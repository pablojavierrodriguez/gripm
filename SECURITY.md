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

## Divulgación

Agradecemos la investigación responsable. Si encontrás algo:

- **No** lo publiques hasta que se publique una corrección.
- No accedas a datos de terceros para demostrar el impacto.
- Te acreditamos en la corrección si lo pedís.

Una vez publicada la corrección, agradecemos públicamente el reporte salvo que
prefieras mantener el anonimato.
