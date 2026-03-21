'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { CategoriaSheet } from '@/components/admin/CategoriaSheet'
import { useCategorias } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'

type Categoria = Database['public']['Tables']['categorias']['Row']

export default function CategoriasPage() {
  const { data: categorias = [], isLoading } = useCategorias()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)

  const columns = useMemo<Column<Categoria>[]>(() => [
    { key: 'nombre', header: 'Nombre', render: (c) => c.nombre },
    { key: 'descripcion', header: 'Descripción', render: (c) => c.descripcion ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (c) => (
        <Badge variant={c.activo ? 'default' : 'secondary'}>{c.activo ? 'Activa' : 'Inactiva'}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (c) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setSheetOpen(true) }}>
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
          <h1 className="text-2xl font-semibold text-slate-800">Categorías</h1>
          <p className="text-sm text-slate-500 mt-1">{categorias.length} categorías</p>
        </div>
        <Button className="bg-[#6366f1] hover:bg-indigo-500" onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1.5" /> Nueva categoría
        </Button>
      </div>
      <DataTable columns={columns} data={categorias} isLoading={isLoading} getRowKey={(c) => c.id} />
      <CategoriaSheet open={sheetOpen} onClose={() => setSheetOpen(false)} categoria={editing} />
    </div>
  )
}
