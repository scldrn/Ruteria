'use client'

import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import {
  calcularResumenInventarioValorizado,
  useInventarioValorizado,
  type InventarioValorizadoItem,
} from '@/lib/hooks/useInventarioValorizado'

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
  }).format(value)
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

const columns: Column<InventarioValorizadoItem>[] = [
  {
    key: 'ubicacion',
    header: 'Ubicacion',
    render: (row) => (
      <div>
        <p className="font-medium text-slate-800">{row.ubicacion_nombre}</p>
        <p className="text-xs text-slate-400">{row.ubicacion_tipo}</p>
      </div>
    ),
  },
  {
    key: 'producto',
    header: 'Producto',
    render: (row) => (
      <div>
        <p className="font-medium text-slate-800">{row.producto_nombre}</p>
        <p className="text-xs font-mono text-slate-400">{row.producto_codigo}</p>
      </div>
    ),
  },
  {
    key: 'stock',
    header: 'Stock',
    className: 'text-right',
    render: (row) => <span className="font-semibold">{row.cantidad_actual}</span>,
  },
  {
    key: 'costo',
    header: 'Valor costo',
    className: 'text-right',
    render: (row) => formatCOP(row.valor_costo_total),
  },
  {
    key: 'venta',
    header: 'Valor venta',
    className: 'text-right',
    render: (row) => formatCOP(row.valor_venta_total),
  },
  {
    key: 'actualizado',
    header: 'Actualizado',
    render: (row) => <span className="text-xs text-slate-500">{formatFecha(row.updated_at)}</span>,
  },
]

export function InventarioValorizadoTab() {
  const { data: rows = [], isLoading } = useInventarioValorizado()
  const [search, setSearch] = useState('')
  const [ubicacionTipo, setUbicacionTipo] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [productoId, setProductoId] = useState('')

  const ubicaciones = useMemo(() => {
    const map = new Map<string, { id: string | null; nombre: string }>()
    rows.forEach((row) => {
      const key = `${row.ubicacion_tipo}:${row.ubicacion_id ?? 'central'}`
      if (!map.has(key)) {
        map.set(key, { id: row.ubicacion_id, nombre: row.ubicacion_nombre })
      }
    })
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }))
  }, [rows])

  const productos = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((row) => {
      map.set(row.producto_id, row.producto_nombre)
    })
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch =
        !term
        || row.producto_nombre.toLowerCase().includes(term)
        || row.producto_codigo.toLowerCase().includes(term)
        || row.ubicacion_nombre.toLowerCase().includes(term)

      const matchesTipo = !ubicacionTipo || row.ubicacion_tipo === ubicacionTipo
      const matchesUbicacion = !ubicacionId || row.ubicacion_id === ubicacionId
      const matchesProducto = !productoId || row.producto_id === productoId

      return matchesSearch && matchesTipo && matchesUbicacion && matchesProducto
    })
  }, [rows, search, ubicacionTipo, ubicacionId, productoId])

  const resumen = useMemo(() => calcularResumenInventarioValorizado(filtered), [filtered])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <ResumenCard label="Unidades totales" value={resumen.totalUnidades.toLocaleString('es-CO')} />
        <ResumenCard label="Valor a costo" value={formatCOP(resumen.totalCosto)} />
        <ResumenCard label="Valor a venta" value={formatCOP(resumen.totalVenta)} />
        <ResumenCard label="Margen potencial" value={formatCOP(resumen.margenPotencial)} />
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por producto o ubicacion..."
          className="min-w-[260px]"
        />

        <select
          value={ubicacionTipo}
          onChange={(event) => {
            setUbicacionTipo(event.target.value)
            setUbicacionId('')
          }}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los tipos</option>
          <option value="central">Central</option>
          <option value="colaboradora">Colaboradora</option>
          <option value="vitrina">Vitrina</option>
        </select>

        <select
          value={ubicacionId}
          onChange={(event) => setUbicacionId(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todas las ubicaciones</option>
          {ubicaciones
            .filter((item) => !ubicacionTipo || item.key.startsWith(`${ubicacionTipo}:`))
            .map((ubicacion) => (
              <option key={ubicacion.key} value={ubicacion.id ?? ''}>
                {ubicacion.nombre}
              </option>
            ))}
        </select>

        <select
          value={productoId}
          onChange={(event) => setProductoId(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los productos</option>
          {productos.map((producto) => (
            <option key={producto.id} value={producto.id}>
              {producto.nombre}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(row) => `${row.ubicacion_tipo}-${row.ubicacion_id ?? 'central'}-${row.producto_id}`}
        emptyMessage="No hay inventario valorizado para los filtros seleccionados"
      />
    </div>
  )
}

function ResumenCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
