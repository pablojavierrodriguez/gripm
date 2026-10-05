---
name: recharts-reporting
description: Usar esta skill siempre que se construyan gráficos, dashboards, reportes o vistas de estadísticas con Recharts, o cuando el usuario mencione charts, gráficos, reportes visuales o visualización de datos.
---

# Recharts: convenciones de reportes

## Contenedor responsivo obligatorio

Todo chart va envuelto en `ResponsiveContainer` con altura fija en el padre (Recharts no puede calcular altura automática):

```tsx
<div style={{ width: '100%', height: 320 }}>
  <ResponsiveContainer>
    <LineChart data={data}>{/* ... */}</LineChart>
  </ResponsiveContainer>
</div>
```

**En móvil**: usar `width: '100%'` en el contenedor externo también para el eje X — los dashboards que no respetan esto desbordan el viewport en APK (bug resuelto en v0.9.1, Dashboard.tsx).

---

## Forma de los datos

Formatear los datos ANTES de pasarlos al chart (no dentro del render de cada `<Line>`/`<Bar>`): array de objetos planos, una clave por serie.

```ts
const data = rows.map(r => ({
  name: formatDate(r.date),      // ya formateado para eje X
  asistencia: r.attendanceCount,
  promedio: r.average,
}));
```

**Advertencia**: no recrear el array de datos dentro del render del componente. Si los datos vienen del `OrgContext` (que ya los memoiza), no re-mapearlos en cada render sin `useMemo`:

```ts
const chartData = useMemo(() => 
  rows.map(r => ({ name: formatDate(r.date), value: r.count })),
  [rows]
);
```

---

## Colores y tema

Usar los mismos tokens de color que Tailwind (no hardcodear hex sueltos en cada chart). Definir una paleta compartida en un solo archivo (`chartColors.ts`) y reusarla en todos los reportes, para consistencia visual y para poder cambiarla en un solo lugar.

Evitar depender solo del color para distinguir series (accesibilidad) — combinar con patrones de línea, íconos en la leyenda, o labels directos cuando el chart tiene pocas series.

---

## Performance

- `useMemo` para la transformación de datos si el dataset es grande o el componente padre re-renderiza seguido.
- No pasar el array de datos recreado en cada render (rompe memoización interna de Recharts).
- El Dashboard usa RPCs de Supabase (`get_dashboard_stats`) para traer datos agregados pre-calculados — nunca calcular agregaciones en el frontend si hay un RPC disponible.

---

## Tooltips y formato

Formatear números/fechas en el `formatter` del `<Tooltip>`, no en el dato crudo (así el eje puede seguir ordenando/calculando sobre el valor numérico real).

**Locale del proyecto**: `regional-locale` para formato de números y fechas:

```tsx
<Tooltip formatter={(value: number) => value.toLocaleString('regional-locale')} />
```

```tsx
// Eje X de fechas:
<XAxis
  dataKey="name"
  tickFormatter={(date) => new Date(date).toLocaleDateString('regional-locale', { month: 'short', day: 'numeric' })}
/>
```

---

## Labels en filtros de rango

Al implementar pills/tabs de rango de tiempo (7d, 30d, 3m, etc.), usar labels cortos para que no desborden el viewport en mobile:

```tsx
// ✅ Correcto
['7d', '30d', '3m', '6m', '1a']

// ❌ Desborda en mobile
['Última semana', 'Último mes', 'Últimos 3 meses']
```

Este bug fue resuelto en el Dashboard mobile (v0.9.1).

---

## Referencia de implementación

- Dashboard principal: ver `src/pages/Dashboard.tsx` y [SPEC-076 — Dashboard Improvements](../../docs/specs/SPEC-076-dashboard-improvements.md)
- Los KPI cards del dashboard usan sparklines (mini `LineChart` sin ejes ni tooltips) como indicador de tendencia.
