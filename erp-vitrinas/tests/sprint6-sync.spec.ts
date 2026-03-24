import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getBusinessDate, getBusinessDayUtcRange } from '../lib/dates'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let colaboradoraId: string
let pdvId: string
let vitrinaId: string
let rutaId: string
let producto1Id: string
let formaPagoId: string

function createAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

async function signInAs(email: string, password: string): Promise<SupabaseClient> {
  const client = createAnonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

async function resetBaseData() {
  const hoy = getBusinessDate()
  const { start, end } = getBusinessDayUtcRange(hoy)

  const { data: visitasHoy } = await adminSupabase
    .from('visitas')
    .select('id')
    .eq('pdv_id', pdvId)
    .eq('colaboradora_id', colaboradoraId)
    .gte('created_at', start)
    .lt('created_at', end)

  const visitaIds = visitasHoy?.map((row) => row.id) ?? []

  if (visitaIds.length > 0) {
    await adminSupabase.from('sync_operaciones_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('movimientos_inventario').delete().in('referencia_id', visitaIds)
    await adminSupabase.from('cobros').delete().in('visita_id', visitaIds)
    await adminSupabase.from('detalle_visita').delete().in('visita_id', visitaIds)
  }

  await adminSupabase
    .from('visitas')
    .delete()
    .eq('pdv_id', pdvId)
    .eq('colaboradora_id', colaboradoraId)
    .gte('created_at', start)
    .lt('created_at', end)

  await adminSupabase
    .from('inventario_colaboradora')
    .delete()
    .eq('colaboradora_id', colaboradoraId)

  await adminSupabase.from('inventario_colaboradora').insert({
    colaboradora_id: colaboradoraId,
    producto_id: producto1Id,
    cantidad_actual: 5,
  })

  await adminSupabase
    .from('inventario_vitrina')
    .update({ cantidad_actual: 10, fecha_actualizacion: new Date().toISOString() })
    .eq('vitrina_id', vitrinaId)
    .eq('producto_id', producto1Id)
}

async function createVisitaEnEjecucion() {
  const { data: visita } = await adminSupabase
    .from('visitas')
    .insert({
      ruta_id: rutaId,
      pdv_id: pdvId,
      vitrina_id: vitrinaId,
      colaboradora_id: colaboradoraId,
      estado: 'en_ejecucion',
      fecha_hora_inicio: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (!visita) throw new Error('No se pudo crear visita de prueba')

  await adminSupabase.from('detalle_visita').insert({
    visita_id: visita.id,
    producto_id: producto1Id,
    inv_anterior: 10,
    inv_actual: 8,
    precio_unitario: 15000,
    unidades_repuestas: 0,
  })

  return visita.id
}

test.beforeAll(async () => {
  const { data: colab } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('email', 'colaboradora@erp.local')
    .single()
  if (!colab) throw new Error('No se encontro colaboradora de prueba')
  colaboradoraId = colab.id

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

  const { data: ruta } = await adminSupabase
    .from('rutas')
    .select('id')
    .eq('colaboradora_id', colaboradoraId)
    .limit(1)
    .maybeSingle()

  if (ruta) {
    rutaId = ruta.id
  } else {
    const { data: nuevaRuta } = await adminSupabase
      .from('rutas')
      .insert({
        codigo: 'RUT-TEST-S6',
        nombre: 'Ruta Test Sprint 6',
        colaboradora_id: colaboradoraId,
        dias_visita: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        estado: 'activa',
      })
      .select('id')
      .single()

    if (!nuevaRuta) throw new Error('No se pudo crear ruta de prueba')
    rutaId = nuevaRuta.id

    await adminSupabase.from('rutas_pdv').insert({
      ruta_id: rutaId,
      pdv_id: pdvId,
      orden_visita: 1,
    })
  }

  const { data: producto } = await adminSupabase
    .from('productos')
    .select('id')
    .eq('codigo', 'PRD-001')
    .single()
  producto1Id = producto!.id

  const { data: formaPago } = await adminSupabase
    .from('formas_pago')
    .select('id')
    .eq('nombre', 'Efectivo')
    .single()
  formaPagoId = formaPago!.id
})

test.beforeEach(async () => {
  await resetBaseData()
})

test('cerrar_visita_offline es idempotente para el mismo client_sync_id', async () => {
  const visitaId = await createVisitaEnEjecucion()
  const colaboradoraClient = await signInAs('colaboradora@erp.local', 'Colab1234!')
  const syncId = crypto.randomUUID()

  const payload = {
    p_visita_id: visitaId,
    p_cobro: {
      monto: 30000,
      forma_pago_id: formaPagoId,
    },
    p_reposiciones: [],
    p_client_sync_id: syncId,
  }

  const firstClose = await colaboradoraClient.rpc('cerrar_visita_offline', payload)
  expect(firstClose.error).toBeNull()

  const secondClose = await colaboradoraClient.rpc('cerrar_visita_offline', payload)
  expect(secondClose.error).toBeNull()

  const { data: visitaFinal } = await adminSupabase
    .from('visitas')
    .select('estado, monto_cobrado')
    .eq('id', visitaId)
    .single()

  expect(visitaFinal?.estado).toBe('completada')
  expect(Number(visitaFinal?.monto_cobrado ?? 0)).toBe(30000)

  const { count: cobrosCount, error: cobrosError } = await adminSupabase
    .from('cobros')
    .select('*', { count: 'exact', head: true })
    .eq('visita_id', visitaId)

  expect(cobrosError).toBeNull()
  expect(cobrosCount).toBe(1)

  const { data: movimientos, error: movimientosError } = await adminSupabase
    .from('movimientos_inventario')
    .select('tipo, cantidad, referencia_id')
    .eq('referencia_id', visitaId)
    .order('created_at', { ascending: true })

  expect(movimientosError).toBeNull()
  expect(movimientos ?? []).toHaveLength(1)
  expect(movimientos?.[0].tipo).toBe('venta')
  expect(movimientos?.[0].cantidad).toBe(2)

  const { data: syncRecord, error: syncError } = await adminSupabase
    .from('sync_operaciones_visita')
    .select('client_sync_id, visita_id, tipo')
    .eq('client_sync_id', syncId)
    .single()

  expect(syncError).toBeNull()
  expect(syncRecord?.visita_id).toBe(visitaId)
  expect(syncRecord?.tipo).toBe('close')
})
