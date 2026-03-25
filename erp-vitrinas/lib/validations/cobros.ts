import { z } from 'zod'

export const cobroSchema = z.object({
  monto: z
    .number({ invalid_type_error: 'El monto debe ser numérico' })
    .finite('El monto debe ser válido')
    .nonnegative('El monto no puede ser negativo'),
  forma_pago_id: z.string().uuid('La forma de pago es obligatoria'),
  notas: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
})

export type CobroFormValues = z.infer<typeof cobroSchema>
