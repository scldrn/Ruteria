'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { UsuarioSheet } from '@/components/admin/UsuarioSheet'
import { useUsuarios } from '@/lib/hooks/useUsuarios'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']

const ROL_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  supervisor: 'bg-orange-100 text-orange-700',
  analista: 'bg-blue-100 text-blue-700',
  compras: 'bg-purple-100 text-purple-700',
  colaboradora: 'bg-green-100 text-green-700',
}

export default function UsuariosPage() {
  const { data: usuarios = [], isLoading } = useUsuarios()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)

  const columns = useMemo<Column<Usuario>[]>(() => [
    { key: 'nombre', header: 'Nombre', render: (u) => u.nombre },
    { key: 'email', header: 'Correo', render: (u) => <span className="text-slate-500">{u.email}</span> },
    {
      key: 'rol',
      header: 'Rol',
      render: (u) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROL_COLORS[u.rol] ?? 'bg-slate-100 text-slate-700'}`}>
          {u.rol}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (u) => <Badge variant={u.activo ? 'default' : 'secondary'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'acciones',
      header: '',
      render: (u) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setSheetOpen(true) }}>
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
          <h1 className="text-2xl font-semibold text-slate-800">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">{usuarios.length} usuarios registrados</p>
        </div>
        <Button className="bg-[#6366f1] hover:bg-indigo-500" onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1.5" /> Nuevo usuario
        </Button>
      </div>
      <DataTable columns={columns} data={usuarios} isLoading={isLoading} getRowKey={(u) => u.id} />
      <UsuarioSheet open={sheetOpen} onClose={() => setSheetOpen(false)} usuario={editing} />
    </div>
  )
}
