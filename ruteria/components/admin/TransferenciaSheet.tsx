'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useColaboradoras } from '@/lib/hooks/useColaboradoras'
import { useInventarioCentral } from '@/lib/hooks/useInventarioCentral'
import { useTransferirInventarioColaboradora } from '@/lib/hooks/useInventarioColaboradora'
import { transferenciaInventarioSchema } from '@/lib/validations/inventario'
import { useProductos } from '@/lib/hooks/useProductos'

type TransferRow = {
  id: string
  producto_id: string
  cantidad: string
}

interface TransferenciaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function makeRow(): TransferRow {
  return {
    id: crypto.randomUUID(),
    producto_id: '',
    cantidad: '',
  }
}

export function TransferenciaSheet({ open, onOpenChange }: TransferenciaSheetProps) {
  const { data: colaboradoras = [] } = useColaboradoras()
  const { data: inventarioCentral = [] } = useInventarioCentral()
  const { data: productos = [] } = useProductos()
  const transferir = useTransferirInventarioColaboradora()

  const [colaboradoraId, setColaboradoraId] = useState('')
  const [rows, setRows] = useState<TransferRow[]>([makeRow()])
  const [submitError, setSubmitError] = useState('')

  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.estado === 'activo'),
    [productos]
  )

  const stockCentralMap = useMemo(
    () => new Map(inventarioCentral.map((item) => [item.producto_id, item.cantidad_actual])),
    [inventarioCentral]
  )

  useEffect(() => {
    if (!open) return
    setColaboradoraId('')
    setRows([makeRow()])
    setSubmitError('')
  }, [open])

  function updateRow(id: string, patch: Partial<TransferRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setSubmitError('')
  }

  function addRow() {
    setRows((current) => [...current, makeRow()])
  }

  function removeRow(id: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)))
  }

  const totalUnidades = rows.reduce((total, row) => total + (Number(row.cantidad) || 0), 0)

  async function handleSubmit() {
    try {
      const parsed = transferenciaInventarioSchema.parse({
        colaboradora_id: colaboradoraId,
        items: rows.map((row) => ({
          producto_id: row.producto_id,
          cantidad: row.cantidad,
        })),
      })

      const duplicados = new Set<string>()
      const vistos = new Set<string>()
      parsed.items.forEach((item) => {
        if (vistos.has(item.producto_id)) duplicados.add(item.producto_id)
        vistos.add(item.producto_id)
      })

      if (duplicados.size > 0) {
        throw new Error('No repitas productos en la misma transferencia')
      }

      for (const item of parsed.items) {
        const stock = stockCentralMap.get(item.producto_id) ?? 0
        if (item.cantidad > stock) {
          throw new Error('La cantidad a transferir no puede exceder el stock central disponible')
        }
      }

      await transferir.mutateAsync(parsed)
      toast.success('Transferencia registrada')
      onOpenChange(false)
    } catch (error: unknown) {
      let message = 'Error al transferir inventario'
      if (error instanceof Error) {
        if (error.name === 'ZodError') {
          const zodErr = error as Error & { errors?: { message: string }[] }
          message = zodErr.errors?.[0]?.message ?? error.message
        } else {
          message = error.message
        }
      }
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Transferir al campo</SheetTitle>
          <SheetDescription>
            Mueve inventario desde bodega central al inventario de una colaboradora.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Colaboradora *</label>
            <select
              value={colaboradoraId}
              onChange={(event) => setColaboradoraId(event.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar colaboradora...</option>
              {colaboradoras.map((colaboradora) => (
                <option key={colaboradora.id} value={colaboradora.id}>
                  {colaboradora.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => {
              const stockDisponible = stockCentralMap.get(row.producto_id) ?? 0

              return (
                <div key={row.id} className="rounded-lg border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Producto {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-slate-400 hover:text-slate-600"
                      aria-label={`Eliminar fila ${index + 1}`}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Producto *</label>
                      <select
                        value={row.producto_id}
                        onChange={(event) => updateRow(row.id, { producto_id: event.target.value })}
                        className={inputCls}
                      >
                        <option value="">Seleccionar producto...</option>
                        {productosActivos.map((producto) => (
                          <option key={producto.id} value={producto.id}>
                            {producto.nombre} ({producto.codigo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.cantidad}
                        onChange={(event) => updateRow(row.id, { cantidad: event.target.value })}
                        className={inputCls}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Stock central disponible: <span className="font-medium text-slate-700">{stockDisponible}</span>
                  </p>
                </div>
              )
            })}
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={addRow}>
            <Plus size={16} className="mr-1.5" /> Agregar producto
          </Button>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total de unidades</span>
            <span className="text-lg font-semibold text-slate-800">{totalUnidades}</span>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
              disabled={transferir.isPending}
              onClick={handleSubmit}
            >
              {transferir.isPending ? 'Transfiriendo...' : 'Confirmar transferencia'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
