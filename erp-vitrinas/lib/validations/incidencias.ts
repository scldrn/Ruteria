import { z } from 'zod'

export const TIPOS_INCIDENCIA = [
  'producto_defectuoso',
  'robo',
  'dano_vitrina',
  'problema_espacio',
  'cobro',
  'otro',
] as const

export const ESTADOS_INCIDENCIA = ['abierta', 'en_analisis', 'resuelta', 'cerrada'] as const

export const crearIncidenciaSchema = z.object({
  tipo: z.enum(TIPOS_INCIDENCIA, {
    errorMap: () => ({ message: 'Selecciona un tipo de incidencia' }),
  }),
  descripcion: z.string().trim().min(5, 'Describe brevemente la incidencia').max(1000),
})

export const actualizarIncidenciaSchema = z.object({
  estado: z.enum(ESTADOS_INCIDENCIA, {
    errorMap: () => ({ message: 'Selecciona un estado valido' }),
  }),
  responsable_id: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.string().uuid('Selecciona un responsable valido').optional()
  ),
  resolucion: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed === '' ? undefined : trimmed
    },
    z.string().max(1000).optional()
  ),
}).superRefine((values, ctx) => {
  if ((values.estado === 'resuelta' || values.estado === 'cerrada') && !values.resolucion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La resolucion es obligatoria para este estado',
      path: ['resolucion'],
    })
  }
})

export type CrearIncidenciaInput = z.output<typeof crearIncidenciaSchema>
export type ActualizarIncidenciaInput = z.output<typeof actualizarIncidenciaSchema>
