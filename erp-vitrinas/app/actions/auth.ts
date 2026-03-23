'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logServerError } from '@/lib/server/logger'

export async function logoutAction() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    logServerError('logoutAction', error)
  }
  redirect('/login')
}
