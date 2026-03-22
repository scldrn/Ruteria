'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { rutaSchema } from '@/lib/validations/rutas'
import type { RutaPdvValues } from '@/lib/validations/rutas'
import { useCreateRuta, useUpdateRuta } from '@/lib/hooks/useRutas'
import { useColaboradoras } from '@/lib/hooks/useColaboradoras'
import { useZonas } from '@/lib/hooks/useZonas'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import { PDVSortableList } from '@/components/admin/PDVSortableList'
import type { z } from 'zod'

// z.input para que los defaults del schema sean opcionales en el formulario
type RutaFormInput = z.input<typeof rutaSchema>
type RutaFormOutput = z.output<typeof rutaSchema>

type PdvEnRuta = {
  pdv_id: string
  orden_visita: number
  nombre: string
}

interface RutaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruta?: {
    id: string
    codigo: string
    nombre: string
    colaboradora_id: string
    zona_id?: string | null
    frecuencia: 'diaria' | 'semanal' | 'quincenal'
    dias_visita: string[]
    estado: 'activa' | 'inactiva'
    rutas_pdv?: Array<{ pdv_id: string; orden_visita: number }>
  }
}

// Días de visita disponibles
const DIAS = [
  { value: 'lun', label: 'Lun' },
  { value: 'mar', label: 'Mar' },
  { value: 'mié', label: 'Mié' },
  { value: 'jue', label: 'Jue' },
  { value: 'vie', label: 'Vie' },
  { value: 'sáb', label: 'Sáb' },
  { value: 'dom', label: 'Dom' },
]

export function RutaSheet({ open, onOpenChange, ruta }: RutaSheetProps) {
  const { data: colaboradoras = [] } = useColaboradoras()
  const { data: zonas = [] } = useZonas()
  const { data: pdvsData = [] } = usePuntosDeVenta()

  const createRuta = useCreateRuta()
  const updateRuta = useUpdateRuta()

  // Lista de PDVs asignados a la ruta (con nombre para mostrar)
  const [pdvsEnRuta, setPdvsEnRuta] = useState<PdvEnRuta[]>([])
  const [busquedaPdv, setBusquedaPdv] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RutaFormInput, unknown, RutaFormOutput>({
    resolver: zodResolver(rutaSchema),
    defaultValues: {
      frecuencia: 'semanal',
      dias_visita: [],
      estado: 'activa',
    },
  })

  const diasVisita = watch('dias_visita') ?? []

  // Resetear formulario y lista de PDVs cuando cambia la ruta o el estado del sheet
  useEffect(() => {
    if (!open) return

    if (ruta) {
      reset({
        codigo: ruta.codigo,
        nombre: ruta.nombre,
        colaboradora_id: ruta.colaboradora_id,
        zona_id: ruta.zona_id ?? undefined,
        frecuencia: ruta.frecuencia,
        dias_visita: ruta.dias_visita,
        estado: ruta.estado,
      })

      // Reconstruir lista de PDVs con nombres
      if (ruta.rutas_pdv && ruta.rutas_pdv.length > 0) {
        const pdvsConNombre: PdvEnRuta[] = ruta.rutas_pdv
          .sort((a, b) => a.orden_visita - b.orden_visita)
          .map((rpv) => {
            const pdv = pdvsData.find((p) => p.id === rpv.pdv_id)
            return {
              pdv_id: rpv.pdv_id,
              orden_visita: rpv.orden_visita,
              nombre: pdv?.nombre_comercial ?? rpv.pdv_id,
            }
          })
        setPdvsEnRuta(pdvsConNombre)
      } else {
        setPdvsEnRuta([])
      }
    } else {
      reset({
        codigo: '',
        nombre: '',
        colaboradora_id: '',
        zona_id: undefined,
        frecuencia: 'semanal',
        dias_visita: [],
        estado: 'activa',
      })
      setPdvsEnRuta([])
    }

    setBusquedaPdv('')
  }, [open, ruta, reset, pdvsData])

  // PDVs activos que aún no están en la ruta
  const pdvsIdsEnRuta = new Set(pdvsEnRuta.map((p) => p.pdv_id))
  const pdvsDisponibles = pdvsData
    .filter((p) => p.activo && !pdvsIdsEnRuta.has(p.id))
    .filter((p) =>
      busquedaPdv.trim() === ''
        ? true
        : p.nombre_comercial.toLowerCase().includes(busquedaPdv.toLowerCase()),
    )

  // Agregar PDV al final de la ruta
  function agregarPdv(pdvId: string, nombre: string) {
    setPdvsEnRuta((prev) => [
      ...prev,
      { pdv_id: pdvId, orden_visita: prev.length + 1, nombre },
    ])
  }

  // Quitar PDV de la ruta y reindexar
  function quitarPdv(pdvId: string) {
    setPdvsEnRuta((prev) =>
      prev
        .filter((p) => p.pdv_id !== pdvId)
        .map((p, index) => ({ ...p, orden_visita: index + 1 })),
    )
  }

  // Manejar cambio en checkbox de días de visita
  function toggleDia(dia: string, checked: boolean) {
    const actuales = diasVisita
    if (checked) {
      setValue('dias_visita', [...actuales, dia])
    } else {
      setValue('dias_visita', actuales.filter((d) => d !== dia))
    }
  }

  async function onSubmit(values: RutaFormOutput) {
    const pdvs: RutaPdvValues[] = pdvsEnRuta.map((p) => ({
      pdv_id: p.pdv_id,
      orden_visita: p.orden_visita,
    }))

    try {
      if (ruta) {
        await updateRuta.mutateAsync({ id: ruta.id, datos: values, pdvs })
        toast.success('Ruta actualizada')
      } else {
        await createRuta.mutateAsync({ datos: values, pdvs })
        toast.success('Ruta creada')
      }
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isDuplicate =
        msg.includes('23505') || msg.includes('duplicate key') || msg.includes('unique')
      toast.error(isDuplicate ? 'Este código ya existe' : msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{ruta ? 'Editar ruta' : 'Nueva ruta'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
          <Tabs defaultValue="datos">
            <TabsList className="w-full">
              <TabsTrigger value="datos" className="flex-1">
                Datos
              </TabsTrigger>
              <TabsTrigger value="pdvs" className="flex-1">
                PDVs ({pdvsEnRuta.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Datos básicos de la ruta */}
            <TabsContent value="datos" className="space-y-4">
              <Field label="Código *" error={errors.codigo?.message}>
                <input
                  {...register('codigo')}
                  className={inputCls}
                  placeholder="RUT-001"
                  disabled={!!ruta}
                />
              </Field>

              <Field label="Nombre *" error={errors.nombre?.message}>
                <input
                  {...register('nombre')}
                  className={inputCls}
                  placeholder="Ruta norte — zona centro"
                />
              </Field>

              <Field label="Colaboradora *" error={errors.colaboradora_id?.message}>
                <select {...register('colaboradora_id')} className={inputCls}>
                  <option value="">Seleccionar...</option>
                  {colaboradoras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Zona" error={errors.zona_id?.message}>
                <select
                  {...register('zona_id', {
                    setValueAs: (v) => (v === '' ? undefined : v),
                  })}
                  className={inputCls}
                >
                  <option value="">Sin zona</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Frecuencia" error={errors.frecuencia?.message}>
                <select {...register('frecuencia')} className={inputCls}>
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                </select>
              </Field>

              <Field label="Días de visita" error={errors.dias_visita?.message}>
                <div className="flex flex-wrap gap-3">
                  {DIAS.map((dia) => (
                    <label key={dia.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={diasVisita.includes(dia.value)}
                        onChange={(e) => toggleDia(dia.value, e.target.checked)}
                      />
                      <span className="text-sm text-slate-700">{dia.label}</span>
                    </label>
                  ))}
                </div>
              </Field>

              {/* Estado solo se muestra en modo edición */}
              {ruta && (
                <Field label="Estado" error={errors.estado?.message}>
                  <select {...register('estado')} className={inputCls}>
                    <option value="activa">Activa</option>
                    <option value="inactiva">Inactiva</option>
                  </select>
                </Field>
              )}
            </TabsContent>

            {/* Tab: PDVs de la ruta con drag-and-drop */}
            <TabsContent value="pdvs">
              <div className="grid grid-cols-2 gap-4">
                {/* Columna izquierda: PDVs disponibles */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Disponibles
                  </p>
                  <input
                    type="text"
                    className={`${inputCls} mb-3`}
                    placeholder="Buscar PDV..."
                    value={busquedaPdv}
                    onChange={(e) => setBusquedaPdv(e.target.value)}
                  />
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {pdvsDisponibles.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        {busquedaPdv ? 'Sin resultados' : 'Todos los PDVs ya están en la ruta'}
                      </p>
                    ) : (
                      pdvsDisponibles.map((pdv) => (
                        <button
                          key={pdv.id}
                          type="button"
                          onClick={() => agregarPdv(pdv.id, pdv.nombre_comercial)}
                          className="w-full text-left px-3 py-2 text-sm rounded-md border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                          {pdv.nombre_comercial}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Columna derecha: PDVs en la ruta ordenables */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    En la ruta ({pdvsEnRuta.length})
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                    <PDVSortableList
                      items={pdvsEnRuta}
                      onReorder={setPdvsEnRuta}
                      onRemove={quitarPdv}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 mt-2 border-t border-slate-100">
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
