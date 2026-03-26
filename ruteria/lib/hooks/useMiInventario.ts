'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type MiInventarioItem = {
  producto_id: string
  cantidad_actual: number
  producto_nombre: string
  producto_codigo: string
  categoria_nombre: string
}

export function useMiInventario() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['mi_inventario'],
    queryFn: async (): Promise<MiInventarioItem[]> => {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error(userError.message)
      if (!user) throw new Error('Usuario no autenticado')

      const { data, error } = await supabase
        .from('inventario_colaboradora')
        .select(`
          producto_id,
          cantidad_actual,
          productos(nombre, codigo, categorias(nombre))
        `)
        .eq('colaboradora_id', user.id)

      if (error) throw new Error(error.message)

      return (data || []).map((row) => {
        const prod = Array.isArray(row.productos) ? row.productos[0] : row.productos
        const cat = prod?.categorias
        const categoria_nombre = Array.isArray(cat) ? cat[0]?.nombre : cat?.nombre
        return {
          producto_id: row.producto_id,
          cantidad_actual: row.cantidad_actual,
          producto_nombre: prod?.nombre || 'Desconocido',
          producto_codigo: prod?.codigo || '---',
          categoria_nombre: categoria_nombre || 'Sin categoría',
        }
      }).sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre))
    },
  })
}
