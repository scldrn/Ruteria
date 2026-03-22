import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { RutaFormValues, RutaPdvValues } from '@/lib/validations/rutas'

type RutaRow = Database['public']['Tables']['rutas']['Row']

type Ruta = RutaRow & {
  usuarios: { nombre: string } | null
  zonas: { nombre: string } | null
  rutas_pdv: { pdv_id: string; orden_visita: number }[]
  num_pdvs: number
}

const QUERY_KEY = ['rutas'] as const

export function useRutas() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rutas')
        .select('*, usuarios!rutas_colaboradora_id_fkey(nombre), zonas(nombre), rutas_pdv(pdv_id, orden_visita)')
        .order('codigo')
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        ...r,
        num_pdvs: Array.isArray(r.rutas_pdv) ? r.rutas_pdv.length : 0,
      })) as Ruta[]
    },
  })
}

export function useCreateRuta() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ datos, pdvs }: { datos: RutaFormValues; pdvs: RutaPdvValues[] }) => {
      const { data, error } = await supabase
        .from('rutas')
        .insert({
          codigo: datos.codigo,
          nombre: datos.nombre,
          colaboradora_id: datos.colaboradora_id,
          zona_id: datos.zona_id ?? null,
          frecuencia: datos.frecuencia,
          dias_visita: datos.dias_visita,
          estado: datos.estado,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      const newId = data.id
      if (pdvs.length > 0) {
        const { error: pdvError } = await supabase.from('rutas_pdv').insert(
          pdvs.map((p) => ({
            ruta_id: newId,
            pdv_id: p.pdv_id,
            orden_visita: p.orden_visita,
          })),
        )
        if (pdvError) {
          // Rollback compensatorio — eliminar ruta huérfana
          await supabase.from('rutas').delete().eq('id', newId)
          throw new Error(`Error al guardar PDVs de la ruta: ${pdvError.message}`)
        }
      }
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateRuta() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      datos,
      pdvs,
    }: {
      id: string
      datos: Partial<RutaFormValues>
      pdvs?: RutaPdvValues[]
    }) => {
      const { error } = await supabase
        .from('rutas')
        .update({
          ...(datos.codigo !== undefined && { codigo: datos.codigo }),
          ...(datos.nombre !== undefined && { nombre: datos.nombre }),
          ...(datos.colaboradora_id !== undefined && { colaboradora_id: datos.colaboradora_id }),
          ...(datos.zona_id !== undefined && { zona_id: datos.zona_id ?? null }),
          ...(datos.frecuencia !== undefined && { frecuencia: datos.frecuencia }),
          ...(datos.dias_visita !== undefined && { dias_visita: datos.dias_visita }),
          ...(datos.estado !== undefined && { estado: datos.estado }),
        })
        .eq('id', id)
      if (error) throw new Error(error.message)

      if (pdvs !== undefined) {
        // Leer PDVs actuales para poder restaurarlos si falla la reinserción
        const { data: pdvsAnteriores } = await supabase
          .from('rutas_pdv')
          .select('pdv_id, orden_visita')
          .eq('ruta_id', id)

        const { error: deleteError } = await supabase
          .from('rutas_pdv')
          .delete()
          .eq('ruta_id', id)
        if (deleteError) throw new Error(deleteError.message)

        if (pdvs.length > 0) {
          const { error: insertError } = await supabase.from('rutas_pdv').insert(
            pdvs.map((p) => ({
              ruta_id: id,
              pdv_id: p.pdv_id,
              orden_visita: p.orden_visita,
            })),
          )
          if (insertError) {
            // Rollback compensatorio — restaurar PDVs anteriores
            if (pdvsAnteriores && pdvsAnteriores.length > 0) {
              await supabase.from('rutas_pdv').insert(
                pdvsAnteriores.map((p) => ({
                  ruta_id: id,
                  pdv_id: p.pdv_id,
                  orden_visita: p.orden_visita,
                })),
              )
            }
            throw new Error(`Error al actualizar PDVs de la ruta: ${insertError.message}`)
          }
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDesactivarRuta() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rutas')
        .update({ estado: 'inactiva' })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
