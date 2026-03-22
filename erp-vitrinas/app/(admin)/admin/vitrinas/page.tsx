'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Eye, ArchiveX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { VitrinaSheet } from '@/components/admin/VitrinaSheet'
import { useVitrinas, useRetirarVitrina } from '@/lib/hooks/useVitrinas'
import type { Database } from '@/lib/supabase/database.types'

type Vitrina = Database['public']['Tables']['vitrinas']['Row'] & {
  puntos_de_venta: { nombre_comercial: string; zona_id: string | null } | null
}

// Mapa de colores para el badge de estado
const estadoBadgeClass: Record<string, string> = {
  activa: 'bg-green-100 text-green-700 border-green-200',
  inactiva: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  retirada: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function VitrinasPage() {
  const { data: vitrinas = [], isLoading } = useVitrinas()
  const retirarVitrina = useRetirarVitrina()

  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activa' | 'inactiva' | 'retirada'>('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingVitrina, setEditingVitrina] = useState<Vitrina | null>(null)
  const [retiroTarget, setRetiroTarget] = useState<Vitrina | null>(null)

  // Filtro cliente: por código o nombre del PDV
  const filtered = useMemo(() => {
    return vitrinas.filter((v) => {
      const matchSearch =
        !search ||
        v.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (v.puntos_de_venta?.nombre_comercial ?? '').toLowerCase().includes(search.toLowerCase())
      const matchEstado = filterEstado === 'todos' || v.estado === filterEstado
      return matchSearch && matchEstado
    })
  }, [vitrinas, search, filterEstado])

  const handleEditar = useCallback((v: Vitrina) => {
    setEditingVitrina(v)
    setSheetOpen(true)
  }, [])

  const handleNueva = useCallback(() => {
    setEditingVitrina(null)
    setSheetOpen(true)
  }, [])

  const handleRetiroConfirm = useCallback(async () => {
    if (!retiroTarget) return
    retirarVitrina.mutate(retiroTarget.id, {
      onSuccess: () => {
        toast.success('Vitrina retirada')
        setRetiroTarget(null)
      },
      onError: () => {
        toast.error('Error al retirar la vitrina')
        setRetiroTarget(null)
      },
    })
  }, [retiroTarget, retirarVitrina])

  const columns = useMemo<Column<Vitrina>[]>(
    () => [
      {
        key: 'codigo',
        header: 'Código',
        render: (v) => <span className="font-mono text-xs">{v.codigo}</span>,
      },
      {
        key: 'pdv',
        header: 'PDV',
        render: (v) => v.puntos_de_venta?.nombre_comercial ?? '—',
      },
      {
        key: 'zona',
        header: 'Zona',
        render: (v) => v.puntos_de_venta?.zona_id ?? '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (v) => (
          <Badge
            variant="outline"
            className={`text-xs capitalize ${estadoBadgeClass[v.estado] ?? ''}`}
          >
            {v.estado}
          </Badge>
        ),
      },
      {
        key: 'acciones',
        header: '',
        render: (v) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/vitrinas/${v.id}`}>
                <Eye size={14} aria-label="Ver detalle" />
              </Link>
            </Button>
            {/* Vitrinas retiradas no se pueden editar */}
            {v.estado !== 'retirada' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditar(v)}
              >
                <Pencil size={14} aria-label="Editar" />
              </Button>
            )}
            {/* Retirar solo si no está ya retirada */}
            {v.estado !== 'retirada' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => setRetiroTarget(v)}
              >
                <ArchiveX size={14} aria-label="Retirar" />
              </Button>
            )}
          </div>
        ),
        className: 'w-28',
      },
    ],
    [handleEditar]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Vitrinas</h1>
          <p className="text-sm text-slate-500 mt-1">{vitrinas.length} vitrinas registradas</p>
        </div>
        <Button className="bg-[#6366f1] hover:bg-indigo-500" onClick={handleNueva}>
          <Plus size={16} className="mr-1.5" /> Nueva vitrina
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código o PDV..."
          className="max-w-xs"
        />
        <select
          value={filterEstado}
          onChange={(e) =>
            setFilterEstado(e.target.value as 'todos' | 'activa' | 'inactiva' | 'retirada')
          }
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="activa">Activa</option>
          <option value="inactiva">Inactiva</option>
          <option value="retirada">Retirada</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(v) => v.id}
        emptyMessage="No hay vitrinas registradas"
      />

      <VitrinaSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setEditingVitrina(null)
        }}
        vitrina={
          editingVitrina
            ? {
                id: editingVitrina.id,
                codigo: editingVitrina.codigo,
                pdv_id: editingVitrina.pdv_id,
                tipo: editingVitrina.tipo,
                estado: editingVitrina.estado as 'activa' | 'inactiva' | 'retirada',
                notas: editingVitrina.notas,
              }
            : undefined
        }
      />

      {/* Diálogo de confirmación de retiro */}
      <AlertDialog open={!!retiroTarget} onOpenChange={(open) => !open && setRetiroTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar vitrina?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas retirar esta vitrina? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetiroConfirm}
              disabled={retirarVitrina.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {retirarVitrina.isPending ? 'Retirando...' : 'Retirar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
