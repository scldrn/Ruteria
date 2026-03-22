'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Pencil, PowerOff } from 'lucide-react'
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
import { RutaSheet } from '@/components/admin/RutaSheet'
import { useRutas, useDesactivarRuta } from '@/lib/hooks/useRutas'

// Tipo local alineado con la respuesta real del hook (refleja nullables del DB)
type RutaRow = {
  id: string
  codigo: string
  nombre: string
  colaboradora_id: string | null
  zona_id: string | null
  frecuencia: string | null
  dias_visita: string[] | null
  estado: string
  usuarios: { nombre: string } | null
  zonas: { nombre: string } | null
  rutas_pdv: { pdv_id: string; orden_visita: number }[]
  num_pdvs: number
}

// Mapa de clases para badge de estado
const estadoBadgeClass: Record<string, string> = {
  activa: 'bg-green-100 text-green-700 border-green-200',
  inactiva: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function RutasPage() {
  const { data: rutas = [], isLoading } = useRutas()
  const desactivarRuta = useDesactivarRuta()

  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activa' | 'inactiva'>('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRuta, setEditingRuta] = useState<RutaRow | null>(null)
  const [desactivarTarget, setDesactivarTarget] = useState<RutaRow | null>(null)

  // Filtro cliente: por código o nombre
  const filtered = useMemo(() => {
    return rutas.filter((r) => {
      const matchSearch =
        !search ||
        r.codigo.toLowerCase().includes(search.toLowerCase()) ||
        r.nombre.toLowerCase().includes(search.toLowerCase())
      const matchEstado = filterEstado === 'todos' || r.estado === filterEstado
      return matchSearch && matchEstado
    })
  }, [rutas, search, filterEstado])

  const handleEditar = useCallback((r: RutaRow) => {
    setEditingRuta(r)
    setSheetOpen(true)
  }, [])

  const handleNueva = useCallback(() => {
    setEditingRuta(null)
    setSheetOpen(true)
  }, [])

  const handleDesactivarConfirm = useCallback(async () => {
    if (!desactivarTarget) return
    desactivarRuta.mutate(desactivarTarget.id, {
      onSuccess: () => {
        toast.success('Ruta desactivada')
        setDesactivarTarget(null)
      },
      onError: () => {
        toast.error('Error al desactivar la ruta')
        setDesactivarTarget(null)
      },
    })
  }, [desactivarTarget, desactivarRuta])

  const columns = useMemo<Column<RutaRow>[]>(
    () => [
      {
        key: 'codigo',
        header: 'Código',
        render: (r) => <span className="font-mono text-xs">{r.codigo}</span>,
      },
      {
        key: 'nombre',
        header: 'Nombre',
        render: (r) => r.nombre,
      },
      {
        key: 'colaboradora',
        header: 'Colaboradora',
        render: (r) => r.usuarios?.nombre ?? '—',
      },
      {
        key: 'zona',
        header: 'Zona',
        render: (r) => r.zonas?.nombre ?? '—',
      },
      {
        key: 'num_pdvs',
        header: 'Nº PDVs',
        render: (r) => r.num_pdvs,
      },
      {
        key: 'dias_visita',
        header: 'Días de visita',
        render: (r) =>
          r.dias_visita && r.dias_visita.length > 0
            ? r.dias_visita
                .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                .join(', ')
            : '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (r) => (
          <Badge
            variant="outline"
            className={`text-xs capitalize ${estadoBadgeClass[r.estado] ?? ''}`}
          >
            {r.estado}
          </Badge>
        ),
      },
      {
        key: 'acciones',
        header: '',
        render: (r) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleEditar(r)}>
              <Pencil size={14} aria-label="Editar" />
            </Button>
            {r.estado === 'activa' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => setDesactivarTarget(r)}
              >
                <PowerOff size={14} aria-label="Desactivar" />
              </Button>
            )}
          </div>
        ),
        className: 'w-24',
      },
    ],
    [handleEditar],
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Rutas</h1>
          <p className="text-sm text-slate-500 mt-1">{rutas.length} rutas registradas</p>
        </div>
        <Button className="bg-[#6366f1] hover:bg-indigo-500" onClick={handleNueva}>
          <Plus size={16} className="mr-1.5" /> Nueva ruta
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código o nombre..."
          className="max-w-xs"
        />
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as 'todos' | 'activa' | 'inactiva')}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="activa">Activa</option>
          <option value="inactiva">Inactiva</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(r) => r.id}
        emptyMessage="No hay rutas registradas"
      />

      <RutaSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setEditingRuta(null)
        }}
        ruta={
          editingRuta
            ? {
                id: editingRuta.id,
                codigo: editingRuta.codigo,
                nombre: editingRuta.nombre,
                colaboradora_id: editingRuta.colaboradora_id ?? '',
                zona_id: editingRuta.zona_id,
                frecuencia: (editingRuta.frecuencia ?? 'semanal') as
                  | 'diaria'
                  | 'semanal'
                  | 'quincenal',
                dias_visita: editingRuta.dias_visita ?? [],
                estado: (editingRuta.estado === 'inactiva' ? 'inactiva' : 'activa') as
                  | 'activa'
                  | 'inactiva',
                rutas_pdv: editingRuta.rutas_pdv,
              }
            : undefined
        }
      />

      {/* Diálogo de confirmación de desactivación */}
      <AlertDialog
        open={!!desactivarTarget}
        onOpenChange={(open) => !open && setDesactivarTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar ruta?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas desactivar esta ruta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDesactivarConfirm}
              disabled={desactivarRuta.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {desactivarRuta.isPending ? 'Desactivando...' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
