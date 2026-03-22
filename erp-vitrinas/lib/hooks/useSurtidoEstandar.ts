import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type SurtidoItem = Database['public']['Tables']['surtido_estandar']['Row'] & {
  productos: { nombre: string; codigo: string } | null
}

export function useSurtidoEstandar(vitrinaId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = ['surtido_estandar', vitrinaId] as const

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surtido_estandar')
        .select('*, productos(nombre, codigo)')
        .eq('vitrina_id', vitrinaId)
        .order('created_at')
      if (error) throw new Error(error.message)
      return data as SurtidoItem[]
    },
    enabled: !!vitrinaId,
  })

  const addItem = useMutation({
    mutationFn: async ({ producto_id, cantidad_objetivo }: { producto_id: string; cantidad_objetivo: number }) => {
      const { error } = await supabase
        .from('surtido_estandar')
        .insert({ vitrina_id: vitrinaId, producto_id, cantidad_objetivo })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const updateCantidad = useMutation({
    mutationFn: async ({ id, cantidad_objetivo }: { id: string; cantidad_objetivo: number }) => {
      const { error } = await supabase
        .from('surtido_estandar')
        .update({ cantidad_objetivo })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surtido_estandar').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { ...query, addItem, updateCantidad, removeItem }
}
