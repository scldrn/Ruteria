'use client'

import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { bajaInventarioSchema } from '@/lib/validations/inventario'
import { useRegistrarBajaInventario } from '@/lib/hooks/useMovimientosInventario'
import { useInventarioCentral } from '@/lib/hooks/useInventarioCentral'
import { useInventarioColaboradora } from '@/lib/hooks/useInventarioColaboradora'
import { useInventarioVitrina } from '@/lib/hooks/useInventarioVitrina'
import { useColaboradoras } from '@/lib/hooks/useColaboradoras'
import { useVitrinas } from '@/lib/hooks/useVitrinas'
import type { z } from 'zod'

type BajaFormInput = z.input<typeof bajaInventarioSchema>
type BajaFormOutput = z.output<typeof bajaInventarioSchema>

interface BajaInventarioSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

export function BajaInventarioSheet({ open, onOpenChange }: BajaInventarioSheetProps) {
  const registrarBaja = useRegistrarBajaInventario()
  const { data: inventarioCentral = [] } = useInventarioCentral()
  const { data: inventarioColaboradora = [] } = useInventarioColaboradora()
  const { data: colaboradoras = [] } = useColaboradoras()
  const { data: vitrinas = [] } = useVitrinas()

  const {
    register,
    handleSubmit,
    reset,
    resetField,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BajaFormInput, unknown, BajaFormOutput>({
    resolver: zodResolver(bajaInventarioSchema),
    defaultValues: {
      origen_tipo: 'central',
      origen_id: undefined,
      producto_id: '',
      cantidad: undefined,
      motivo_baja: 'perdida',
      notas: '',
    },
  })

  const origenTipo = useWatch({ control, name: 'origen_tipo' })
  const origenId = useWatch({ control, name: 'origen_id' }) as string | undefined
  const productoId = useWatch({ control, name: 'producto_id' })
  const { data: inventarioVitrina = [] } = useInventarioVitrina(origenTipo === 'vitrina' ? origenId ?? '' : '')

  useEffect(() => {
    if (!open) return
    reset({
      origen_tipo: 'central',
      origen_id: undefined,
      producto_id: '',
      cantidad: undefined,
      motivo_baja: 'perdida',
      notas: '',
    })
  }, [open, reset])

  useEffect(() => {
    setValue('origen_id', undefined)
    setValue('producto_id', '')
    resetField('cantidad')
  }, [origenTipo, resetField, setValue])

  useEffect(() => {
    setValue('producto_id', '')
    resetField('cantidad')
  }, [origenId, resetField, setValue])

  const productosDisponibles = useMemo(() => {
    if (origenTipo === 'central') {
      return inventarioCentral
        .filter((item) => item.cantidad_actual > 0)
        .map((item) => ({
          producto_id: item.producto_id,
          nombre: item.productos?.nombre ?? '—',
          codigo: item.productos?.codigo ?? '—',
          stock: item.cantidad_actual,
        }))
    }

    if (origenTipo === 'colaboradora') {
      return inventarioColaboradora
        .filter((item) => item.colaboradora_id === origenId && item.cantidad_actual > 0)
        .map((item) => ({
          producto_id: item.producto_id,
          nombre: item.producto_nombre,
          codigo: item.producto_codigo,
          stock: item.cantidad_actual,
        }))
    }

    return inventarioVitrina
      .filter((item) => item.cantidad_actual > 0)
      .map((item) => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        codigo: item.codigo,
        stock: item.cantidad_actual,
      }))
  }, [inventarioCentral, inventarioColaboradora, inventarioVitrina, origenId, origenTipo])

  const stockDisponible = productosDisponibles.find((item) => item.producto_id === productoId)?.stock ?? 0

  async function onSubmit(values: BajaFormOutput) {
    if (values.cantidad > stockDisponible) {
      toast.error('La cantidad a dar de baja no puede exceder el stock disponible')
      return
    }

    try {
      await registrarBaja.mutateAsync(values)
      toast.success('Baja registrada correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la baja')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar baja de inventario</SheetTitle>
          <SheetDescription>
            Registra salidas auditadas por robo, perdida o dano sin alterar el historial.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Field label="Origen *" error={errors.origen_tipo?.message}>
            <select {...register('origen_tipo')} className={inputCls}>
              <option value="central">Bodega central</option>
              <option value="colaboradora">Inventario de colaboradora</option>
              <option value="vitrina">Inventario de vitrina</option>
            </select>
          </Field>

          {origenTipo === 'colaboradora' && (
            <Field label="Colaboradora *" error={errors.origen_id?.message}>
              <select {...register('origen_id')} className={inputCls}>
                <option value="">Seleccionar colaboradora...</option>
                {colaboradoras.map((colaboradora) => (
                  <option key={colaboradora.id} value={colaboradora.id}>
                    {colaboradora.nombre}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {origenTipo === 'vitrina' && (
            <Field label="Vitrina *" error={errors.origen_id?.message}>
              <select {...register('origen_id')} className={inputCls}>
                <option value="">Seleccionar vitrina...</option>
                {vitrinas
                  .filter((vitrina) => vitrina.estado === 'activa')
                  .map((vitrina) => (
                    <option key={vitrina.id} value={vitrina.id}>
                      {vitrina.codigo} · {vitrina.puntos_de_venta?.nombre_comercial ?? 'Sin PDV'}
                    </option>
                  ))}
              </select>
            </Field>
          )}

          <Field label="Producto *" error={errors.producto_id?.message}>
            <select {...register('producto_id')} className={inputCls} disabled={productosDisponibles.length === 0}>
              <option value="">Seleccionar producto...</option>
              {productosDisponibles.map((producto) => (
                <option key={producto.producto_id} value={producto.producto_id}>
                  {producto.nombre} ({producto.codigo})
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

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Stock disponible: <span className="font-semibold text-slate-800">{stockDisponible}</span>
          </div>

          <Field label="Motivo *" error={errors.motivo_baja?.message}>
            <select {...register('motivo_baja')} className={inputCls}>
              <option value="perdida">Perdida</option>
              <option value="robo">Robo</option>
              <option value="dano">Dano</option>
            </select>
          </Field>

          <Field label="Notas" error={errors.notas?.message}>
            <textarea
              {...register('notas')}
              className={`${inputCls} min-h-[90px] resize-none`}
              placeholder="Describe el contexto de la baja"
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
              disabled={isSubmitting || registrarBaja.isPending}
            >
              {isSubmitting || registrarBaja.isPending ? 'Registrando...' : 'Registrar baja'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
