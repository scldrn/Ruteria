import { z } from 'zod'

export const ROLES = ['admin', 'colaboradora', 'supervisor', 'analista', 'compras'] as const

export type UserRol = (typeof ROLES)[number]

export const usuarioCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(ROLES, { errorMap: () => ({ message: 'Rol inválido' }) }),
})

export const usuarioUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  rol: z.enum(ROLES),
  activo: z.boolean(),
})

export type UsuarioCreateValues = z.infer<typeof usuarioCreateSchema>
export type UsuarioUpdateValues = z.infer<typeof usuarioUpdateSchema>
