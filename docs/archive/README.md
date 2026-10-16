# Archivo Histórico de Documentación y Auditorías

Este directorio preserva documentos de auditorías arquitectónicas históricas, pruebas de concepto cerradas y snapshots de análisis técnico que sirvieron de base para fases previas de desarrollo.

---

## 🎯 Propósito

1. **Gobernanza y Limpieza:** Mantener el directorio raíz `docs/` enfocado exclusivamente en la **documentación canónica y viva** del proyecto (`ARCHITECTURE.md`, `adr/`, `sprints/`, `DOMAIN_TEMPLATE.md`).
2. **Trazabilidad Inmutable:** Preservar los análisis técnicos y diagnósticos situacionales a los que hacen referencia tareas históricas del backlog (ej. DEV-233, DEV-242), permitiendo su consulta inmediata sin depender de búsquedas en el historial de Git.

---

## 📂 Contenido Archivado

| Archivo | Fecha | Contexto / Versión | Tareas Relacionadas |
|---|---|---|---|
| [`auditoria-2026-10-10.md`](./auditoria-2026-10-10.md) | 2026-10-10 | Auditoría integral de `@gripm/board@1.1.0` (Arquitectura, Seguridad SEC-01 a SEC-10, Persistencia). | DEV-233, DEV-242 |
| [`auditoria-2026-10-15.md`](./auditoria-2026-10-15.md) | 2026-10-15 | Auditoría profunda previa al lanzamiento de la v1.5.0 (Degradación de CLI, Parser Roundtrip, God Components). | DEV-290 a DEV-307 |
| [`DISTRIBUTION_POC.md`](./DISTRIBUTION_POC.md) | 2026-10-09 | PoC de canales de distribución y empaquetado (npm global, npx, homebrew tap). | DEV-015, DEV-016 |

---

> [!NOTE]
> Para consultar la arquitectura técnica vigente del producto, remitirse a [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) y a los registros de decisión en [`docs/adr/`](../adr/).
