'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { crearIncidenciaSchema } from '@/lib/validations/incidencias'
import { useCrearIncidencia } from '@/lib/hooks/useIncidencias'
import type { z } from 'zod'

type IncidenciaFormInput = z.input<typeof crearIncidenciaSchema>
type IncidenciaFormOutput = z.output<typeof crearIncidenciaSchema>

type LocalFoto = {
  id: string
  file: File
  previewUrl: string
}

interface IncidenciaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitaId: string
  pdvId: string
  vitrinaId: string
}

const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function IncidenciaSheet({
  open,
  onOpenChange,
  visitaId,
  pdvId,
  vitrinaId,
}: IncidenciaSheetProps) {
  const crearIncidencia = useCrearIncidencia()
  const [fotos, setFotos] = useState<LocalFoto[]>([])

  function clearFotos() {
    setFotos((current) => {
      current.forEach((foto) => URL.revokeObjectURL(foto.previewUrl))
      return []
    })
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncidenciaFormInput, unknown, IncidenciaFormOutput>({
    resolver: zodResolver(crearIncidenciaSchema),
    defaultValues: {
      tipo: 'otro',
      descripcion: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({ tipo: 'otro', descripcion: '' })
  }, [open, reset])

  const inputId = useMemo(() => `incidencia-file-${crypto.randomUUID()}`, [])

  function handleFiles(files: FileList | null) {
    if (!files?.length) return

    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setFotos((current) => [...current, ...next])
  }

  function removeFoto(id: string) {
    setFotos((current) => {
      const foto = current.find((item) => item.id === id)
      if (foto) URL.revokeObjectURL(foto.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  async function onSubmit(values: IncidenciaFormOutput) {
    try {
      const result = await crearIncidencia.mutateAsync({
        values,
        visitaId,
        pdvId,
        vitrinaId,
        fotos: fotos.map((foto) => foto.file),
      })

      if (result.pendingOffline) {
        toast.success('Incidencia guardada en este dispositivo. Se sincronizara al reconectar.')
      } else if (result.fotosFallidas > 0) {
        toast.warning(`Incidencia registrada. ${result.fotosFallidas} foto(s) no se pudieron subir.`)
      } else {
        toast.success('Incidencia registrada correctamente')
      }

      clearFotos()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la incidencia')
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          clearFotos()
        }
        onOpenChange(nextOpen)
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Reportar incidencia</SheetTitle>
          <SheetDescription>
            Registra situaciones anormales detectadas durante la visita sin interrumpir el cierre.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="rounded-xl border border-slate-200 bg-amber-50 p-4 flex gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-700">
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="font-medium text-amber-900">Incidencia operativa</p>
              <p className="text-sm text-amber-800">
                Usa este reporte para robo, dano, cobro anomalo, problema de espacio u otras novedades.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
            <select {...register('tipo')} className={inputCls}>
              <option value="otro">Otro</option>
              <option value="robo">Robo</option>
              <option value="dano_vitrina">Dano vitrina</option>
              <option value="producto_defectuoso">Producto defectuoso</option>
              <option value="problema_espacio">Problema de espacio</option>
              <option value="cobro">Cobro</option>
            </select>
            {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripcion *</label>
            <textarea
              {...register('descripcion')}
              className={`${inputCls} min-h-[110px] resize-none`}
              placeholder="Describe lo ocurrido y cualquier contexto importante"
            />
            {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-600">Fotos opcionales</label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <label
              htmlFor={inputId}
              className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              Agregar fotos
            </label>
          </div>

          {fotos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {fotos.map((foto) => (
                <div key={foto.id} className="relative rounded-xl overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.previewUrl} alt="Vista previa de incidencia" className="h-36 w-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow"
                    onClick={() => removeFoto(foto.id)}
                    aria-label="Eliminar foto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
              disabled={isSubmitting || crearIncidencia.isPending}
            >
              {isSubmitting || crearIncidencia.isPending ? 'Guardando...' : 'Registrar incidencia'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
