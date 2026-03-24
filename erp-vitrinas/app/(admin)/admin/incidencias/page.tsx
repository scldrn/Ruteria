import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/validations/usuarios'
import type { UserRol } from '@/lib/validations/usuarios'
import { IncidenciasTable } from '@/components/admin/IncidenciasTable'

export default async function IncidenciasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rawRol = user.app_metadata?.rol
  if (!ROLES.includes(rawRol)) redirect('/login')

  const rol = rawRol as UserRol
  if (!['admin', 'supervisor', 'analista'].includes(rol)) {
    redirect('/admin/dashboard')
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Incidencias</h1>
      <IncidenciasTable rol={rol} />
    </main>
  )
}
