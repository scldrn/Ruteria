'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { PuntoDeVentaSheet } from '@/components/admin/PuntoDeVentaSheet'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import type { Database } from '@/lib/supabase/database.types'

type PDV = Database['public']['Tables']['puntos_de_venta']['Row'] & {
  zonas: { nombre: string } | null
}

export default function PuntosDeVentaPage() {
  const { data: pdvs = [], isLoading } = usePuntosDeVenta()
  const [search, setSearch] = useState('')
  const [filterZona, setFilterZona] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<PDV | null>(null)

  const zonaOptions = useMemo(() => {
    const seen = new Set<string>()
    return pdvs
      .filter((p) => p.zonas)
      .map((p) => p.zonas!.nombre)
      .filter((n) => { if (seen.has(n)) return false; seen.add(n); return true })
  }, [pdvs])

  const filtered = useMemo(() =>
    pdvs.filter((p) => {
      const matchSearch =
        !search ||
        p.nombre_comercial.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase())
      const matchZona = !filterZona || p.zonas?.nombre === filterZona
      return matchSearch && matchZona
    }), [pdvs, search, filterZona])

  const columns = useMemo<Column<PDV>[]>(() => [
    { key: 'codigo', header: 'Código', render: (p) => <span className="font-mono text-xs">{p.codigo}</span> },
    { key: 'nombre', header: 'Nombre comercial', render: (p) => p.nombre_comercial },
    { key: 'tipo', header: 'Tipo', render: (p) => p.tipo ?? '—' },
    { key: 'zona', header: 'Zona', render: (p) => p.zonas?.nombre ?? '—' },
    { key: 'contacto', header: 'Contacto', render: (p) => p.contacto_nombre ?? '—' },
    { key: 'pago', header: 'Forma de pago', render: (p) => p.forma_pago_preferida ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => <Badge variant={p.activo ? 'default' : 'secondary'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'acciones',
      header: '',
      render: (p) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setSheetOpen(true) }}>
          <Pencil size={14} />
        </Button>
      ),
      className: 'w-12',
    },
  ], [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Puntos de Venta</h1>
          <p className="text-sm text-slate-500 mt-1">{pdvs.length} puntos de venta</p>
        </div>
        <Button className="bg-[#6366f1] hover:bg-indigo-500" onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1.5" /> Nuevo PDV
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o código..." className="max-w-xs" />
        <select
          value={filterZona}
          onChange={(e) => setFilterZona(e.target.value)}
          aria-label="Filtrar por zona"
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las zonas</option>
          {zonaOptions.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} getRowKey={(p) => p.id} />
      <PuntoDeVentaSheet open={sheetOpen} onClose={() => setSheetOpen(false)} pdv={editing} />
    </div>
  )
}
