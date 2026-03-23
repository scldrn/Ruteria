'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  type UserRol,
} from '@/lib/validations/usuarios'
import { requireAdminUser } from '@/lib/server/auth'
import { logServerError } from '@/lib/server/logger'

type Rol = UserRol

export async function createUsuarioAction(data: {
  nombre: string
  email: string
  password: string
  rol: Rol
}) {
  try {
    await requireAdminUser()
    const payload = usuarioCreateSchema.parse(data)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Falta configuración de Supabase en el servidor')
    }

    const adminSupabase = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      user_metadata: { nombre: payload.nombre },
      email_confirm: true,
    })

    if (authError) return { error: authError.message }

    if (payload.rol !== 'colaboradora') {
      const { error: updateError } = await adminSupabase
        .from('usuarios')
        .update({ rol: payload.rol })
        .eq('id', authData.user.id)

      if (updateError) return { error: updateError.message }
    }

    return { data: authData.user, error: null }
  } catch (error) {
    logServerError('createUsuarioAction', error)
    return { error: error instanceof Error ? error.message : 'No se pudo crear el usuario' }
  }
}

export async function updateUsuarioAction(
  id: string,
  data: { nombre: string; rol: Rol; activo: boolean }
) {
  try {
    const admin = await requireAdminUser()
    const payload = usuarioUpdateSchema.parse(data)

    if (admin.userId === id && (!payload.activo || payload.rol !== 'admin')) {
      return { error: 'No puedes desactivar tu propio usuario ni quitarte el rol admin' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('usuarios')
      .update({ nombre: payload.nombre, rol: payload.rol, activo: payload.activo })
      .eq('id', id)

    if (error) return { error: error.message }
    return { error: null }
  } catch (error) {
    logServerError('updateUsuarioAction', error, { targetUserId: id })
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar el usuario' }
  }
}
