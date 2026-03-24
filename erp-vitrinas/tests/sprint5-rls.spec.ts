import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let adminId: string
let colaboradoraId: string
let otraColaboradoraId: string
let supervisorId: string
let analistaId: string
let comprasId: string
let pdvId: string
let vitrinaId: string
let producto1Id: string

function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

async function ensureAuthUser({
  email,
  password,
  nombre,
  rol,
}: {
  email: string
  password: string
  nombre: string
  rol: 'admin' | 'colaboradora' | 'supervisor' | 'analista' | 'compras'
}) {
  const { data: userList } = await adminSupabase.auth.admin.listUsers()
  const existing = userList.users.find((user) => user.email === email)

  let userId: string

  if (existing) {
    userId = existing.id
    const { error } = await adminSupabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { nombre },
    })
    if (error) throw error
  } else {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    })
    if (error || !data.user) throw error ?? new Error(`No se pudo crear ${email}`)
    userId = data.user.id
  }

  const { error: upsertError } = await adminSupabase.from('usuarios').upsert(
    {
      id: userId,
      nombre,
      email,
      rol,
      activo: true,
    },
    { onConflict: 'id' }
  )
  if (upsertError) throw upsertError

  const { error: updateRolError } = await adminSupabase
    .from('usuarios')
    .update({ nombre, email, rol, activo: true })
    .eq('id', userId)
  if (updateRolError) throw updateRolError

  return userId
}

async function signInAs(email: string, password: string): Promise<SupabaseClient> {
  const client = createAnonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

async function resetInventarioColaboradoras() {
  await adminSupabase
    .from('inventario_colaboradora')
    .delete()
    .in('colaboradora_id', [colaboradoraId, otraColaboradoraId])

  await adminSupabase.from('inventario_colaboradora').insert([
    {
      colaboradora_id: colaboradoraId,
      producto_id: producto1Id,
      cantidad_actual: 4,
    },
    {
      colaboradora_id: otraColaboradoraId,
      producto_id: producto1Id,
      cantidad_actual: 7,
    },
  ])
}

async function resetIncidencias() {
  await adminSupabase.from('fotos_incidencia').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await adminSupabase.from('incidencias').delete().eq('pdv_id', pdvId)
}

test.beforeAll(async () => {
  adminId = await ensureAuthUser({
    email: 'admin@erp.local',
    password: 'Admin1234!',
    nombre: 'Admin',
    rol: 'admin',
  })
  colaboradoraId = await ensureAuthUser({
    email: 'colaboradora@erp.local',
    password: 'Colab1234!',
    nombre: 'Colaboradora Demo',
    rol: 'colaboradora',
  })
  otraColaboradoraId = await ensureAuthUser({
    email: 'colaboradora2@erp.local',
    password: 'Colab1234!',
    nombre: 'Colaboradora Dos',
    rol: 'colaboradora',
  })
  supervisorId = await ensureAuthUser({
    email: 'supervisor@erp.local',
    password: 'Supervisor1234!',
    nombre: 'Supervisor Demo',
    rol: 'supervisor',
  })
  analistaId = await ensureAuthUser({
    email: 'analista@erp.local',
    password: 'Analista1234!',
    nombre: 'Analista Demo',
    rol: 'analista',
  })
  comprasId = await ensureAuthUser({
    email: 'compras@erp.local',
    password: 'Compras1234!',
    nombre: 'Compras Demo',
    rol: 'compras',
  })

  const { data: pdv } = await adminSupabase
    .from('puntos_de_venta')
    .select('id')
    .eq('codigo', 'PDV-001')
    .single()
  pdvId = pdv!.id

  const { data: vitrina } = await adminSupabase
    .from('vitrinas')
    .select('id')
    .eq('codigo', 'VIT-001')
    .single()
  vitrinaId = vitrina!.id

  const { data: producto } = await adminSupabase
    .from('productos')
    .select('id')
    .eq('codigo', 'PRD-001')
    .single()
  producto1Id = producto!.id

  expect(adminId).toBeTruthy()
  expect(supervisorId).toBeTruthy()
  expect(analistaId).toBeTruthy()
  expect(comprasId).toBeTruthy()
})

test.beforeEach(async () => {
  await resetInventarioColaboradoras()
  await resetIncidencias()

  await adminSupabase
    .from('movimientos_inventario')
    .delete()
    .in('referencia_tipo', ['rls_test_baja', 'rls_test_compra'])
})

test('colaboradora solo ve su propio inventario_colaboradora', async () => {
  const colaboradoraClient = await signInAs('colaboradora@erp.local', 'Colab1234!')

  const { data, error } = await colaboradoraClient
    .from('inventario_colaboradora')
    .select('colaboradora_id, producto_id, cantidad_actual')
    .order('cantidad_actual')

  expect(error).toBeNull()
  expect(data?.length).toBe(1)
  expect(data?.[0].colaboradora_id).toBe(colaboradoraId)
  expect(data?.[0].cantidad_actual).toBe(4)
})

test('colaboradora no puede registrar bajas fuera de su propio inventario', async () => {
  const colaboradoraClient = await signInAs('colaboradora@erp.local', 'Colab1234!')

  const bajaCentral = await colaboradoraClient.from('movimientos_inventario').insert({
    tipo: 'baja',
    direccion: 'salida',
    origen_tipo: 'central',
    producto_id: producto1Id,
    cantidad: 1,
    motivo_baja: 'perdida',
    referencia_tipo: 'rls_test_baja',
  })

  expect(bajaCentral.error).not.toBeNull()

  const bajaOtraColaboradora = await colaboradoraClient.from('movimientos_inventario').insert({
    tipo: 'baja',
    direccion: 'salida',
    origen_tipo: 'colaboradora',
    origen_id: otraColaboradoraId,
    producto_id: producto1Id,
    cantidad: 1,
    motivo_baja: 'robo',
    referencia_tipo: 'rls_test_baja',
  })

  expect(bajaOtraColaboradora.error).not.toBeNull()

  const bajaPropia = await colaboradoraClient.from('movimientos_inventario').insert({
    tipo: 'baja',
    direccion: 'salida',
    origen_tipo: 'colaboradora',
    origen_id: colaboradoraId,
    producto_id: producto1Id,
    cantidad: 1,
    motivo_baja: 'dano',
    referencia_tipo: 'rls_test_baja',
  })

  expect(bajaPropia.error).toBeNull()

  const { data: inventarioPropio, error: inventarioPropioError } = await colaboradoraClient
    .from('inventario_colaboradora')
    .select('cantidad_actual')
    .eq('colaboradora_id', colaboradoraId)
    .eq('producto_id', producto1Id)
    .single()

  expect(inventarioPropioError).toBeNull()
  expect(inventarioPropio?.cantidad_actual).toBe(3)
})

test('supervisor puede actualizar incidencias, analista solo leer', async () => {
  const { data: incidencia } = await adminSupabase
    .from('incidencias')
    .insert({
      pdv_id: pdvId,
      vitrina_id: vitrinaId,
      tipo: 'otro',
      descripcion: 'Caso para validar permisos por rol.',
      estado: 'abierta',
      created_by: adminId,
    })
    .select('id')
    .single()

  const supervisorClient = await signInAs('supervisor@erp.local', 'Supervisor1234!')
  const analistaClient = await signInAs('analista@erp.local', 'Analista1234!')

  const updateSupervisor = await supervisorClient
    .from('incidencias')
    .update({ estado: 'en_analisis', responsable_id: supervisorId })
    .eq('id', incidencia!.id)

  expect(updateSupervisor.error).toBeNull()

  const readAnalista = await analistaClient
    .from('incidencias')
    .select('id, estado')
    .eq('id', incidencia!.id)
    .single()

  expect(readAnalista.error).toBeNull()
  expect(readAnalista.data?.estado).toBe('en_analisis')

  const updateAnalista = await analistaClient
    .from('incidencias')
    .update({ estado: 'resuelta', resolucion: 'No deberia poder hacerlo.' })
    .eq('id', incidencia!.id)

  expect(updateAnalista.error).toBeNull()

  const persistedAfterAnalista = await adminSupabase
    .from('incidencias')
    .select('estado, resolucion')
    .eq('id', incidencia!.id)
    .single()

  expect(persistedAfterAnalista.error).toBeNull()
  expect(persistedAfterAnalista.data?.estado).toBe('en_analisis')
  expect(persistedAfterAnalista.data?.resolucion).toBeNull()
})

test('analista y compras pueden consultar inventario valorizado; compras puede registrar compra', async () => {
  const analistaClient = await signInAs('analista@erp.local', 'Analista1234!')
  const comprasClient = await signInAs('compras@erp.local', 'Compras1234!')

  const valorizadoAnalista = await analistaClient
    .from('inventario_valorizado')
    .select('ubicacion_tipo, ubicacion_nombre, cantidad_actual')
    .limit(20)

  expect(valorizadoAnalista.error).toBeNull()
  expect((valorizadoAnalista.data ?? []).length).toBeGreaterThan(0)

  const valorizadoCompras = await comprasClient
    .from('inventario_valorizado')
    .select('ubicacion_tipo, ubicacion_nombre, cantidad_actual')
    .limit(20)

  expect(valorizadoCompras.error).toBeNull()
  expect((valorizadoCompras.data ?? []).length).toBeGreaterThan(0)

  const compra = await comprasClient.from('movimientos_inventario').insert({
    tipo: 'compra',
    direccion: 'entrada',
    destino_tipo: 'central',
    producto_id: producto1Id,
    cantidad: 2,
    referencia_tipo: 'rls_test_compra',
  })

  expect(compra.error).toBeNull()

  const incidenciaCompras = await comprasClient.from('incidencias').insert({
    pdv_id: pdvId,
    vitrina_id: vitrinaId,
    tipo: 'otro',
    descripcion: 'Compras no deberia poder crear incidencias',
    estado: 'abierta',
  })

  expect(incidenciaCompras.error).not.toBeNull()
})
