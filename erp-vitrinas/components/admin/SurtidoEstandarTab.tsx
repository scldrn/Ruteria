'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSurtidoEstandar } from '@/lib/hooks/useSurtidoEstandar'
import { useProductos } from '@/lib/hooks/useProductos'
import { Plus, Trash2 } from 'lucide-react'

interface SurtidoEstandarTabProps {
  vitrinaId: string
}

// Celda de cantidad editable inline
function CantidadCell({
  id,
  value,
  onSave,
}: {
  id: string
  value: number
  onSave: (id: string, cantidad: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    setDraft(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleCommit = async () => {
    const parsed = parseInt(draft, 10)
    if (isNaN(parsed) || parsed < 1) {
      setDraft(String(value))
      setEditing(false)
      return
    }
    if (parsed !== value) {
      await onSave(id, parsed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCommit()
    if (e.key === 'Escape') {
      setDraft(String(value))
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        className="w-20 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    )
  }

  return (
    <button
      onClick={handleClick}
      title="Clic para editar"
      className="px-2 py-1 rounded hover:bg-slate-100 text-sm tabular-nums cursor-text border border-transparent hover:border-slate-200 transition-colors"
    >
      {value}
    </button>
  )
}

export function SurtidoEstandarTab({ vitrinaId }: SurtidoEstandarTabProps) {
  const { data: items = [], isLoading, addItem, updateCantidad, removeItem } = useSurtidoEstandar(vitrinaId)
  const { data: productos = [], isLoading: loadingProductos } = useProductos()

  // Solo productos activos disponibles para agregar
  const productosActivos = productos.filter((p) => p.estado === 'activo')

  const [showForm, setShowForm] = useState(false)
  const [selectedProductoId, setSelectedProductoId] = useState('')
  const [cantidadObjetivo, setCantidadObjetivo] = useState('1')

  // IDs de productos ya en el surtido para evitar duplicados en el selector
  const idsEnSurtido = new Set(items.map((i) => i.producto_id))

  const productosDisponibles = productosActivos.filter((p) => !idsEnSurtido.has(p.id))

  const handleAgregar = async () => {
    const cantidad = parseInt(cantidadObjetivo, 10)
    if (!selectedProductoId) {
      toast.error('Selecciona un producto')
      return
    }
    if (isNaN(cantidad) || cantidad < 1) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    try {
      await addItem.mutateAsync({ producto_id: selectedProductoId, cantidad_objetivo: cantidad })
      toast.success('Producto agregado al surtido')
      setSelectedProductoId('')
      setCantidadObjetivo('1')
      setShowForm(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      // Regla de negocio: el producto ya existe en el surtido (UNIQUE constraint)
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        toast.error('Este producto ya está en el surtido estándar')
      } else {
        toast.error(`No se pudo agregar: ${msg}`)
      }
    }
  }

  const handleUpdateCantidad = async (id: string, cantidad: number) => {
    try {
      await updateCantidad.mutateAsync({ id, cantidad_objetivo: cantidad })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(`No se pudo actualizar: ${msg}`)
    }
  }

  const handleQuitar = async (id: string) => {
    try {
      await removeItem.mutateAsync(id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(`No se pudo quitar: ${msg}`)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Tabla del surtido */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-36">
                Cantidad objetivo
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-slate-400 text-sm">
                  Sin productos en el surtido estándar
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-medium">{item.productos?.nombre ?? '—'}</span>
                    <span className="ml-2 text-xs text-slate-400">{item.productos?.codigo ?? ''}</span>
                  </td>
                  <td className="px-4 py-3">
                    <CantidadCell
                      id={item.id}
                      value={item.cantidad_objetivo}
                      onSave={handleUpdateCantidad}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleQuitar(item.id)}
                      title="Quitar producto"
                      className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario inline para agregar producto */}
      {showForm ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Agregar producto al surtido</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-48">
              <label className="text-xs text-slate-500">Producto</label>
              <select
                value={selectedProductoId}
                onChange={(e) => setSelectedProductoId(e.target.value)}
                disabled={loadingProductos}
                className="border border-slate-200 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Seleccionar producto…</option>
                {productosDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-32">
              <label className="text-xs text-slate-500">Cantidad objetivo</label>
              <input
                type="number"
                min={1}
                value={cantidadObjetivo}
                onChange={(e) => setCantidadObjetivo(e.target.value)}
                className="border border-slate-200 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAgregar}
                disabled={addItem.isPending}
              >
                {addItem.isPending ? 'Agregando…' : 'Agregar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setSelectedProductoId('')
                  setCantidadObjetivo('1')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
          {productosDisponibles.length === 0 && !loadingProductos && (
            <p className="text-xs text-slate-400">
              Todos los productos activos ya están en el surtido.
            </p>
          )}
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5"
        >
          <Plus size={15} aria-hidden />
          Agregar producto
        </Button>
      )}
    </div>
  )
}
