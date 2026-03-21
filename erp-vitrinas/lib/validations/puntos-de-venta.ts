import { z } from 'zod'

const FORMAS_PAGO = ['efectivo', 'transferencia', 'nequi', 'daviplata', 'otro'] as const

export const puntoDeVentaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre_comercial: z.string().min(1, 'El nombre es requerido').max(200),
  tipo: z.string().optional(),
  direccion: z.string().optional(),
  zona_id: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().uuid('Selecciona una zona').optional().nullable()
  ),
  contacto_nombre: z.string().optional(),
  contacto_tel: z.string().optional(),
  condiciones_pago: z.string().optional(),
  forma_pago_preferida: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(FORMAS_PAGO).optional().nullable()
  ),
  activo: z.boolean().default(true),
})

export type PuntoDeVentaFormValues = z.infer<typeof puntoDeVentaSchema>
