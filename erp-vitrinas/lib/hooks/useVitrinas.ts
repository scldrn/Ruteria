import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { VitrinaFormValues } from '@/lib/validations/vitrinas'

type Vitrina = Database['public']['Tables']['vitrinas']['Row'] & {
  puntos_de_venta: { nombre_comercial: string; zona_id: string | null } | null
}

const QUERY_KEY = ['vitrinas'] as const

export function useVitrinas() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitrinas')
        .select('*, puntos_de_venta(nombre_comercial, zona_id)')
        .order('codigo')
      if (error) throw new Error(error.message)
      return data as Vitrina[]
    },
  })
}

export function useCreateVitrina() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: VitrinaFormValues) => {
      const { data, error } = await supabase
        .from('vitrinas')
        .insert(values)
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateVitrina() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<VitrinaFormValues> }) => {
      const { error } = await supabase.from('vitrinas').update(values).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useRetirarVitrina() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vitrinas')
        .update({ estado: 'retirada', fecha_retiro: new Date().toISOString().split('T')[0] })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
