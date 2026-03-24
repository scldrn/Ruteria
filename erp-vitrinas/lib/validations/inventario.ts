import { z } from 'zod'

export const entradaInventarioSchema = z.object({
  producto_id: z.string().uuid('Selecciona un producto'),
  cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  costo_unitario: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0).optional()
  ),
  notas: z.string().max(500).optional(),
})

export type EntradaInventarioInput = z.output<typeof entradaInventarioSchema>

export const transferenciaInventarioSchema = z.object({
  colaboradora_id: z.string().uuid('Selecciona una colaboradora'),
  items: z.array(
    z.object({
      producto_id: z.string().uuid('Selecciona un producto'),
      cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
    })
  ).min(1, 'Agrega al menos un producto'),
})

export type TransferenciaInventarioInput = z.output<typeof transferenciaInventarioSchema>

export const bajaInventarioSchema = z.object({
  origen_tipo: z.enum(['central', 'vitrina', 'colaboradora'], {
    errorMap: () => ({ message: 'Selecciona el origen de la baja' }),
  }),
  origen_id: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().uuid('Selecciona una ubicacion valida').optional()
  ),
  producto_id: z.string().uuid('Selecciona un producto'),
  cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  motivo_baja: z.enum(['robo', 'perdida', 'dano'], {
    errorMap: () => ({ message: 'Selecciona un motivo de baja' }),
  }),
  notas: z.string().max(500).optional(),
}).superRefine((values, ctx) => {
  if (values.origen_tipo !== 'central' && !values.origen_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecciona la ubicacion del inventario',
      path: ['origen_id'],
    })
  }
})

export type BajaInventarioInput = z.output<typeof bajaInventarioSchema>
