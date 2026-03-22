import { z } from 'zod'

// Schema para datos básicos de la ruta
export const rutaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  colaboradora_id: z.string().uuid('Selecciona una colaboradora'),
  zona_id: z.string().uuid().optional(),
  frecuencia: z.enum(['diaria', 'semanal', 'quincenal']).default('semanal'),
  dias_visita: z.array(z.string()).default([]),
  estado: z.enum(['activa', 'inactiva']).default('activa'),
})

// Schema para los PDVs de una ruta (al guardar)
export const rutaPdvSchema = z.object({
  pdv_id: z.string().uuid(),
  orden_visita: z.number().int().min(1),
})

export type RutaFormValues = z.input<typeof rutaSchema>
export type RutaPdvValues = z.infer<typeof rutaPdvSchema>
