# Sprint 3 — Ruta del Día + Inicio de Visita — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el flujo completo de visita de campo (ruta del día → inicio de visita → conteo de inventario → total a cobrar) y el dashboard admin de seguimiento de visitas.

**Architecture:** Sigue el patrón de Sprint 2: hooks all-client con React Query v5 en `lib/hooks/`, componentes en `components/campo/` y `components/admin/`, páginas en `app/(campo)/campo/` y `app/(admin)/admin/`. El hook `useVisita` combina 4 queries paralelas (visita, surtido, inventario, detalle) en el cliente. Una Edge Function Deno genera visitas planificadas cada madrugada.

**Tech Stack:** Next.js 16 (App Router), React 19, TailwindCSS v4, shadcn/ui, Supabase (PostgREST + Edge Functions Deno), React Query v5, Zod, Playwright e2e.

---

## File Map

### Archivos nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `supabase/migrations/20260011_nota_reasignacion_rutas.sql` | `ALTER TABLE rutas ADD COLUMN nota_reasignacion` |
| `supabase/migrations/20260012_detalle_visita_update_policy.sql` | Política RLS UPDATE en detalle_visita (con ownership check) |
| `supabase/functions/generar-visitas-diarias/index.ts` | Edge Function cron: genera visitas planificadas idempotentemente |
| `lib/hooks/useRutaDelDia.ts` | Query visitas del día para colaboradora autenticada |
| `lib/hooks/useVisita.ts` | Get visita + surtido + inventario + detalle; mutaciones iniciar/guardar/noRealizada |
| `lib/hooks/useVisitas.ts` | Query paginada de visitas con filtros (admin) — reemplaza stub |
| `components/campo/RutaDelDiaCard.tsx` | Tarjeta de un PDV en la lista de ruta del día |
| `components/campo/ConteoTable.tsx` | Tabla editable de productos con cálculo live de ventas y total |
| `components/campo/VisitaInicioView.tsx` | Vista pantalla de inicio (estado planificada) |
| `components/campo/VisitaConteoView.tsx` | Vista pantalla de conteo (estado en_ejecucion) |
| `components/admin/VisitasTable.tsx` | DataTable de visitas con filtros para admin |
| `app/(campo)/campo/ruta-del-dia/page.tsx` | Página ruta del día — reemplaza stub |
| `app/(campo)/campo/visita/[id]/page.tsx` | Página detalle de visita (orquesta Inicio y Conteo) |
| `app/(admin)/admin/visitas/page.tsx` | Página listado admin de visitas |
| `tests/sprint3.spec.ts` | Tests e2e Playwright Sprint 3 |

### Archivos modificados / eliminados
| Archivo | Cambio |
|---------|--------|
| `app/(campo)/ruta-del-dia/page.tsx` | **ELIMINAR** — stub con URL incorrecta `/ruta-del-dia` |
| `supabase/config.toml` | Agregar sección `[functions.generar-visitas-diarias]` con schedule |
| `lib/validations/rutas.ts` | Agregar `nota_reasignacion` opcional |
| `lib/hooks/useRutas.ts` | Incluir `nota_reasignacion` en update mutation |
| `components/admin/RutaSheet.tsx` | Agregar campo textarea `nota_reasignacion` |
| `components/admin/AppSidebar.tsx` | Agregar item "Visitas" → `/admin/visitas` |
| `lib/supabase/database.types.ts` | Regenerar tras migraciones |

---

## Nota sobre el precio

El campo en la tabla `productos` es **`precio_venta_comercio`** (no `precio_venta`). Usar este nombre exacto en todos los hooks y componentes.

---

## Task 1: Setup — rama + eliminar stub incorrecto

**Files:**
- Delete: `erp-vitrinas/app/(campo)/ruta-del-dia/page.tsx`

- [ ] **Confirmar base de la rama:** Verificar si Sprint 2 ya fue mergeado a `main` con `git log --oneline main | head -5`. Si aparece "feat: Sprint 2" o similar, continuar desde `main`. Si no, continuar desde `feature/sprint2-vitrinas-inventario-rutas`.

- [ ] **Crear rama de trabajo:**
```bash
# Si Sprint 2 ya está en main:
git checkout main && git pull
git checkout -b feature/sprint3-visitas-campo

# Si Sprint 2 NO está en main:
git checkout feature/sprint2-vitrinas-inventario-rutas
git checkout -b feature/sprint3-visitas-campo
```

- [ ] **Eliminar stub con URL incorrecta:**
```bash
rm erp-vitrinas/app/\(campo\)/ruta-del-dia/page.tsx
```
> Este archivo genera `/ruta-del-dia` en lugar de `/campo/ruta-del-dia`. Eliminarlo evita un conflicto silencioso de rutas.

- [ ] **Commit:**
```bash
git add -A
git commit -m "chore: eliminar stub ruta-del-dia con URL incorrecta"
```

---

## Task 2: Migraciones SQL + regenerar tipos

**Files:**
- Create: `erp-vitrinas/supabase/migrations/20260011_nota_reasignacion_rutas.sql`
- Create: `erp-vitrinas/supabase/migrations/20260012_detalle_visita_update_policy.sql`
- Modify: `erp-vitrinas/supabase/config.toml`
- Modify: `erp-vitrinas/lib/supabase/database.types.ts`

- [ ] **Crear migración 11:**
```sql
-- erp-vitrinas/supabase/migrations/20260011_nota_reasignacion_rutas.sql
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS nota_reasignacion TEXT;
```

- [ ] **Crear migración 12:**
```sql
-- erp-vitrinas/supabase/migrations/20260012_detalle_visita_update_policy.sql
-- Política UPDATE necesaria para upsert (INSERT ... ON CONFLICT DO UPDATE).
-- Restringe a la colaboradora dueña de la visita padre, o admin.
CREATE POLICY "detalle_visita_update" ON detalle_visita
  FOR UPDATE TO authenticated
  USING (
    get_my_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = detalle_visita.visita_id
        AND v.colaboradora_id = auth.uid()
    )
  )
  WITH CHECK (
    get_my_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = detalle_visita.visita_id
        AND v.colaboradora_id = auth.uid()
    )
  );
```

- [ ] **Agregar cron en `supabase/config.toml`** (al final del archivo, antes del bloque `[experimental]`):
```toml
[functions.generar-visitas-diarias]
schedule = "0 5 * * *"
```

- [ ] **Aplicar migraciones y regenerar tipos:**
```bash
cd erp-vitrinas
supabase db reset
supabase gen types typescript --local > lib/supabase/database.types.ts
```
Expected: `database.types.ts` actualizado con `nota_reasignacion` en `rutas`.

- [ ] **Commit:**
```bash
git add supabase/migrations/ supabase/config.toml lib/supabase/database.types.ts
git commit -m "feat: migraciones Sprint 3 — nota_reasignacion y RLS update detalle_visita"
```

---

## Task 3: Edge Function — generar-visitas-diarias

**Files:**
- Create: `erp-vitrinas/supabase/functions/generar-visitas-diarias/index.ts`

- [ ] **Crear la función:**

```typescript
// erp-vitrinas/supabase/functions/generar-visitas-diarias/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // Guard: fallar rápido si no hay service role key
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const hoy = new Date()
  const diaActual = DIAS_SEMANA[hoy.getDay()] // 'lunes', 'martes', etc.
  const fechaHoy = hoy.toISOString().split('T')[0] // 'YYYY-MM-DD'

  // 1. Rutas activas que tienen programado el día actual
  const { data: rutas, error: rutasError } = await supabase
    .from('rutas')
    .select('id, colaboradora_id, rutas_pdv(pdv_id, orden_visita, puntos_de_venta(id, activo))')
    .eq('estado', 'activa')
    .contains('dias_visita', [diaActual])

  if (rutasError) {
    console.error('Error fetching rutas:', rutasError.message)
    return new Response(JSON.stringify({ error: rutasError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let creadas = 0
  let omitidas = 0

  for (const ruta of rutas ?? []) {
    const pdvsActivos = (ruta.rutas_pdv ?? []).filter(
      (rp: any) => rp.puntos_de_venta?.activo === true
    )

    for (const rp of pdvsActivos) {
      const pdvId = rp.pdv_id

      // 2. Vitrina activa asignada a este PDV
      const { data: vitrina } = await supabase
        .from('vitrinas')
        .select('id')
        .eq('pdv_id', pdvId)
        .eq('estado', 'activa')
        .maybeSingle()

      if (!vitrina) continue // PDV sin vitrina activa — saltar

      // 3. Idempotencia: ya existe planificada para hoy con esta combinación?
      const { data: existente } = await supabase
        .from('visitas')
        .select('id')
        .eq('pdv_id', pdvId)
        .eq('vitrina_id', vitrina.id)
        .eq('colaboradora_id', ruta.colaboradora_id)
        .eq('estado', 'planificada')
        .gte('created_at', `${fechaHoy}T00:00:00.000Z`)
        .lt('created_at', `${fechaHoy}T23:59:59.999Z`)
        .maybeSingle()

      if (existente) {
        omitidas++
        continue
      }

      // 4. Insertar visita planificada
      const { error: insertError } = await supabase.from('visitas').insert({
        ruta_id: ruta.id,
        pdv_id: pdvId,
        vitrina_id: vitrina.id,
        colaboradora_id: ruta.colaboradora_id,
        estado: 'planificada',
      })

      if (insertError) {
        console.error(`Error inserting visita for pdv ${pdvId}:`, insertError.message)
      } else {
        creadas++
      }
    }
  }

  console.log(`Visitas generadas: ${creadas}, omitidas (ya existían): ${omitidas}`)
  return new Response(JSON.stringify({ creadas, omitidas }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Verificar que la función se puede invocar localmente** (con Supabase corriendo):
```bash
cd erp-vitrinas
supabase functions serve generar-visitas-diarias
# En otra terminal:
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generar-visitas-diarias' \
  --header 'Authorization: Bearer <anon_key_del_env_local>'
# Expected: {"creadas": N, "omitidas": M} con status 200
```

- [ ] **Commit:**
```bash
git add supabase/functions/
git commit -m "feat: Edge Function generar-visitas-diarias con cron 5am"
```

---

## Task 4: Hook useRutaDelDia

**Files:**
- Modify: `erp-vitrinas/lib/hooks/useRutaDelDia.ts`

- [ ] **Implementar el hook:**

```typescript
// erp-vitrinas/lib/hooks/useRutaDelDia.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type VisitaDelDia = {
  id: string
  estado: 'planificada' | 'en_ejecucion' | 'completada' | 'no_realizada'
  fecha_hora_inicio: string | null
  fecha_hora_fin: string | null
  monto_calculado: number
  motivo_no_realizada: string | null
  pdv: { nombre_comercial: string; direccion: string | null }
  ruta: { nombre: string }
  orden_visita: number
}

export function useRutaDelDia() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['ruta-del-dia'],
    queryFn: async (): Promise<VisitaDelDia[]> => {
      const hoy = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('visitas')
        .select(`
          id,
          estado,
          fecha_hora_inicio,
          fecha_hora_fin,
          monto_calculado,
          motivo_no_realizada,
          puntos_de_venta(nombre_comercial, direccion),
          rutas(nombre),
          rutas_pdv!inner(orden_visita)
        `)
        .eq('rutas_pdv.ruta_id', 'rutas.id' as any) // join hint
        .or(
          `and(estado.eq.planificada,created_at.gte.${hoy}T00:00:00.000Z,created_at.lte.${hoy}T23:59:59.999Z),` +
          `and(estado.in.(en_ejecucion,completada,no_realizada),fecha_hora_inicio.not.is.null,fecha_hora_inicio.gte.${hoy}T00:00:00.000Z,fecha_hora_inicio.lte.${hoy}T23:59:59.999Z)`
        )
        .order('rutas_pdv(orden_visita)')

      if (error) throw new Error(error.message)

      return (data ?? []).map((v: any) => ({
        id: v.id,
        estado: v.estado,
        fecha_hora_inicio: v.fecha_hora_inicio,
        fecha_hora_fin: v.fecha_hora_fin,
        monto_calculado: v.monto_calculado ?? 0,
        motivo_no_realizada: v.motivo_no_realizada,
        pdv: v.puntos_de_venta,
        ruta: v.rutas,
        orden_visita: v.rutas_pdv?.orden_visita ?? 0,
      })) as VisitaDelDia[]
    },
  })
}
```

> **Nota:** PostgREST no soporta fácilmente el OR con fecha en el campo correcto según el estado. Si la query compleja con `.or()` da problemas, simplificarla a dos queries paralelas y combinar los resultados en el cliente:
> ```typescript
> const [planificadas, activas] = await Promise.all([
>   supabase.from('visitas').select(...).eq('estado','planificada').gte('created_at',`${hoy}...`),
>   supabase.from('visitas').select(...).in('estado',['en_ejecucion','completada','no_realizada']).not('fecha_hora_inicio','is',null).gte('fecha_hora_inicio',`${hoy}...`)
> ])
> return [...(planificadas.data ?? []), ...(activas.data ?? [])].sort((a,b)=>a.orden_visita-b.orden_visita)
> ```

- [ ] **Verificar con `npm run type-check` en `erp-vitrinas/`:**
```bash
cd erp-vitrinas && npm run type-check
```
Expected: 0 errores.

- [ ] **Commit:**
```bash
git add lib/hooks/useRutaDelDia.ts
git commit -m "feat: hook useRutaDelDia — visitas del día para colaboradora"
```

---

## Task 5: Componente RutaDelDiaCard

**Files:**
- Create: `erp-vitrinas/components/campo/RutaDelDiaCard.tsx`

- [ ] **Implementar el componente:**

```tsx
// erp-vitrinas/components/campo/RutaDelDiaCard.tsx
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { VisitaDelDia } from '@/lib/hooks/useRutaDelDia'

const estadoConfig: Record<
  VisitaDelDia['estado'],
  { label: string; className: string }
> = {
  planificada: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  en_ejecucion: { label: 'En ejecución', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completada: { label: 'Completada', className: 'bg-green-100 text-green-700 border-green-200' },
  no_realizada: { label: 'No realizada', className: 'bg-red-100 text-red-600 border-red-200' },
}

interface Props {
  visita: VisitaDelDia
}

function formatHora(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monto)
}

export function RutaDelDiaCard({ visita }: Props) {
  const cfg = estadoConfig[visita.estado]

  return (
    <div
      className={`rounded-xl border p-4 ${
        visita.estado === 'en_ejecucion'
          ? 'border-blue-400 bg-blue-50'
          : visita.estado === 'completada'
          ? 'border-green-300 bg-green-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-400">#{visita.orden_visita}</span>
            <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
          </div>
          <p className="font-semibold text-slate-900 truncate">{visita.pdv.nombre_comercial}</p>
          {visita.pdv.direccion && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{visita.pdv.direccion}</p>
          )}

          {/* Completada: muestra hora y monto */}
          {visita.estado === 'completada' && (
            <p className="text-xs text-green-700 mt-1">
              {formatHora(visita.fecha_hora_fin)} · {formatMonto(visita.monto_calculado)}
            </p>
          )}

          {/* No realizada: muestra motivo */}
          {visita.estado === 'no_realizada' && visita.motivo_no_realizada && (
            <p className="text-xs text-red-600 mt-1 truncate">{visita.motivo_no_realizada}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="shrink-0">
          {visita.estado === 'planificada' && (
            <Link href={`/campo/visita/${visita.id}`}>
              <Button size="sm" variant="outline">Iniciar →</Button>
            </Link>
          )}
          {visita.estado === 'en_ejecucion' && (
            <Link href={`/campo/visita/${visita.id}`}>
              <Button size="sm">Continuar →</Button>
            </Link>
          )}
        </div>
      </div>

      {/* En ejecución: muestra hora de inicio */}
      {visita.estado === 'en_ejecucion' && visita.fecha_hora_inicio && (
        <p className="text-xs text-blue-600 mt-2">Iniciada a las {formatHora(visita.fecha_hora_inicio)}</p>
      )}
    </div>
  )
}
```

- [ ] **Verificar tipos:**
```bash
cd erp-vitrinas && npm run type-check
```
Expected: 0 errores.

- [ ] **Commit:**
```bash
git add components/campo/RutaDelDiaCard.tsx
git commit -m "feat: componente RutaDelDiaCard para lista de ruta del día"
```

---

## Task 6: Página Ruta del Día

**Files:**
- Create: `erp-vitrinas/app/(campo)/campo/ruta-del-dia/page.tsx`

- [ ] **Crear el directorio y la página:**

```tsx
// erp-vitrinas/app/(campo)/campo/ruta-del-dia/page.tsx
'use client'

import { useRutaDelDia } from '@/lib/hooks/useRutaDelDia'
import { RutaDelDiaCard } from '@/components/campo/RutaDelDiaCard'
import { Skeleton } from '@/components/ui/skeleton'

function formatFecha(): string {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function RutaDelDiaPage() {
  const { data: visitas = [], isLoading, error } = useRutaDelDia()

  const completadas = visitas.filter((v) => v.estado === 'completada').length
  const rutaNombre = visitas[0]?.ruta?.nombre ?? 'Ruta del día'

  if (isLoading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <p className="text-red-600">Error cargando la ruta: {error.message}</p>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{rutaNombre}</h1>
          <p className="text-sm text-slate-500 capitalize">{formatFecha()}</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-slate-700">
            {completadas}/{visitas.length}
          </span>
          <p className="text-xs text-slate-400">completadas</p>
        </div>
      </div>

      {/* Lista de PDVs */}
      {visitas.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No hay visitas programadas para hoy.</p>
      ) : (
        <div className="space-y-3">
          {visitas.map((visita) => (
            <RutaDelDiaCard key={visita.id} visita={visita} />
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Verificar que la ruta es accesible** (con `npm run dev` corriendo):
```
Navegar a http://localhost:3000/campo/ruta-del-dia
Expected: renderiza sin error de "Page not found"
```

- [ ] **Commit:**
```bash
git add app/\(campo\)/campo/ruta-del-dia/
git commit -m "feat: página ruta del día para colaboradora (S3-01)"
```

---

## Task 7: Hook useVisita

**Files:**
- Modify: `erp-vitrinas/lib/hooks/useVisita.ts`

Este hook hace 4 queries paralelas y las combina en un objeto rico.

- [ ] **Implementar:**

```typescript
// erp-vitrinas/lib/hooks/useVisita.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type ItemConteo = {
  productoId: string
  nombre: string
  precioUnitario: number
  invAnterior: number
  invActual: number | null        // null = no ingresado aún
  unidadesVendidas: number        // calculado live: max(invAnterior - invActual, 0)
  subtotal: number                // live: unidadesVendidas * precioUnitario
}

export type VisitaDetalle = {
  id: string
  estado: 'planificada' | 'en_ejecucion' | 'completada' | 'no_realizada'
  fecha_hora_inicio: string | null
  monto_calculado: number
  pdvNombre: string
  vitrinaCodigo: string
  items: ItemConteo[]
}

function calcItem(
  productoId: string,
  nombre: string,
  precio: number,
  invAnterior: number,
  invActual: number | null
): ItemConteo {
  const vendidas = invActual !== null ? Math.max(invAnterior - invActual, 0) : 0
  return {
    productoId,
    nombre,
    precioUnitario: precio,
    invAnterior,
    invActual,
    unidadesVendidas: vendidas,
    subtotal: vendidas * precio,
  }
}

export function useVisita(id: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['visita', id],
    enabled: !!id,
    queryFn: async (): Promise<VisitaDetalle> => {
      // Query 1: datos de la visita
      const { data: visita, error: vErr } = await supabase
        .from('visitas')
        .select('id, estado, fecha_hora_inicio, monto_calculado, vitrina_id, puntos_de_venta(nombre_comercial), vitrinas(codigo)')
        .eq('id', id)
        .single()
      if (vErr || !visita) throw new Error(vErr?.message ?? 'Visita no encontrada')

      const vitrinaId = visita.vitrina_id

      // Queries 2-4 en paralelo
      const [surtidoRes, inventarioRes, detalleRes] = await Promise.all([
        // 2. Productos del surtido estándar de esta vitrina
        supabase
          .from('surtido_estandar')
          .select('producto_id, cantidad_objetivo, productos(id, nombre, precio_venta_comercio)')
          .eq('vitrina_id', vitrinaId),

        // 3. Inventario actual por producto en esta vitrina
        supabase
          .from('inventario_vitrina')
          .select('producto_id, cantidad_actual')
          .eq('vitrina_id', vitrinaId),

        // 4. Detalle de visita existente (si ya se guardó conteo parcial)
        supabase
          .from('detalle_visita')
          .select('producto_id, inv_anterior, inv_actual')
          .eq('visita_id', id),
      ])

      if (surtidoRes.error) throw new Error(surtidoRes.error.message)

      // Mapas para lookup O(1)
      const inventarioMap = new Map(
        (inventarioRes.data ?? []).map((iv) => [iv.producto_id, iv.cantidad_actual])
      )
      const detalleMap = new Map(
        (detalleRes.data ?? []).map((d) => [d.producto_id, d])
      )

      const items: ItemConteo[] = (surtidoRes.data ?? []).map((se) => {
        const prod = se.productos as { id: string; nombre: string; precio_venta_comercio: number } | null
        if (!prod) return null

        const invAnterior = inventarioMap.get(prod.id) ?? 0  // 0 para primera visita
        const detalle = detalleMap.get(prod.id)
        const invActual = detalle ? detalle.inv_actual : null  // null = no ingresado

        return calcItem(prod.id, prod.nombre, prod.precio_venta_comercio, invAnterior, invActual)
      }).filter(Boolean) as ItemConteo[]

      return {
        id: visita.id,
        estado: visita.estado as VisitaDetalle['estado'],
        fecha_hora_inicio: visita.fecha_hora_inicio,
        monto_calculado: visita.monto_calculado ?? 0,
        pdvNombre: (visita.puntos_de_venta as any)?.nombre_comercial ?? '',
        vitrinaCodigo: (visita.vitrinas as any)?.codigo ?? '',
        items,
      }
    },
  })

  // Mutation: iniciar visita (planificada → en_ejecucion)
  const iniciarVisita = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('visitas')
        .update({ estado: 'en_ejecucion', fecha_hora_inicio: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  // Mutation: guardar conteo (upsert detalle_visita)
  const guardarConteo = useMutation({
    mutationFn: async (items: ItemConteo[]) => {
      const rows = items.map((item) => ({
        visita_id: id,
        producto_id: item.productoId,
        inv_anterior: item.invAnterior,
        inv_actual: item.invActual ?? 0,
        precio_unitario: item.precioUnitario,
        unidades_repuestas: 0, // Sprint 4
      }))

      const { error } = await supabase
        .from('detalle_visita')
        .upsert(rows, {
          onConflict: 'visita_id,producto_id',
          ignoreDuplicates: false,
        })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  // Mutation: marcar como no realizada
  const marcarNoRealizada = useMutation({
    mutationFn: async (motivo: string) => {
      if (!motivo.trim()) throw new Error('El motivo es requerido')
      const { error } = await supabase
        .from('visitas')
        .update({ estado: 'no_realizada', motivo_no_realizada: motivo.trim() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  return { ...query, iniciarVisita, guardarConteo, marcarNoRealizada }
}
```

- [ ] **Verificar tipos:**
```bash
cd erp-vitrinas && npm run type-check
```
Expected: 0 errores.

- [ ] **Commit:**
```bash
git add lib/hooks/useVisita.ts
git commit -m "feat: hook useVisita — get + iniciarVisita + guardarConteo + marcarNoRealizada"
```

---

## Task 8: ConteoTable — tabla editable con cálculo live

**Files:**
- Create: `erp-vitrinas/components/campo/ConteoTable.tsx`

- [ ] **Implementar:**

```tsx
// erp-vitrinas/components/campo/ConteoTable.tsx
'use client'

import type { ItemConteo } from '@/lib/hooks/useVisita'

function formatMonto(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  items: ItemConteo[]
  onChange: (productoId: string, invActual: number | null) => void
}

export function ConteoTable({ items, onChange }: Props) {
  const total = items.reduce((acc, item) => acc + item.subtotal, 0)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-left px-3 py-2">Producto</th>
              <th className="text-center px-2 py-2 w-12">Ant</th>
              <th className="text-center px-2 py-2 w-16">Act</th>
              <th className="text-right px-3 py-2 w-24">Ventas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.productoId} className="align-middle">
                <td className="px-3 py-2 text-slate-800 font-medium">{item.nombre}</td>
                <td className="px-2 py-2 text-center text-slate-400">{item.invAnterior}</td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="number"
                    min={0}
                    value={item.invActual ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      onChange(item.productoId, val === '' ? null : Math.max(0, parseInt(val, 10)))
                    }}
                    className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="—"
                    aria-label={`Inventario actual de ${item.nombre}`}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {item.invActual !== null ? (
                    <span className={item.unidadesVendidas > 0 ? 'text-green-700 font-semibold' : 'text-slate-400'}>
                      {item.unidadesVendidas > 0 ? formatMonto(item.subtotal) : '—'}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
        <span className="text-sm text-slate-600 font-medium">Total a cobrar</span>
        <span className="text-lg font-bold text-green-700">{formatMonto(total)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Commit:**
```bash
git add components/campo/ConteoTable.tsx
git commit -m "feat: ConteoTable — tabla editable con cálculo live de ventas y total"
```

---

## Task 9: VisitaInicioView y VisitaConteoView

**Files:**
- Create: `erp-vitrinas/components/campo/VisitaInicioView.tsx`
- Create: `erp-vitrinas/components/campo/VisitaConteoView.tsx`

- [ ] **VisitaInicioView — pantalla de inicio (estado planificada):**

```tsx
// erp-vitrinas/components/campo/VisitaInicioView.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { VisitaDetalle } from '@/lib/hooks/useVisita'
import type { UseMutationResult } from '@tanstack/react-query'

interface Props {
  visita: VisitaDetalle
  iniciarVisita: UseMutationResult<void, Error, void>
  marcarNoRealizada: UseMutationResult<void, Error, string>
}

export function VisitaInicioView({ visita, iniciarVisita, marcarNoRealizada }: Props) {
  const [showMotivo, setShowMotivo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [motivoError, setMotivoError] = useState('')

  function handleIniciar() {
    iniciarVisita.mutate(undefined, {
      onError: (err) => toast.error(err.message),
    })
  }

  function handleNoRealizada() {
    if (!motivo.trim()) {
      setMotivoError('El motivo es requerido')
      return
    }
    setMotivoError('')
    marcarNoRealizada.mutate(motivo.trim(), {
      onSuccess: () => toast.success('Visita marcada como no realizada'),
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4">
      {/* Info vitrina */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Vitrina</p>
        <p className="font-semibold text-slate-900">{visita.vitrinaCodigo}</p>
      </div>

      {/* Inventario anterior */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Inventario anterior</p>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {visita.items.map((item) => (
              <tr key={item.productoId}>
                <td className="px-4 py-2 text-slate-700">{item.nombre}</td>
                <td className="px-4 py-2 text-right font-semibold text-slate-900">
                  {item.invAnterior} u.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Acciones */}
      <Button
        className="w-full"
        onClick={handleIniciar}
        disabled={iniciarVisita.isPending}
      >
        {iniciarVisita.isPending ? 'Iniciando…' : 'Iniciar visita'}
      </Button>

      {!showMotivo ? (
        <Button
          variant="ghost"
          className="w-full text-slate-500"
          onClick={() => setShowMotivo(true)}
        >
          Marcar como no realizada
        </Button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setMotivoError('') }}
            placeholder="Motivo por el que no se realizó la visita…"
            rows={3}
          />
          {motivoError && <p className="text-xs text-red-600">{motivoError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowMotivo(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleNoRealizada}
              disabled={marcarNoRealizada.isPending}
            >
              {marcarNoRealizada.isPending ? 'Guardando…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **VisitaConteoView — pantalla de conteo (estado en_ejecucion):**

```tsx
// erp-vitrinas/components/campo/VisitaConteoView.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ConteoTable } from '@/components/campo/ConteoTable'
import type { VisitaDetalle, ItemConteo } from '@/lib/hooks/useVisita'
import type { UseMutationResult } from '@tanstack/react-query'

function recalc(item: ItemConteo, invActual: number | null): ItemConteo {
  const vendidas = invActual !== null ? Math.max(item.invAnterior - invActual, 0) : 0
  return { ...item, invActual, unidadesVendidas: vendidas, subtotal: vendidas * item.precioUnitario }
}

interface Props {
  visita: VisitaDetalle
  guardarConteo: UseMutationResult<void, Error, ItemConteo[]>
}

export function VisitaConteoView({ visita, guardarConteo }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ItemConteo[]>(visita.items)

  function handleChange(productoId: string, invActual: number | null) {
    setItems((prev) =>
      prev.map((item) => item.productoId === productoId ? recalc(item, invActual) : item)
    )
  }

  const todosIngresados = useMemo(
    () => items.every((item) => item.invActual !== null),
    [items]
  )

  function handleGuardar() {
    if (!todosIngresados) {
      toast.error('Ingresa el inventario actual de todos los productos antes de guardar')
      return
    }
    guardarConteo.mutate(items, {
      onSuccess: () => {
        toast.success('Conteo guardado correctamente')
        router.push('/campo/ruta-del-dia')
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4">
      <ConteoTable items={items} onChange={handleChange} />
      <Button
        className="w-full"
        onClick={handleGuardar}
        disabled={guardarConteo.isPending || !todosIngresados}
      >
        {guardarConteo.isPending ? 'Guardando…' : 'Guardar conteo'}
      </Button>
    </div>
  )
}
```

- [ ] **Verificar tipos:**
```bash
cd erp-vitrinas && npm run type-check
```

- [ ] **Commit:**
```bash
git add components/campo/
git commit -m "feat: VisitaInicioView y VisitaConteoView — pantallas del flujo de visita"
```

---

## Task 10: Página visita/[id]

**Files:**
- Create: `erp-vitrinas/app/(campo)/campo/visita/[id]/page.tsx`

- [ ] **Implementar:**

```tsx
// erp-vitrinas/app/(campo)/campo/visita/[id]/page.tsx
'use client'

import { use } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useVisita } from '@/lib/hooks/useVisita'
import { VisitaInicioView } from '@/components/campo/VisitaInicioView'
import { VisitaConteoView } from '@/components/campo/VisitaConteoView'

interface Props {
  params: Promise<{ id: string }>
}

export default function VisitaPage({ params }: Props) {
  const { id } = use(params)  // Next.js 15+: params es una Promise
  const { data: visita, isLoading, error, iniciarVisita, guardarConteo, marcarNoRealizada } = useVisita(id)

  if (isLoading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-md" />
      </main>
    )
  }

  if (error || !visita) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <p className="text-red-600">Error: {error?.message ?? 'Visita no encontrada'}</p>
        <Link href="/campo/ruta-del-dia" className="text-blue-600 underline text-sm">
          ← Volver a la ruta
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/campo/ruta-del-dia" className="text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bold text-slate-900">{visita.pdvNombre}</h1>
          <p className="text-xs text-slate-500">Vitrina {visita.vitrinaCodigo}</p>
        </div>
      </div>

      {/* Vista según estado */}
      {visita.estado === 'planificada' && (
        <VisitaInicioView
          visita={visita}
          iniciarVisita={iniciarVisita}
          marcarNoRealizada={marcarNoRealizada}
        />
      )}

      {visita.estado === 'en_ejecucion' && (
        <VisitaConteoView visita={visita} guardarConteo={guardarConteo} />
      )}

      {(visita.estado === 'completada' || visita.estado === 'no_realizada') && (
        <div className="text-center py-8 text-slate-500">
          <p>Esta visita ya está {visita.estado === 'completada' ? 'completada' : 'marcada como no realizada'}.</p>
          <Link href="/campo/ruta-del-dia" className="text-blue-600 underline text-sm mt-2 block">
            ← Volver a la ruta
          </Link>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Verificar `type-check` y que la ruta `/campo/visita/[id]` no da 404 con dev server.**

- [ ] **Commit:**
```bash
git add app/\(campo\)/campo/visita/
git commit -m "feat: página detalle de visita — inicio y conteo (S3-04, S3-05, S3-06)"
```

---

## Task 11: Hook useVisitas (admin) + VisitasTable + página /admin/visitas

**Files:**
- Modify: `erp-vitrinas/lib/hooks/useVisitas.ts`
- Create: `erp-vitrinas/components/admin/VisitasTable.tsx`
- Create: `erp-vitrinas/app/(admin)/admin/visitas/page.tsx`

- [ ] **Implementar useVisitas:**

```typescript
// erp-vitrinas/lib/hooks/useVisitas.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type FiltrosVisitas = {
  fechaDesde?: string   // 'YYYY-MM-DD'
  fechaHasta?: string
  rutaId?: string
  colaboradoraId?: string
  estados?: string[]
}

export type VisitaAdmin = {
  id: string
  estado: string
  fecha_hora_inicio: string | null
  monto_calculado: number
  pdvNombre: string
  vitrinaCodigo: string
  rutaNombre: string
  colaboradoraNombre: string
}

export function useVisitas(filtros: FiltrosVisitas = {}) {
  const supabase = createClient()
  const hoy = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['visitas', filtros],
    queryFn: async (): Promise<VisitaAdmin[]> => {
      const desde = filtros.fechaDesde ?? hoy
      const hasta = filtros.fechaHasta ?? hoy

      let q = supabase
        .from('visitas')
        .select(`
          id, estado, fecha_hora_inicio, monto_calculado,
          puntos_de_venta(nombre_comercial),
          vitrinas(codigo),
          rutas(nombre),
          usuarios!visitas_colaboradora_id_fkey(nombre)
        `)
        .gte('created_at', `${desde}T00:00:00.000Z`)
        .lte('created_at', `${hasta}T23:59:59.999Z`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filtros.rutaId) q = q.eq('ruta_id', filtros.rutaId)
      if (filtros.colaboradoraId) q = q.eq('colaboradora_id', filtros.colaboradoraId)
      if (filtros.estados?.length) q = q.in('estado', filtros.estados)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      return (data ?? []).map((v: any) => ({
        id: v.id,
        estado: v.estado,
        fecha_hora_inicio: v.fecha_hora_inicio,
        monto_calculado: v.monto_calculado ?? 0,
        pdvNombre: v.puntos_de_venta?.nombre_comercial ?? '—',
        vitrinaCodigo: v.vitrinas?.codigo ?? '—',
        rutaNombre: v.rutas?.nombre ?? '—',
        colaboradoraNombre: v.usuarios?.nombre ?? '—',
      }))
    },
  })
}
```

- [ ] **Implementar VisitasTable:**

```tsx
// erp-vitrinas/components/admin/VisitasTable.tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { useVisitas, type FiltrosVisitas, type VisitaAdmin } from '@/lib/hooks/useVisitas'
import { useRutas } from '@/lib/hooks/useRutas'
import { useColaboradoras } from '@/lib/hooks/useColaboradoras'

const estadoBadgeClass: Record<string, string> = {
  planificada: 'bg-slate-100 text-slate-600 border-slate-200',
  en_ejecucion: 'bg-blue-100 text-blue-700 border-blue-200',
  completada: 'bg-green-100 text-green-700 border-green-200',
  no_realizada: 'bg-red-100 text-red-600 border-red-200',
}

function formatMonto(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

export function VisitasTable() {
  const hoy = new Date().toISOString().split('T')[0]
  const [filtros, setFiltros] = useState<FiltrosVisitas>({ fechaDesde: hoy, fechaHasta: hoy })

  const { data: visitas = [], isLoading } = useVisitas(filtros)
  const { data: rutas = [] } = useRutas()
  const { data: colaboradoras = [] } = useColaboradoras()

  const columns: Column<VisitaAdmin>[] = [
    {
      header: 'Fecha',
      accessor: (v) =>
        v.fecha_hora_inicio
          ? new Date(v.fecha_hora_inicio).toLocaleDateString('es-CO')
          : new Date().toLocaleDateString('es-CO'),
    },
    { header: 'Ruta', accessor: (v) => v.rutaNombre },
    { header: 'Colaboradora', accessor: (v) => v.colaboradoraNombre },
    { header: 'PDV', accessor: (v) => v.pdvNombre },
    { header: 'Vitrina', accessor: (v) => v.vitrinaCodigo },
    {
      header: 'Estado',
      accessor: (v) => (
        <Badge className={`text-xs ${estadoBadgeClass[v.estado] ?? ''}`}>
          {v.estado.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Monto',
      accessor: (v) =>
        v.estado === 'completada' ? formatMonto(v.monto_calculado) : '—',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2 items-center">
          <Input
            type="date"
            value={filtros.fechaDesde ?? hoy}
            onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))}
            className="w-36"
          />
          <span className="text-slate-400 text-sm">–</span>
          <Input
            type="date"
            value={filtros.fechaHasta ?? hoy}
            onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))}
            className="w-36"
          />
        </div>

        <Select
          value={filtros.rutaId ?? 'todas'}
          onValueChange={(v) => setFiltros((f) => ({ ...f, rutaId: v === 'todas' ? undefined : v }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ruta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las rutas</SelectItem>
            {rutas.map((r) => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filtros.colaboradoraId ?? 'todas'}
          onValueChange={(v) => setFiltros((f) => ({ ...f, colaboradoraId: v === 'todas' ? undefined : v }))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Colaboradora" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {colaboradoras.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <DataTable columns={columns} data={visitas} isLoading={isLoading} />
    </div>
  )
}
```

- [ ] **Implementar página admin/visitas:**

```tsx
// erp-vitrinas/app/(admin)/admin/visitas/page.tsx
'use client'

import { VisitasTable } from '@/components/admin/VisitasTable'

export default function VisitasPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Visitas</h1>
      <VisitasTable />
    </main>
  )
}
```

- [ ] **Verificar `type-check`.**

- [ ] **Commit:**
```bash
git add lib/hooks/useVisitas.ts components/admin/VisitasTable.tsx app/\(admin\)/admin/visitas/
git commit -m "feat: módulo admin de visitas — hook + tabla + página con filtros (S3-02)"
```

---

## Task 12: Reasignación temporal de ruta (S3-03)

**Files:**
- Modify: `erp-vitrinas/lib/validations/rutas.ts`
- Modify: `erp-vitrinas/lib/hooks/useRutas.ts`
- Modify: `erp-vitrinas/components/admin/RutaSheet.tsx`

- [ ] **Agregar `nota_reasignacion` al schema de rutas.** Buscar el schema de rutas en `lib/validations/rutas.ts` y agregar el campo:
```typescript
nota_reasignacion: z.string().optional(),
```

- [ ] **Agregar `nota_reasignacion` a la mutation `useUpdateRuta`** en `lib/hooks/useRutas.ts`. Asegurarse de que el campo se incluya al construir el objeto de actualización.

- [ ] **Agregar textarea en `RutaSheet.tsx`** debajo del campo `colaboradora_id`:
```tsx
{/* Debajo del select de colaboradora_id */}
<FormField
  control={form.control}
  name="nota_reasignacion"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Nota de reasignación <span className="text-slate-400 font-normal">(opcional)</span></FormLabel>
      <FormControl>
        <Textarea
          {...field}
          placeholder="Motivo del cambio de colaboradora…"
          rows={2}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

- [ ] **Verificar `type-check` y lint:**
```bash
cd erp-vitrinas && npm run type-check && npm run lint
```

- [ ] **Commit:**
```bash
git add lib/validations/rutas.ts lib/hooks/useRutas.ts components/admin/RutaSheet.tsx
git commit -m "feat: reasignación temporal de ruta vía nota_reasignacion en RutaSheet (S3-03)"
```

---

## Task 13: Sidebar — agregar ítem Visitas

**Files:**
- Modify: `erp-vitrinas/components/admin/AppSidebar.tsx`

- [ ] **Abrir `AppSidebar.tsx`** y agregar un item "Visitas" apuntando a `/admin/visitas`, junto a los ítems existentes (Vitrinas, Inventario, Rutas). Seguir el patrón exacto de los ítems ya presentes.

- [ ] **Verificar visualmente con dev server** que "Visitas" aparece en el sidebar y navega correctamente.

- [ ] **Commit:**
```bash
git add components/admin/AppSidebar.tsx
git commit -m "feat: agregar Visitas al sidebar admin"
```

---

## Task 14: Tests e2e — sprint3.spec.ts

**Files:**
- Create: `erp-vitrinas/tests/sprint3.spec.ts`

- [ ] **Implementar los tests:**

```typescript
// erp-vitrinas/tests/sprint3.spec.ts
import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Cliente admin para seed (usa service role en local)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// IDs de datos de seed (definidos en 20260010_seed.sql)
// Se obtienen dinámicamente en beforeAll
let visitaId: string
let colaboradoraId: string

test.describe('Sprint 3 — Campo', () => {
  test.beforeAll(async () => {
    // Obtener colaboradora de prueba (debe existir en el seed de auth)
    const { data: colab } = await adminSupabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'colaboradora')
      .limit(1)
      .single()

    if (!colab) throw new Error('No hay usuario colaboradora en el seed. Crea uno con rol=colaboradora.')
    colaboradoraId = colab.id

    // Obtener PDV y vitrina del seed
    const { data: pdv } = await adminSupabase
      .from('puntos_de_venta')
      .select('id')
      .eq('codigo', 'PDV-001')
      .single()

    const { data: vitrina } = await adminSupabase
      .from('vitrinas')
      .select('id')
      .eq('codigo', 'VIT-001')
      .single()

    // Obtener ruta del seed (o crear una si no existe)
    let { data: ruta } = await adminSupabase
      .from('rutas')
      .select('id')
      .eq('colaboradora_id', colaboradoraId)
      .limit(1)
      .maybeSingle()

    if (!ruta) {
      const { data: newRuta } = await adminSupabase
        .from('rutas')
        .insert({
          codigo: 'RUT-TEST-S3',
          nombre: 'Ruta Test Sprint 3',
          colaboradora_id: colaboradoraId,
          dias_visita: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
          estado: 'activa',
        })
        .select('id')
        .single()
      ruta = newRuta

      // Asociar PDV a la ruta
      await adminSupabase.from('rutas_pdv').insert({
        ruta_id: ruta!.id,
        pdv_id: pdv!.id,
        orden_visita: 1,
      })
    }

    // Crear visita planificada para hoy
    const hoy = new Date().toISOString().split('T')[0]
    const { data: existente } = await adminSupabase
      .from('visitas')
      .select('id')
      .eq('pdv_id', pdv!.id)
      .eq('vitrina_id', vitrina!.id)
      .eq('colaboradora_id', colaboradoraId)
      .eq('estado', 'planificada')
      .gte('created_at', `${hoy}T00:00:00.000Z`)
      .maybeSingle()

    if (existente) {
      visitaId = existente.id
    } else {
      const { data: nuevaVisita } = await adminSupabase
        .from('visitas')
        .insert({
          ruta_id: ruta!.id,
          pdv_id: pdv!.id,
          vitrina_id: vitrina!.id,
          colaboradora_id: colaboradoraId,
          estado: 'planificada',
        })
        .select('id')
        .single()
      visitaId = nuevaVisita!.id
    }
  })

  async function loginColaboradora(page: Page) {
    // Necesita un usuario colaboradora con credenciales conocidas en el seed local
    // Ajustar email/password según el seed de usuarios de prueba
    await page.goto('/login')
    await page.getByLabel(/correo/i).fill('colaboradora@erp.local')
    await page.getByLabel(/contraseña/i).fill('Colab1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/campo/ruta-del-dia')
  }

  // Test 1: Ruta del día
  test('colaboradora ve su ruta del día con PDVs en orden', async ({ page }) => {
    await loginColaboradora(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Debe mostrar la tarjeta del PDV de prueba
    await expect(page.getByText('Tienda Demo Norte')).toBeVisible()
  })

  // Test 2: Tap en visita planificada → pantalla de inicio
  test('tap en PDV planificada muestra pantalla de inicio con inventario anterior', async ({ page }) => {
    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)
    // Muestra el nombre del PDV
    await expect(page.getByText('Tienda Demo Norte')).toBeVisible()
    // Muestra tabla de inventario anterior con los productos del surtido
    await expect(page.getByText('Audífono Básico BT')).toBeVisible()
    // Botón de iniciar visita
    await expect(page.getByRole('button', { name: /iniciar visita/i })).toBeVisible()
  })

  // Test 3: Iniciar visita → en_ejecucion + hora de inicio
  test('iniciar visita cambia estado a en_ejecucion y muestra hora', async ({ page }) => {
    // Resetear la visita a planificada para este test
    await adminSupabase.from('visitas').update({ estado: 'planificada', fecha_hora_inicio: null }).eq('id', visitaId)

    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)
    await page.getByRole('button', { name: /iniciar visita/i }).click()

    // Debe aparecer la tabla de conteo
    await expect(page.getByText('Audífono Básico BT')).toBeVisible()
    // Columna "Ant" visible
    await expect(page.locator('th', { hasText: 'Ant' })).toBeVisible()
  })

  // Test 4 + 5: Ingreso de conteos y guardar
  test('ingresa conteos, ve cálculo live y guarda correctamente', async ({ page }) => {
    // Asegurar que la visita esté en_ejecucion
    await adminSupabase
      .from('visitas')
      .update({ estado: 'en_ejecucion', fecha_hora_inicio: new Date().toISOString() })
      .eq('id', visitaId)

    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)

    // Esperar tabla editable
    await expect(page.locator('th', { hasText: 'Act' })).toBeVisible()

    // Ingresar conteos (los inputs tienen aria-label)
    const inputs = page.locator('input[type="number"]')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill('5')
    }

    // Botón guardar habilitado
    const btnGuardar = page.getByRole('button', { name: /guardar conteo/i })
    await expect(btnGuardar).toBeEnabled()
    await btnGuardar.click()

    // Redirige a ruta del día
    await page.waitForURL('/campo/ruta-del-dia')
    await expect(page.getByText('Tienda Demo Norte')).toBeVisible()
  })

  // Test 6: Marcar no realizada
  test('marcar no realizada sin motivo muestra error; con motivo cambia estado', async ({ page }) => {
    // Resetear la visita
    await adminSupabase.from('visitas').update({ estado: 'planificada', fecha_hora_inicio: null }).eq('id', visitaId)

    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)

    // Expandir sección no realizada
    await page.getByRole('button', { name: /marcar como no realizada/i }).click()

    // Intentar confirmar sin motivo
    await page.getByRole('button', { name: /confirmar/i }).click()
    await expect(page.getByText(/motivo es requerido/i)).toBeVisible()

    // Escribir motivo y confirmar
    await page.locator('textarea').fill('Local cerrado por festivo')
    await page.getByRole('button', { name: /confirmar/i }).click()
    await page.waitForURL('/campo/ruta-del-dia')
  })
})

test.describe('Sprint 3 — Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/correo/i).fill('admin@erp.local')
    await page.getByLabel(/contraseña/i).fill('Admin1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  // Test 7: Admin ve visitas del día
  test('admin ve página de visitas con filtro de fecha por defecto', async ({ page }) => {
    await page.goto('/admin/visitas')
    await expect(page.getByRole('heading', { name: 'Visitas' })).toBeVisible()
    // Los filtros de fecha deben mostrar hoy
    const hoy = new Date().toISOString().split('T')[0]
    await expect(page.locator('input[type="date"]').first()).toHaveValue(hoy)
  })

  // Test 8: Reasignación temporal de ruta
  test('admin edita ruta, cambia colaboradora y guarda nota de motivo', async ({ page }) => {
    await page.goto('/admin/rutas')
    // Abrir el sheet de edición de la primera ruta
    await page.getByRole('button', { name: /editar/i }).first().click()
    await expect(page.getByRole('heading', { name: /editar ruta/i })).toBeVisible()
    // El campo nota_reasignacion debe existir
    const textarea = page.locator('textarea[placeholder*="Motivo del cambio"]')
    await expect(textarea).toBeVisible()
    await textarea.fill('Colaboradora de licencia')
    await page.getByRole('button', { name: /guardar/i }).click()
    // Reabrir y verificar que persiste
    await page.getByRole('button', { name: /editar/i }).first().click()
    await expect(textarea).toHaveValue('Colaboradora de licencia')
  })
})
```

> **Prerrequisito:** Crear un usuario `colaboradora@erp.local` / `Colab1234!` con rol `colaboradora` en el seed local:
> ```bash
> docker exec -i supabase_db_erp-vitrinas psql -U postgres -c \
>   "UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{\"rol\": \"colaboradora\"}'::jsonb WHERE email = 'colaboradora@erp.local'"
> ```

- [ ] **Crear usuario colaboradora en Supabase local** (si no existe):
```bash
# Crear usuario vía Studio en http://127.0.0.1:54323 > Authentication > Users
# Email: colaboradora@erp.local, Password: Colab1234!
# Luego asignar rol:
docker exec -i supabase_db_erp-vitrinas psql -U postgres -c \
  "UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{\"rol\": \"colaboradora\"}'::jsonb WHERE email = 'colaboradora@erp.local'"
# Y crear registro en public.usuarios:
docker exec -i supabase_db_erp-vitrinas psql -U postgres -c \
  "INSERT INTO public.usuarios (id, nombre, email, rol) SELECT id, 'Colaboradora Test', email, 'colaboradora' FROM auth.users WHERE email='colaboradora@erp.local' ON CONFLICT (id) DO NOTHING"
```

- [ ] **Ejecutar los tests:**
```bash
cd erp-vitrinas
npx playwright test tests/sprint3.spec.ts --reporter=line
```
Expected: todos los tests pasan o se identifican errores concretos a corregir.

- [ ] **Commit:**
```bash
git add tests/sprint3.spec.ts
git commit -m "test: suite e2e Sprint 3 — ruta del día, visita, conteo, admin"
```

---

## Task 15: Verificación final + lint + marcar Sprint 3 en SPRINTS.md

- [ ] **Build completo sin errores:**
```bash
cd erp-vitrinas
npm run lint
npm run type-check
npm run build
```
Expected: 0 errores, 0 warnings de lint.

- [ ] **Actualizar `SPRINTS.md`** en la raíz del repo: marcar S3-01 a S3-06 como `[x]` y agregar el log de progreso.

- [ ] **Commit final:**
```bash
git add -A
git commit -m "docs: marcar Sprint 3 completado en SPRINTS.md"
```

- [ ] **Push y abrir PR:**
```bash
git push -u origin feature/sprint3-visitas-campo
gh pr create \
  --title "feat: Sprint 3 — Ruta del día, inicio de visita y dashboard admin" \
  --body "## Sprint 3

### Módulos entregados
- **Ruta del día** (\`/campo/ruta-del-dia\`): lista de PDVs del día en orden con estado
- **Detalle de visita** (\`/campo/visita/[id]\`): pantalla de inicio (inv_anterior) y pantalla de conteo con cálculo live
- **Dashboard admin** (\`/admin/visitas\`): DataTable con filtros de fecha, ruta, colaboradora y estado
- **Reasignación temporal** de ruta: campo \`nota_reasignacion\` en RutaSheet
- **Edge Function cron** \`generar-visitas-diarias\`: genera visitas planificadas cada día a las 5am

### Decisiones técnicas
- Hook \`useVisita\` combina 4 queries paralelas (visita + surtido + inventario + detalle) en el cliente
- \`guardarConteo\` usa upsert \`ON CONFLICT (visita_id, producto_id)\` con \`precio_unitario\` en el DO UPDATE
- \`inv_anterior = 0\` para primera visita a vitrina nueva (no existe fila en \`inventario_vitrina\`)
- Sin optimistic update en guardarConteo (múltiples inserts + trigger — spinner)

## Test plan
- [ ] \`npx playwright test tests/sprint3.spec.ts\` — 8 casos pasan
- [ ] \`npm run build\` sin errores
- [ ] Login como colaboradora y completar flujo manual en local"
```

---

## Referencia rápida de comandos

```bash
# Desde erp-vitrinas/
npm run dev          # servidor de desarrollo
npm run type-check   # verificar tipos
npm run lint         # ESLint
npm run build        # build de producción
supabase db reset    # resetear BD local + migraciones + seed
supabase gen types typescript --local > lib/supabase/database.types.ts

# Tests
npx playwright test tests/sprint3.spec.ts --reporter=line
npx playwright test tests/sprint3.spec.ts --ui   # modo visual

# Crear usuario colaboradora en local
docker exec -i supabase_db_erp-vitrinas psql -U postgres -c \
  "UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{\"rol\": \"colaboradora\"}'::jsonb WHERE email = 'colaboradora@erp.local'"
```
