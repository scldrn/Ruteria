import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol === 'colaboradora') redirect('/campo/ruta-del-dia')
  redirect('/admin/dashboard')
}
