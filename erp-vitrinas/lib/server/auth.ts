import { createClient } from '@/lib/supabase/server'
import type { UserRol } from '@/lib/validations/usuarios'

export type AuthenticatedAdmin = {
  userId: string
  email: string | null
  rol: UserRol
}

export async function requireAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Debes iniciar sesión para continuar')
  }

  return { supabase, user }
}

export async function requireAdminUser(): Promise<AuthenticatedAdmin> {
  const { supabase, user } = await requireAuthenticatedUser()

  const { data: perfil, error } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !perfil) {
    throw new Error('No se pudo validar tu perfil de usuario')
  }

  if (!perfil.activo) {
    throw new Error('Tu usuario está inactivo')
  }

  if (perfil.rol !== 'admin') {
    throw new Error('No tienes permisos para realizar esta acción')
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    rol: perfil.rol,
  }
}
