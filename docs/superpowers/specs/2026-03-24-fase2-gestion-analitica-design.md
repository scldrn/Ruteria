# Spec: Fase 2 — Gestión y Analítica

**Fecha:** 2026-03-24
**Estado:** Aprobado
**HUs:** HU-32, HU-33, HU-34, HU-35, HU-36, HU-37
**Sprints:** Sprint 7 (Garantías + Proveedores/Compras) · Sprint 8 (Dashboard + Reportes)

---

## Contexto

Fase 1 completada (Sprints 1–6, mergeados a `main`). El sistema cubre el flujo operativo de campo completo con soporte offline. Fase 2 agrega la capa de gestión (garantías, proveedores, compras) y la capa analítica (dashboard en tiempo real, reportes exportables).

Las tablas `garantias`, `compras`, `detalle_compra` y `proveedores` ya existen en el schema de Fase 0. Esta fase añade RLS, RPCs, vistas SQL, UI y tests sobre esa base.

---

## Sprint 7 — Garantías + Proveedores/Compras

### F2-01 / F2-02 — Módulo de Garantías (HU-32, HU-33)

#### Flujo campo (HU-32)

- Botón **"Registrar garantía"** en `/campo/visita/[id]`, visible en todas las etapas de la visita (mismo patrón que `IncidenciaSheet`).
- `GarantiaSheet` captura: producto (select del surtido de la vitrina), cantidad, motivo (texto libre), fecha aproximada de venta.
- Al guardar, llama RPC `registrar_garantia(visita_id, producto_id, cantidad, motivo, fecha_venta_aprox, client_sync_id)`.
- El RPC es **idempotente por `client_sync_id`**: si el cliente reintenta tras pérdida de red, la segunda llamada devuelve la garantía ya creada sin duplicar el movimiento.
- El RPC opera en transacción: `INSERT garantias` + `INSERT movimientos_inventario` (`tipo='devolucion_garantia'`, `direccion='salida'`, `origen_tipo='vitrina'`).
- **Offline:** la acción `create-garantia` se añade a la cola IndexedDB del service worker (mismo patrón que `create-incidencia`). Sincroniza automáticamente al reconectar.

#### Flujo admin (HU-33)

- `/admin/garantias` — tabla con filtros por estado (`abierta / resuelta / cerrada`), PDV y período.
- `GarantiaDetalleSheet` para resolución. Tres opciones:
  - **Cambio de producto** → RPC `resolver_garantia` inserta movimiento `compra/entrada/central` (repone el artículo al stock central) + actualiza `garantias.resolucion='cambio'` + estado `resuelta`.
  - **Baja definitiva** → inserta movimiento `baja` + `resolucion='baja'` + estado `resuelta`.
  - **Devolución a proveedor** → solo actualiza `resolucion='devolucion_proveedor'` + estado `resuelta`. Sin movimiento de inventario (el artículo ya salió de vitrina al registrar la garantía).
- El RPC `resolver_garantia` también es transaccional.

#### Migraciones nuevas (Sprint 7 — Garantías)

```sql
-- RLS para garantias (colaboradora: insert en su visita; admin/supervisor: todo)
-- Función registrar_garantia(visita_id, producto_id, cantidad, motivo, fecha_venta_aprox, client_sync_id)
-- Función resolver_garantia(garantia_id, resolucion, notas)
-- Índice: garantias(estado), garantias(visita_id)
```

---

### F2-03 — Módulo de Proveedores

- `/admin/proveedores` — tabla con búsqueda y filtro activo/inactivo.
- `ProveedorSheet` (crear/editar): nombre, contacto_nombre, contacto_email, contacto_tel, condiciones_pago, activo.
- RLS: rol `compras` tiene CRUD; `admin` tiene CRUD; otros roles read-only.
- La tabla `proveedores` ya existe. Solo se añaden RLS y UI.

---

### F2-04 — Módulo de Compras

#### Estados de una orden

```
borrador → confirmada → recibida
              ↓
          cancelada (terminal, sin movimientos)
```

#### Flujo

1. **Crear orden** (`/admin/compras` → `CompraSheet`): seleccionar proveedor, añadir líneas (producto + cantidad estimada). Estado inicial `borrador`.
2. **Confirmar** → estado `confirmada`. Las líneas quedan bloqueadas para edición.
3. **Recibir** → `RecepcionSheet` por orden: ingresar `cantidad_real` por línea (puede ser menor a `cantidad_estimada` — recepción parcial válida). Llama RPC `recibir_compra(compra_id, items[{detalle_compra_id, cantidad_real}])`.
4. **Cancelar** → botón disponible desde `borrador` o `confirmada`. Estado `cancelada`. Sin movimientos de inventario.

#### RPC `recibir_compra`

- Transaccional: por cada línea, inserta `movimientos_inventario` (`tipo='compra'`, `direccion='entrada'`, `destino_tipo='central'`, `cantidad=cantidad_real`) + actualiza `detalle_compra.cantidad_real` + actualiza `compras.estado='recibida'` + suma `compras.total_real`.
- **Idempotente:** si `compras.estado` ya es `recibida`, retorna éxito sin re-insertar movimientos.
- `InventarioCentralSheet` se **elimina**. Toda entrada de stock central pasa por recepción de compra.

#### Migraciones nuevas (Sprint 7 — Compras)

```sql
-- Agregar estado 'cancelada' al enum de compras si no existe
-- Agregar columna detalle_compra.cantidad_real INT si no existe
-- RLS para compras y detalle_compra (compras: CRUD; admin: CRUD; otros: read)
-- Función recibir_compra(compra_id, items jsonb)
-- Índice: compras(estado), compras(proveedor_id)
```

#### Remoción de InventarioCentralSheet

- Eliminar `InventarioCentralSheet` y su botón de acción en `/admin/inventario`.
- El tab `Central` en inventario pasa a ser read-only con link a `/admin/compras`.

---

### Tests Sprint 7

| Tipo | Descripción |
|---|---|
| E2E | Colaboradora registra garantía durante visita → admin resuelve con cambio → stock central aumenta |
| E2E | Ciclo completo compra: crear → confirmar → recibir parcial → verificar stock central |
| E2E | Cancelar orden en estado `confirmada` → no genera movimientos |
| RLS (Vitest) | `garantias`: colaboradora solo ve/crea las de su visita; supervisor puede ver todas |
| RLS (Vitest) | `compras`: rol `compras` y `admin` pueden crear; `analista` solo read |
| Offline | Garantía registrada offline queda en cola → sincroniza al reconectar |

---

## Sprint 8 — Dashboard + Reportes

### F2-05 a F2-09 — Dashboard en Tiempo Real (HU-34, HU-37)

**Ruta:** `/admin/dashboard`

#### Layout

```
┌─────────────────────────────────────────────────────┐
│  [Ventas hoy]  [Visitas]  [Cobros]  [Incidencias]   │  ← KPI cards (Tremor Metric), Realtime
├─────────────────────────────────────────────────────┤
│  [Hoy]  [Tendencias]  [Vitrinas]                    │  ← Tabs (shadcn Tabs)
│                                                     │
│  Contenido del tab activo                           │
└─────────────────────────────────────────────────────┘
```

#### Tab "Hoy"
- Ventas acumuladas del día con desglose por hora (Tremor `AreaChart`).
- Progreso de visitas: realizadas / planificadas para hoy.
- Cobros del día con indicador de discrepancias.

#### Tab "Tendencias"
- `AreaChart` ventas diarias últimos 30 días (Tremor).
- `BarChart` ventas por ruta/colaboradora en el mes actual (Tremor).

#### Tab "Vitrinas"
- Tabla top 10 vitrinas por ventas del mes con paginación.
- Tabla vitrinas con stock bajo (<30% del surtido estándar) con badge de alerta.

#### Hook `useDashboard`

```ts
// Carga inicial: query a v_dashboard_hoy (React Query, staleTime: 60_000)
// Realtime: suscripción a INSERT en visitas + cobros
// Fallback: si Realtime falla o se desconecta → refetchInterval: 30_000
// Cleanup: unsubscribe en useEffect cleanup
```

#### Vistas SQL nuevas

```sql
-- v_dashboard_hoy: ventas, visitas planificadas/realizadas, cobros del día, incidencias abiertas
-- v_stock_bajo: vitrinas donde (stock_actual / cantidad_objetivo) < 0.30
```

#### Índices de soporte

```sql
CREATE INDEX IF NOT EXISTS idx_visitas_fecha_estado ON visitas(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha ON cobros(fecha);
```

#### Loading states

Todos los componentes del dashboard muestran skeletons de Tremor durante carga inicial. No hay flashes de estado vacío.

---

### F2-10 a F2-14 — Reportes y Exportaciones (HU-35, HU-36)

**Ruta:** `/admin/reportes`

#### Estructura

Tabs por tipo de reporte:

| Tab | HU | Fuente de datos | Filtros |
|---|---|---|---|
| **Ventas** | HU-35 | `get_reporte_ventas(desde, hasta, ruta_id?, colaboradora_id?, pdv_id?)` | Período, ruta, colaboradora, PDV |
| **Ranking vitrinas** | HU-36 | `get_ranking_vitrinas(desde_actual, hasta_actual, desde_anterior, hasta_anterior)` | Período (calcula anterior automáticamente) |
| **Inventario** | — | `inventario_valorizado` (vista existente) + filtro ubicación | — |
| **Visitas** | — | `get_reporte_visitas(desde, hasta, ruta_id?)` | Período, ruta |
| **Incidencias y Garantías** | — | `get_reporte_incidencias_garantias(desde, hasta, tipo?, pdv_id?)` | Período, tipo, PDV |

#### Comportamiento de hooks

- Todos los hooks de reporte arrancan con `enabled: false`.
- Los datos se fetchen **solo cuando el usuario aplica filtros** (botón "Buscar").
- `staleTime: 5 * 60 * 1000` — datos de reporte no se refrescan solos.

#### F2-11 — Ranking con variación

`get_ranking_vitrinas` es una **función SQL única** que agrega dos períodos en un solo query y retorna `{vitrina_id, nombre_pdv, ventas_actual, ventas_anterior, variacion_pct}`. No se hacen dos queries desde el cliente.

#### Exportación a Excel

- SheetJS (`xlsx`) importado **dinámicamente**: `const xlsx = await import('xlsx')` dentro del handler del botón "Exportar".
- El workbook tiene una hoja por tab activo, headers en español, columnas de fecha formateadas.
- Si el dataset supera 5.000 filas, se muestra un warning antes de exportar.
- Errores de exportación muestran toast con mensaje claro.

#### Roles con acceso

`admin`, `supervisor`, `analista` tienen acceso a `/admin/reportes`. `analista` es read-only (no hay acciones de escritura en reportes). `compras` accede solo al tab Inventario.

---

### Tests Sprint 8

| Tipo | Descripción |
|---|---|
| Unit (Vitest) | Transformación SheetJS: headers en español, fechas formateadas, filas correctas |
| Unit (Vitest) | `useDashboard`: fallback a polling cuando Realtime falla |
| E2E | Dashboard carga KPIs + los tres tabs navegan sin error |
| E2E | Reporte de ventas: aplicar filtros → tabla carga → exportar genera .xlsx descargable |
| E2E | Ranking vitrinas muestra columna de variación con signo correcto |

---

## Dependencias nuevas

```bash
# Sprint 8
npm install @tremor/react           # Charts y KPI cards
npm install xlsx                    # SheetJS — exportación Excel (dynamic import)
```

> Verificar bundle size con `next build` al final de Sprint 8. SheetJS (~1 MB) debe cargarse solo on-demand vía dynamic import.

---

## Convenciones aplicadas

- RPCs de escritura multi-tabla: siempre transaccionales + idempotentes por `client_sync_id` donde aplica.
- Hooks de datos: `useQueryClient()` antes de `useQuery()`/`useMutation()`.
- Formularios: `z.input<typeof schema>` para tipos con `.default()`.
- Selects opcionales: `z.preprocess` para convertir `""` → `undefined`.
- Params en client components: `use(params)` para desempaquetar.
- Migraciones: numeración secuencial desde la última existente (verificar antes de crear).
- Tipos: regenerar `database.types.ts` después de cada migración.
- Comentarios de lógica de negocio: en español. Infraestructura/técnico: en inglés.

---

## Orden de implementación sugerido

### Sprint 7
1. Migraciones: RLS + RPCs garantías → UI campo (`GarantiaSheet`) → UI admin (`/admin/garantias`) → offline queue → Proveedores CRUD → Compras (crear/confirmar) → Recepción + RPC → eliminar `InventarioCentralSheet` → tests

### Sprint 8
1. Instalar Tremor + verificar compatibilidad Tailwind v4 → Vistas SQL + índices → Hook `useDashboard` + Realtime → UI Dashboard (KPIs → Tab Hoy → Tab Tendencias → Tab Vitrinas) → Funciones SQL de reportes → Hooks de reportes → UI `/admin/reportes` → SheetJS dynamic import → tests → análisis de bundle
