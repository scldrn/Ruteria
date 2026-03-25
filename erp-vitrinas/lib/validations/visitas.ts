import { z } from 'zod'

export const visitaEstadoSchema = z.enum(['planificada', 'en_ejecucion', 'completada', 'no_realizada'])

export const visitaSchema = z.object({
  ruta_id: z.string().uuid('Ruta inválida'),
  pdv_id: z.string().uuid('Punto de venta inválido'),
  vitrina_id: z.string().uuid('Vitrina inválida'),
  colaboradora_id: z.string().uuid('Colaboradora inválida'),
  estado: visitaEstadoSchema.default('planificada'),
  fecha_hora_inicio: z.string().datetime().nullable().optional(),
  fecha_hora_fin: z.string().datetime().nullable().optional(),
  motivo_no_realizada: z.string().trim().max(500, 'Máximo 500 caracteres').nullable().optional(),
  notas: z.string().trim().max(1000, 'Máximo 1000 caracteres').nullable().optional(),
})

export const marcarNoRealizadaSchema = z.object({
  motivo_no_realizada: z.string().trim().min(3, 'El motivo es obligatorio').max(500, 'Máximo 500 caracteres'),
})

export type VisitaFormValues = z.infer<typeof visitaSchema>
export type MarcarNoRealizadaValues = z.infer<typeof marcarNoRealizadaSchema>
