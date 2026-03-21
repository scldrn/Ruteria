import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/admin/AppShell'
import { ROLES } from '@/lib/validations/usuarios'
import type { UserRol } from '@/lib/validations/usuarios'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Validar que el rol en app_metadata sea un valor conocido
  const rawRol = user.app_metadata?.rol
  if (!ROLES.includes(rawRol)) redirect('/login')
  const rol = rawRol as UserRol

  // Obtener nombre desde public.usuarios
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre')
    .eq('id', user.id)
    .single()

  const userInfo = {
    nombre: perfil?.nombre ?? '',
    email: user.email ?? '',
    rol,
  }

  return <AppShell user={userInfo}>{children}</AppShell>
}
