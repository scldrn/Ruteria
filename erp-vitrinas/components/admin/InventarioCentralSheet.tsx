'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { entradaInventarioSchema } from '@/lib/validations/inventario'
import { useRegistrarEntrada } from '@/lib/hooks/useInventarioCentral'
import { useProductos } from '@/lib/hooks/useProductos'
import type { z } from 'zod'

type EntradaFormInput = z.input<typeof entradaInventarioSchema>
type EntradaFormOutput = z.output<typeof entradaInventarioSchema>

interface InventarioCentralSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventarioCentralSheet({ open, onOpenChange }: InventarioCentralSheetProps) {
  // Cargamos todos los productos activos para el select
  const { data: productos = [] } = useProductos()
  const productosActivos = productos.filter((p) => p.estado === 'activo')
  const registrarEntrada = useRegistrarEntrada()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntradaFormInput, unknown, EntradaFormOutput>({
    resolver: zodResolver(entradaInventarioSchema),
  })

  // Limpiar formulario cuando el sheet se abre
  useEffect(() => {
    if (!open) return
    reset({ producto_id: '', cantidad: undefined, costo_unitario: undefined, notas: '' })
  }, [open, reset])

  async function onSubmit(values: EntradaFormOutput) {
    try {
      await registrarEntrada.mutateAsync(values)
      toast.success('Entrada registrada correctamente')
      onOpenChange(false)
      reset()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar entrada por compra</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Field label="Producto *" error={errors.producto_id?.message}>
            <select {...register('producto_id')} className={inputCls}>
              <option value="">Seleccionar producto...</option>
              {productosActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.codigo})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cantidad *" error={errors.cantidad?.message}>
            <input
              {...register('cantidad')}
              type="number"
              min="1"
              step="1"
              className={inputCls}
              placeholder="0"
            />
          </Field>

          <Field label="Costo unitario (opcional)" error={errors.costo_unitario?.message}>
            <input
              {...register('costo_unitario')}
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              placeholder="0.00"
            />
          </Field>

          <Field label="Notas" error={errors.notas?.message}>
            <textarea
              {...register('notas')}
              className={`${inputCls} min-h-[80px] resize-none`}
              placeholder="Número de factura u observaciones"
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar entrada'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// Helpers locales
const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
