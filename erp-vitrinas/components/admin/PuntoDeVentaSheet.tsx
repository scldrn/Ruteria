'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { puntoDeVentaSchema } from '@/lib/validations/puntos-de-venta'
import { useCreatePuntoDeVenta, useUpdatePuntoDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import { useZonas } from '@/lib/hooks/useZonas'
import type { Database } from '@/lib/supabase/database.types'
import type { z } from 'zod'

type PDV = Database['public']['Tables']['puntos_de_venta']['Row']

type PDVFormInput = z.input<typeof puntoDeVentaSchema>
type PDVFormOutput = z.output<typeof puntoDeVentaSchema>

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

interface PuntoDeVentaSheetProps {
  open: boolean
  onClose: () => void
  pdv?: PDV | null
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function PuntoDeVentaSheet({ open, onClose, pdv }: PuntoDeVentaSheetProps) {
  const { data: zonas = [] } = useZonas()
  const create = useCreatePuntoDeVenta()
  const update = useUpdatePuntoDeVenta()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PDVFormInput, unknown, PDVFormOutput>({
    resolver: zodResolver(puntoDeVentaSchema),
    defaultValues: { activo: true },
  })

  useEffect(() => {
    if (!open) return
    if (pdv) {
      reset({
        codigo: pdv.codigo,
        nombre_comercial: pdv.nombre_comercial,
        tipo: pdv.tipo ?? '',
        direccion: pdv.direccion ?? '',
        zona_id: pdv.zona_id ?? undefined,
        contacto_nombre: pdv.contacto_nombre ?? '',
        contacto_tel: pdv.contacto_tel ?? '',
        condiciones_pago: pdv.condiciones_pago ?? '',
        forma_pago_preferida: (pdv.forma_pago_preferida as PDVFormInput['forma_pago_preferida']) ?? undefined,
        activo: pdv.activo,
      })
    } else {
      reset({ activo: true })
    }
  }, [open, pdv, reset])

  async function onSubmit(values: PDVFormOutput) {
    try {
      if (pdv) {
        await update.mutateAsync({ id: pdv.id, values })
      } else {
        await create.mutateAsync(values)
      }
      toast.success('Punto de venta guardado')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isDuplicate = msg.includes('23505') || msg.includes('duplicate key') || msg.includes('unique')
      toast.error(isDuplicate ? 'Este código ya existe' : msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{pdv ? 'Editar punto de venta' : 'Nuevo punto de venta'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código *" error={errors.codigo?.message}>
              <input {...register('codigo')} className={inputCls} placeholder="PDV-001" disabled={!!pdv} />
            </Field>
            <Field label="Tipo" error={errors.tipo?.message}>
              <input {...register('tipo')} className={inputCls} placeholder="Tienda, Farmacia..." />
            </Field>
          </div>

          <Field label="Nombre comercial *" error={errors.nombre_comercial?.message}>
            <input {...register('nombre_comercial')} className={inputCls} />
          </Field>

          <Field label="Zona" error={errors.zona_id?.message}>
            <select {...register('zona_id')} className={inputCls}>
              <option value="">Sin zona</option>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </Field>

          <Field label="Dirección" error={errors.direccion?.message}>
            <input {...register('direccion')} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contacto" error={errors.contacto_nombre?.message}>
              <input {...register('contacto_nombre')} className={inputCls} placeholder="Nombre" />
            </Field>
            <Field label="Teléfono" error={errors.contacto_tel?.message}>
              <input {...register('contacto_tel')} className={inputCls} placeholder="300..." />
            </Field>
          </div>

          <Field label="Condiciones de pago" error={errors.condiciones_pago?.message}>
            <input {...register('condiciones_pago')} className={inputCls} placeholder="Ej: pago a 30 días" />
          </Field>

          <Field label="Forma de pago preferida" error={errors.forma_pago_preferida?.message}>
            <select {...register('forma_pago_preferida')} className={inputCls}>
              <option value="">Sin preferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="otro">Otro</option>
            </select>
          </Field>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="pdv-activo" {...register('activo')} className="rounded" />
            <label htmlFor="pdv-activo" className="text-sm text-slate-600">Punto de venta activo</label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-[#6366f1] hover:bg-indigo-500" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
