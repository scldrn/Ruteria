import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Solo accesible para usuarios con rol 'admin'
export default async function UsuariosLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.rol !== 'admin') {
    redirect('/admin/dashboard')
  }

  return <>{children}</>
}
