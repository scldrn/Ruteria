'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { vitrinaSchema } from '@/lib/validations/vitrinas'
import { useCreateVitrina, useUpdateVitrina } from '@/lib/hooks/useVitrinas'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import type { z } from 'zod'

// Use z.input so estado can be optional (it has .default('activa'))
type VitrinaFormInput = z.input<typeof vitrinaSchema>
type VitrinaFormOutput = z.output<typeof vitrinaSchema>

interface VitrinaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vitrina?: {
    id: string
    codigo: string
    pdv_id: string
    tipo?: string | null
    estado: 'activa' | 'inactiva' | 'retirada'
    notas?: string | null
  }
}

export function VitrinaSheet({ open, onOpenChange, vitrina }: VitrinaSheetProps) {
  // Solo PDVs activos para la selección
  const { data: pdvs = [] } = usePuntosDeVenta()
  const pdvsActivos = pdvs.filter((p) => p.activo)

  const createVitrina = useCreateVitrina()
  const updateVitrina = useUpdateVitrina()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VitrinaFormInput, unknown, VitrinaFormOutput>({
    resolver: zodResolver(vitrinaSchema),
    defaultValues: { estado: 'activa' },
  })

  // Resetear formulario cuando cambia la vitrina a editar o se abre/cierra el sheet
  useEffect(() => {
    if (!open) return
    if (vitrina) {
      reset({
        codigo: vitrina.codigo,
        pdv_id: vitrina.pdv_id,
        tipo: vitrina.tipo ?? '',
        estado: vitrina.estado === 'retirada' ? 'inactiva' : vitrina.estado,
        notas: vitrina.notas ?? '',
      })
    } else {
      reset({ estado: 'activa', codigo: '', pdv_id: '', tipo: '', notas: '' })
    }
  }, [open, vitrina, reset])

  async function onSubmit(values: VitrinaFormOutput) {
    try {
      if (vitrina) {
        await updateVitrina.mutateAsync({ id: vitrina.id, values })
      } else {
        await createVitrina.mutateAsync(values)
      }
      toast.success('Vitrina guardada')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isDuplicate = msg.includes('23505') || msg.includes('duplicate key') || msg.includes('unique')
      toast.error(isDuplicate ? 'Este código ya existe' : msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{vitrina ? 'Editar vitrina' : 'Nueva vitrina'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Field label="Código *" error={errors.codigo?.message}>
            <input
              {...register('codigo')}
              className={inputCls}
              placeholder="VIT-001"
              disabled={!!vitrina}
            />
          </Field>

          <Field label="Punto de venta *" error={errors.pdv_id?.message}>
            <select {...register('pdv_id')} className={inputCls}>
              <option value="">Seleccionar...</option>
              {pdvsActivos.map((pdv) => (
                <option key={pdv.id} value={pdv.id}>
                  {pdv.nombre_comercial}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo" error={errors.tipo?.message}>
            <input
              {...register('tipo')}
              className={inputCls}
              placeholder="exhibidor, vitrina, caja..."
            />
          </Field>

          {/* El campo estado solo se muestra al editar; al crear siempre inicia como 'activa' */}
          {vitrina && (
            <Field label="Estado" error={errors.estado?.message}>
              <select {...register('estado')} className={inputCls}>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </Field>
          )}

          <Field label="Notas" error={errors.notas?.message}>
            <textarea
              {...register('notas')}
              className={`${inputCls} min-h-[80px] resize-none`}
              placeholder="Observaciones adicionales..."
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
              {isSubmitting ? 'Guardando...' : 'Guardar'}
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
