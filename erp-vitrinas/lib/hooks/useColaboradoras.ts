import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type Colaboradora = {
  id: string
  nombre: string
}

export function useColaboradoras() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['colaboradoras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, rol')
        .eq('rol', 'colaboradora')
        .eq('activo', true)
        .order('nombre')
      if (error) throw new Error(error.message)
      return (data ?? []).map((u) => ({
        id: u.id,
        nombre: u.nombre,
      })) as Colaboradora[]
    },
  })
}
