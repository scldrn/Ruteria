'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { useIncidencias, type IncidenciaItem } from '@/lib/hooks/useIncidencias'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import { SearchInput } from '@/components/admin/SearchInput'
import { IncidenciaDetalleSheet } from './IncidenciaDetalleSheet'
import type { UserRol } from '@/lib/validations/usuarios'

const TIPOS_INCIDENCIA = [
  'producto_defectuoso',
  'robo',
  'dano_vitrina',
  'problema_espacio',
  'cobro',
  'otro',
] as const

function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function estadoConfig(estado: string) {
  if (estado === 'abierta') return 'bg-red-100 text-red-700 border-red-200'
  if (estado === 'en_analisis') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (estado === 'resuelta') return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

export function IncidenciasTable({ rol }: { rol: UserRol }) {
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<'pendientes' | 'abierta' | 'en_analisis' | 'resuelta' | 'cerrada'>('pendientes')
  const [tipo, setTipo] = useState('')
  const [pdvId, setPdvId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [diasMinimos, setDiasMinimos] = useState('')
  const [selected, setSelected] = useState<IncidenciaItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const estados = useMemo(() => {
    if (estadoFiltro === 'pendientes') return ['abierta', 'en_analisis']
    return [estadoFiltro]
  }, [estadoFiltro])

  const { data: incidencias = [], isLoading } = useIncidencias({
    estados,
    tipo: tipo || undefined,
    pdvId: pdvId || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  })
  const { data: puntosDeVenta = [] } = usePuntosDeVenta()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const diasMin = Number(diasMinimos) || 0

    return incidencias.filter((item) => {
      const matchesSearch =
        !term
        || item.pdv_nombre.toLowerCase().includes(term)
        || (item.vitrina_codigo ?? '').toLowerCase().includes(term)
        || item.tipo.toLowerCase().includes(term)
        || item.descripcion.toLowerCase().includes(term)

      return matchesSearch && item.dias_abierta >= diasMin
    })
  }, [diasMinimos, incidencias, search])

  const columns = useMemo<Column<IncidenciaItem>[]>(() => [
    {
      key: 'apertura',
      header: 'Apertura',
      render: (row) => (
        <div>
          <p className="text-slate-700">{formatFecha(row.fecha_apertura)}</p>
          <p className="text-xs text-slate-400">{row.dias_abierta} dias</p>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (row) => row.tipo,
    },
    {
      key: 'pdv',
      header: 'PDV',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.pdv_nombre}</p>
          <p className="text-xs text-slate-400">{row.vitrina_codigo ?? 'Sin vitrina'}</p>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => (
        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${estadoConfig(row.estado)}`}>
          {row.estado}
        </span>
      ),
    },
    {
      key: 'responsable',
      header: 'Responsable',
      render: (row) => row.responsable_nombre ?? '—',
    },
    {
      key: 'fotos',
      header: 'Fotos',
      render: (row) => `${row.fotos.length}`,
    },
    {
      key: 'acciones',
      header: 'Accion',
      render: (row) => (
        <Button
          variant="outline"
          className="h-8 px-3"
          onClick={() => {
            setSelected(row)
            setSheetOpen(true)
          }}
        >
          {rol === 'analista' ? 'Ver detalle' : 'Gestionar'}
        </Button>
      ),
    },
  ], [rol])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por PDV, tipo o descripcion..."
          className="min-w-[240px]"
        />

        <select
          value={estadoFiltro}
          onChange={(event) => setEstadoFiltro(event.target.value as typeof estadoFiltro)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="pendientes">Pendientes</option>
          <option value="abierta">Abiertas</option>
          <option value="en_analisis">En analisis</option>
          <option value="resuelta">Resueltas</option>
          <option value="cerrada">Cerradas</option>
        </select>

        <select
          value={tipo}
          onChange={(event) => setTipo(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_INCIDENCIA.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={pdvId}
          onChange={(event) => setPdvId(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los PDV</option>
          {puntosDeVenta.map((pdv) => (
            <option key={pdv.id} value={pdv.id}>
              {pdv.nombre_comercial}
            </option>
          ))}
        </select>

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

        <input
          type="number"
          min="0"
          step="1"
          value={diasMinimos}
          onChange={(event) => setDiasMinimos(event.target.value)}
          placeholder="Dias abierta >= "
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Dias abierta minimos"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(row) => row.id}
        emptyMessage="No hay incidencias para los filtros seleccionados"
      />

      <IncidenciaDetalleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        incidencia={selected}
        rol={rol}
      />
    </div>
  )
}
