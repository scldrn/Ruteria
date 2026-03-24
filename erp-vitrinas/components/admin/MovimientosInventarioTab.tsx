'use client'

import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { useMovimientosInventario, type MovimientoInventarioDetalle } from '@/lib/hooks/useMovimientosInventario'
import { useProductos } from '@/lib/hooks/useProductos'
import { useVitrinas } from '@/lib/hooks/useVitrinas'

const TIPOS_MOVIMIENTO = [
  'compra',
  'carga_colaboradora',
  'reposicion',
  'venta',
  'baja',
  'ajuste',
  'traslado_a_vitrina',
  'traslado_entre_vitrinas',
] as const

function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

const columns: Column<MovimientoInventarioDetalle>[] = [
  {
    key: 'fecha',
    header: 'Fecha',
    render: (row) => <span className="text-xs text-slate-500">{formatFecha(row.created_at)}</span>,
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
    key: 'tipo',
    header: 'Tipo',
    render: (row) => (
      <div>
        <p className="text-slate-700">{row.tipo}</p>
        {row.motivo_baja && <p className="text-xs text-slate-400">Motivo: {row.motivo_baja}</p>}
      </div>
    ),
  },
  {
    key: 'origen',
    header: 'Origen',
    render: (row) => row.origen_label,
  },
  {
    key: 'destino',
    header: 'Destino',
    render: (row) => row.destino_label,
  },
  {
    key: 'cantidad',
    header: 'Cantidad',
    className: 'text-right',
    render: (row) => <span className="font-semibold">{row.cantidad}</span>,
  },
  {
    key: 'usuario',
    header: 'Usuario',
    render: (row) => row.usuario_nombre,
  },
  {
    key: 'notas',
    header: 'Referencia',
    render: (row) => (
      <div className="max-w-[220px]">
        <p className="text-slate-700">{row.referencia_tipo ?? '—'}</p>
        {row.notas && <p className="text-xs text-slate-400 line-clamp-2">{row.notas}</p>}
      </div>
    ),
  },
]

export function MovimientosInventarioTab() {
  const [search, setSearch] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [productoId, setProductoId] = useState('')
  const [vitrinaId, setVitrinaId] = useState('')
  const [tipo, setTipo] = useState('')

  const { data: movimientos = [], isLoading } = useMovimientosInventario({
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    productoId: productoId || undefined,
    vitrinaId: vitrinaId || undefined,
    tipo: tipo || undefined,
  })
  const { data: productos = [] } = useProductos()
  const { data: vitrinas = [] } = useVitrinas()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return movimientos

    return movimientos.filter((row) =>
      row.producto_nombre.toLowerCase().includes(term)
      || row.producto_codigo.toLowerCase().includes(term)
      || row.origen_label.toLowerCase().includes(term)
      || row.destino_label.toLowerCase().includes(term)
      || row.usuario_nombre.toLowerCase().includes(term)
      || (row.notas ?? '').toLowerCase().includes(term)
    )
  }, [movimientos, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por producto, ubicacion o usuario..."
          className="min-w-[260px]"
        />

        <input
          type="date"
          value={fechaDesde}
          onChange={(event) => setFechaDesde(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Fecha desde"
        />

        <input
          type="date"
          value={fechaHasta}
          onChange={(event) => setFechaHasta(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Fecha hasta"
        />

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

        <select
          value={vitrinaId}
          onChange={(event) => setVitrinaId(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todas las vitrinas</option>
          {vitrinas.map((vitrina) => (
            <option key={vitrina.id} value={vitrina.id}>
              {vitrina.codigo}
            </option>
          ))}
        </select>

        <select
          value={tipo}
          onChange={(event) => setTipo(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_MOVIMIENTO.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(row) => row.id}
        emptyMessage="No hay movimientos para los filtros seleccionados"
      />
    </div>
  )
}
