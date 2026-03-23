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
  { email: 'colaboradora@erp.local', password: 'Colab1234!', rol: 'colaboradora', nombre: 'Colaboradora Demo' },
]

async function main() {
  for (const u of TEST_USERS) {
    // Eliminar si ya existe (ignora error si no existe)
    const { data: existing } = await sb.auth.admin.listUsers()
    const prev = existing?.users?.find((x) => x.email === u.email)
    if (prev) {
      // Solo actualizar password y app_metadata
      const { error } = await sb.auth.admin.updateUserById(prev.id, {
        password: u.password,
        email_confirm: true,
        app_metadata: { rol: u.rol },
      })
      if (error) { console.error(`❌ update ${u.email}:`, error.message); continue }
      console.log(`✔ updated  ${u.email} (${prev.id})`)
      continue
    }

    const { data, error } = await sb.auth.admin.createUser({
      email: u.email, password: u.password,
      email_confirm: true,
      app_metadata: { rol: u.rol },
    })
    if (error) { console.error(`❌ create ${u.email}:`, error.message); continue }

    // Upsert en public.usuarios
    await sb.from('usuarios').upsert(
      { id: data.user.id, nombre: u.nombre, email: u.email, rol: u.rol },
      { onConflict: 'id' }
    )
    console.log(`✔ created  ${u.email} (${data.user.id})`)
  }
  console.log('\nDone. Run: npx playwright test')
}

main().catch((e) => { console.error(e); process.exit(1) })
