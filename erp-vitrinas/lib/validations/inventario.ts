import { z } from 'zod'

export const entradaInventarioSchema = z.object({
  producto_id: z.string().uuid('Selecciona un producto'),
  cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  costo_unitario: z.coerce.number().min(0).optional(),
  notas: z.string().max(500).optional(),
})

export type EntradaInventarioInput = z.input<typeof entradaInventarioSchema>
