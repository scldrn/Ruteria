'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { actualizarIncidenciaSchema } from '@/lib/validations/incidencias'
import { useActualizarIncidencia, type IncidenciaItem } from '@/lib/hooks/useIncidencias'
import { useUsuarios } from '@/lib/hooks/useUsuarios'
import type { UserRol } from '@/lib/validations/usuarios'
import type { z } from 'zod'

type IncidenciaFormInput = z.input<typeof actualizarIncidenciaSchema>
type IncidenciaFormOutput = z.output<typeof actualizarIncidenciaSchema>

interface IncidenciaDetalleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidencia: IncidenciaItem | null
  rol: UserRol
}

const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function siguienteEstado(estado: string): string | null {
  if (estado === 'abierta') return 'en_analisis'
  if (estado === 'en_analisis') return 'resuelta'
  if (estado === 'resuelta') return 'cerrada'
  return null
}

function labelEstadoSiguiente(estado: string): string | null {
  if (estado === 'abierta') return 'Pasar a en analisis'
  if (estado === 'en_analisis') return 'Marcar como resuelta'
  if (estado === 'resuelta') return 'Cerrar incidencia'
  return null
}

export function IncidenciaDetalleSheet({
  open,
  onOpenChange,
  incidencia,
  rol,
}: IncidenciaDetalleSheetProps) {
  const { data: usuarios = [] } = useUsuarios()
  const actualizarIncidencia = useActualizarIncidencia()
  const readOnly = rol === 'analista'
  const nextEstado = incidencia ? siguienteEstado(incidencia.estado) : null
  const responsables = usuarios.filter((usuario) => usuario.activo)

  const {
    register,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<IncidenciaFormInput, unknown, IncidenciaFormOutput>({
    resolver: zodResolver(actualizarIncidenciaSchema),
    defaultValues: {
      estado: 'abierta',
      responsable_id: undefined,
      resolucion: undefined,
    },
  })

  useEffect(() => {
    if (!open || !incidencia) return
    reset({
      estado: incidencia.estado as IncidenciaFormInput['estado'],
      responsable_id: incidencia.responsable_id ?? undefined,
      resolucion: incidencia.resolucion ?? undefined,
    })
  }, [open, incidencia, reset])

  async function submit(targetEstado: string) {
    if (!incidencia) return

    try {
      const values = actualizarIncidenciaSchema.parse({
        ...getValues(),
        estado: targetEstado,
      })

      await actualizarIncidencia.mutateAsync({
        id: incidencia.id,
        values,
      })

      toast.success('Incidencia actualizada')
      onOpenChange(false)
    } catch (error: unknown) {
      let message = 'No se pudo actualizar la incidencia'
      if (error instanceof Error) {
        if (error.name === 'ZodError') {
          const zodErr = error as Error & { errors?: { message: string }[] }
          message = zodErr.errors?.[0]?.message ?? error.message
        } else {
          message = error.message
        }
      }
      toast.error(message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalle de incidencia</SheetTitle>
          <SheetDescription>
            Revisa el contexto de la incidencia y gestiona su seguimiento operativo.
          </SheetDescription>
        </SheetHeader>

        {!incidencia ? (
          <div className="mt-6 text-sm text-slate-500">Selecciona una incidencia para ver su detalle.</div>
        ) : (
          <div className="space-y-5 mt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="PDV" value={incidencia.pdv_nombre} />
              <InfoCard label="Vitrina" value={incidencia.vitrina_codigo ?? '—'} />
              <InfoCard label="Tipo" value={incidencia.tipo} />
              <InfoCard label="Estado" value={incidencia.estado} />
              <InfoCard label="Creada por" value={incidencia.creador_nombre ?? '—'} />
              <InfoCard label="Dias abierta" value={`${incidencia.dias_abierta}`} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Descripcion</p>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                {incidencia.descripcion || 'Sin descripcion'}
              </p>
            </div>

            {incidencia.fotos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Fotos</p>
                <div className="grid grid-cols-2 gap-3">
                  {incidencia.fotos.map((foto) => (
                    <div key={foto.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      {foto.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto.signedUrl} alt="Foto de incidencia" className="h-36 w-full object-cover" />
                      ) : (
                        <div className="h-36 flex items-center justify-center text-xs text-slate-500">
                          No se pudo cargar la foto
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <Field label="Responsable">
                <select
                  {...register('responsable_id')}
                  className={inputCls}
                  disabled={readOnly}
                >
                  <option value="">Sin asignar</option>
                  {responsables.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} ({usuario.rol})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Resolucion">
                <textarea
                  {...register('resolucion')}
                  className={`${inputCls} min-h-[100px] resize-none`}
                  placeholder="Describe la accion tomada y el resultado"
                  disabled={readOnly}
                />
                {errors.resolucion && <p className="text-xs text-red-500 mt-1">{errors.resolucion.message}</p>}
              </Field>

              {!readOnly ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting || actualizarIncidencia.isPending}
                    onClick={() => submit(incidencia.estado)}
                  >
                    Guardar cambios
                  </Button>

                  {nextEstado && (
                    <Button
                      type="button"
                      className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
                      disabled={isSubmitting || actualizarIncidencia.isPending}
                      onClick={() => submit(nextEstado)}
                    >
                      {labelEstadoSiguiente(incidencia.estado)}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Tu rol es de solo lectura para incidencias.
                </p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}
