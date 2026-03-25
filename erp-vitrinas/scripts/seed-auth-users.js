#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Crea los usuarios de prueba en Supabase Auth local.
 * Ejecutar después de `supabase db reset`.
 *
 * Usage: node scripts/seed-auth-users.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TEST_USERS = [
  { email: 'admin@erp.local',        password: 'Admin1234!', rol: 'admin',        nombre: 'Admin' },
  { email: 'supervisor@erp.local',   password: 'Super1234!', rol: 'supervisor',   nombre: 'Supervisor Demo' },
  { email: 'analista@erp.local',     password: 'Analista1234!', rol: 'analista',  nombre: 'Analista Demo' },
  { email: 'compras@erp.local',      password: 'Compras1234!', rol: 'compras',    nombre: 'Compras Demo' },
  { email: 'colaboradora@erp.local', password: 'Colab1234!', rol: 'colaboradora', nombre: 'Colaboradora Demo' },
]

async function main() {
  const { data: usersData, error: listError } = await sb.auth.admin.listUsers()
  if (listError) {
    console.error('❌ list users:', listError.message)
    process.exit(1)
  }

  for (const u of TEST_USERS) {
    const prev = usersData?.users?.find((x) => x.email === u.email)
    let userId = prev?.id

    if (prev) {
      const { error } = await sb.auth.admin.updateUserById(prev.id, {
        password: u.password,
        email_confirm: true,
        app_metadata: { rol: u.rol },
      })
      if (error) { console.error(`❌ update ${u.email}:`, error.message); continue }
      console.log(`✔ updated  ${u.email} (${prev.id})`)
    } else {
      const { data, error } = await sb.auth.admin.createUser({
        email: u.email, password: u.password,
        email_confirm: true,
        app_metadata: { rol: u.rol },
      })
      if (error) { console.error(`❌ create ${u.email}:`, error.message); continue }
      userId = data.user.id
      console.log(`✔ created  ${u.email} (${data.user.id})`)
    }

    const { error: upsertError } = await sb.from('usuarios').upsert(
      { id: userId, nombre: u.nombre, email: u.email, rol: u.rol, activo: true },
      { onConflict: 'id' }
    )

    if (upsertError) {
      console.error(`❌ upsert public.usuarios ${u.email}:`, upsertError.message)
      continue
    }

    console.log(`✔ synced   ${u.email} en public.usuarios`)
  }
  console.log('\nDone. Run: npx playwright test')
}

main().catch((e) => { console.error(e); process.exit(1) })
