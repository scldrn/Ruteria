import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getBusinessDate, getBusinessDayUtcRange } from '../lib/dates'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn6zkQAAAAASUVORK5CYII=',
  'base64'
)

let colaboradoraId: string
let pdvId: string
let vitrinaId: string
let rutaId: string
let producto1Id: string
let producto2Id: string

async function loginAdmin(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill('admin@erp.local')
  await page.getByLabel(/contraseña/i).fill('Admin1234!')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('/admin/dashboard')
}

async function loginColaboradora(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill('colaboradora@erp.local')
  await page.getByLabel(/contraseña/i).fill('Colab1234!')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('/campo/ruta-del-dia')
}

async function resetInventariosBase() {
  await adminSupabase
    .from('inventario_colaboradora')
    .delete()
    .eq('colaboradora_id', colaboradoraId)

  await adminSupabase
    .from('movimientos_inventario')
    .delete()
    .eq('referencia_tipo', 'transferencia_colaboradora')
    .eq('destino_id', colaboradoraId)

  await adminSupabase
    .from('inventario_central')
    .update({ cantidad_actual: 50, fecha_actualizacion: new Date().toISOString() })
    .eq('producto_id', producto1Id)

  await adminSupabase
    .from('inventario_central')
    .update({ cantidad_actual: 100, fecha_actualizacion: new Date().toISOString() })
    .eq('producto_id', producto2Id)

  await adminSupabase
    .from('inventario_vitrina')
    .update({ cantidad_actual: 10, fecha_actualizacion: new Date().toISOString() })
    .eq('vitrina_id', vitrinaId)
    .eq('producto_id', producto1Id)

  await adminSupabase
    .from('inventario_vitrina')
    .update({ cantidad_actual: 20, fecha_actualizacion: new Date().toISOString() })
    .eq('vitrina_id', vitrinaId)
    .eq('producto_id', producto2Id)
}

async function seedInventarioColaboradora(rows: Array<{ producto_id: string; cantidad_actual: number }>) {
  await adminSupabase.from('inventario_colaboradora').delete().eq('colaboradora_id', colaboradoraId)

  if (rows.length > 0) {
    await adminSupabase.from('inventario_colaboradora').insert(
      rows.map((row) => ({
        colaboradora_id: colaboradoraId,
        producto_id: row.producto_id,
        cantidad_actual: row.cantidad_actual,
      }))
    )
  }
}

async function createVisita(estado: 'planificada' | 'en_ejecucion' = 'planificada') {
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
    await adminSupabase.from('movimientos_inventario').delete().in('referencia_id', visitaIds)
  }

  await adminSupabase
    .from('cobros')
    .delete()
    .in('visita_id', visitaIds)

  await adminSupabase
    .from('detalle_visita')
    .delete()
    .in('visita_id', visitaIds)

  await adminSupabase
    .from('visitas')
    .delete()
    .eq('pdv_id', pdvId)
    .eq('colaboradora_id', colaboradoraId)
    .gte('created_at', start)
    .lt('created_at', end)

  const { data: visita } = await adminSupabase
    .from('visitas')
    .insert({
      ruta_id: rutaId,
      pdv_id: pdvId,
      vitrina_id: vitrinaId,
      colaboradora_id: colaboradoraId,
      estado,
      fecha_hora_inicio: estado === 'en_ejecucion' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (!visita) throw new Error('No se pudo crear la visita de prueba')
  return visita.id
}

async function seedDetalleConteo(visitaId: string, values: Array<{ producto_id: string; inv_anterior: number; inv_actual: number; precio_unitario: number }>) {
  await adminSupabase.from('detalle_visita').delete().eq('visita_id', visitaId)
  await adminSupabase.from('detalle_visita').insert(
    values.map((value) => ({
      visita_id: visitaId,
      producto_id: value.producto_id,
      inv_anterior: value.inv_anterior,
      inv_actual: value.inv_actual,
      precio_unitario: value.precio_unitario,
      unidades_repuestas: 0,
    }))
  )
}

test.beforeAll(async () => {
  const { data: colab } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('rol', 'colaboradora')
    .limit(1)
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
        codigo: 'RUT-TEST-S4',
        nombre: 'Ruta Test Sprint 4',
        colaboradora_id: colaboradoraId,
        dias_visita: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        estado: 'activa',
      })
      .select('id')
      .single()
    rutaId = nuevaRuta!.id

    await adminSupabase.from('rutas_pdv').insert({
      ruta_id: rutaId,
      pdv_id: pdvId,
      orden_visita: 1,
    })
  }

  const { data: producto1 } = await adminSupabase
    .from('productos')
    .select('id')
    .eq('codigo', 'PRD-001')
    .single()
  producto1Id = producto1!.id

  const { data: producto2 } = await adminSupabase
    .from('productos')
    .select('id')
    .eq('codigo', 'PRD-002')
    .single()
  producto2Id = producto2!.id
})

test.beforeEach(async () => {
  await resetInventariosBase()

  await adminSupabase.from('formas_pago').update({ activo: true }).neq('id', '00000000-0000-0000-0000-000000000000')
  await adminSupabase.from('formas_pago').delete().eq('nombre', 'Deposito bancario')
})

test('admin crea una forma de pago y al desactivarla deja de aparecer en campo', async ({ page }) => {
  const visitaId = await createVisita('en_ejecucion')
  await seedDetalleConteo(visitaId, [
    { producto_id: producto1Id, inv_anterior: 10, inv_actual: 8, precio_unitario: 15000 },
    { producto_id: producto2Id, inv_anterior: 20, inv_actual: 20, precio_unitario: 5000 },
  ])

  await loginAdmin(page)
  await page.goto('/admin/formas-pago')
  await page.getByRole('button', { name: /nueva forma de pago/i }).click()
  await page.getByPlaceholder(/deposito bancario/i).fill('Deposito bancario')
  await page.getByRole('button', { name: /^guardar$/i }).click()
  await expect(page.getByText('Deposito bancario')).toBeVisible()

  await page.getByRole('button', { name: /editar forma de pago deposito bancario/i }).click()
  const switchControl = page.getByRole('switch')
  await switchControl.click()
  await page.getByRole('button', { name: /^guardar$/i }).click()
  await expect(page.getByText('Inactiva')).toBeVisible()

  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)
  await expect(page.getByText(/monto calculado/i)).toBeVisible()
  await expect(page.getByRole('option', { name: 'Deposito bancario' })).toHaveCount(0)
})

test('admin transfiere inventario al campo y se actualizan los stocks', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/inventario')
  await page.getByRole('tab', { name: 'Colaboradoras' }).click()
  await page.getByRole('button', { name: /transferir al campo/i }).click()

  await page.locator('select').first().selectOption(colaboradoraId)
  await page.locator('select').nth(1).selectOption(producto1Id)
  await page.locator('input[type="number"]').first().fill('3')
  await page.getByRole('button', { name: /agregar producto/i }).click()
  await page.locator('select').nth(2).selectOption(producto2Id)
  await page.locator('input[type="number"]').nth(1).fill('4')
  await page.getByRole('button', { name: /confirmar transferencia/i }).click()
  await expect(page.getByRole('dialog', { name: /transferir al campo/i })).not.toBeVisible({ timeout: 5000 })

  const { data: invColab } = await adminSupabase
    .from('inventario_colaboradora')
    .select('producto_id, cantidad_actual')
    .eq('colaboradora_id', colaboradoraId)

  expect(invColab).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ producto_id: producto1Id, cantidad_actual: 3 }),
      expect.objectContaining({ producto_id: producto2Id, cantidad_actual: 4 }),
    ])
  )

  const { data: central1 } = await adminSupabase
    .from('inventario_central')
    .select('cantidad_actual')
    .eq('producto_id', producto1Id)
    .single()
  const { data: central2 } = await adminSupabase
    .from('inventario_central')
    .select('cantidad_actual')
    .eq('producto_id', producto2Id)
    .single()

  expect(central1?.cantidad_actual).toBe(47)
  expect(central2?.cantidad_actual).toBe(96)
})

test('colaboradora completa la visita con cobro y reposicion', async ({ page }) => {
  await seedInventarioColaboradora([
    { producto_id: producto1Id, cantidad_actual: 5 },
    { producto_id: producto2Id, cantidad_actual: 5 },
  ])

  const visitaId = await createVisita('planificada')

  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)
  await page.getByRole('button', { name: /iniciar visita/i }).click()

  const inputs = page.locator('input[type="number"]')
  await inputs.nth(0).fill('8')
  await inputs.nth(1).fill('17')
  await page.getByRole('button', { name: /guardar conteo/i }).click()

  await expect(page.getByText(/monto calculado/i)).toBeVisible()
  await page.locator('select').selectOption({ label: 'Efectivo' })
  await page.getByRole('button', { name: /continuar a reposicion/i }).click()

  await page.getByRole('button', { name: /continuar a fotos/i }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'foto-visita.png',
    mimeType: 'image/png',
    buffer: SAMPLE_PNG,
  })
  await page.getByRole('button', { name: /continuar a confirmar/i }).click()
  await page.getByRole('button', { name: /cerrar visita/i }).click()

  await page.waitForURL('/campo/ruta-del-dia')

  const { data: visita } = await adminSupabase
    .from('visitas')
    .select('estado, monto_cobrado')
    .eq('id', visitaId)
    .single()
  expect(visita?.estado).toBe('completada')
  expect(Number(visita?.monto_cobrado)).toBe(45000)

  const { data: detalle } = await adminSupabase
    .from('detalle_visita')
    .select('producto_id, unidades_repuestas')
    .eq('visita_id', visitaId)

  expect(detalle).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ producto_id: producto1Id, unidades_repuestas: 2 }),
      expect.objectContaining({ producto_id: producto2Id, unidades_repuestas: 3 }),
    ])
  )

  const { data: stockColab } = await adminSupabase
    .from('inventario_colaboradora')
    .select('producto_id, cantidad_actual')
    .eq('colaboradora_id', colaboradoraId)

  expect(stockColab).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ producto_id: producto1Id, cantidad_actual: 3 }),
      expect.objectContaining({ producto_id: producto2Id, cantidad_actual: 2 }),
    ])
  )
})

test('la visita no puede continuar a confirmacion sin al menos una foto final', async ({ page }) => {
  const visitaId = await createVisita('en_ejecucion')
  await seedDetalleConteo(visitaId, [
    { producto_id: producto1Id, inv_anterior: 10, inv_actual: 8, precio_unitario: 15000 },
    { producto_id: producto2Id, inv_anterior: 20, inv_actual: 20, precio_unitario: 5000 },
  ])

  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)
  await page.locator('select').selectOption({ label: 'Efectivo' })
  await page.getByRole('button', { name: /continuar a reposicion/i }).click()
  await page.getByRole('button', { name: /continuar a fotos/i }).click()

  await expect(page.getByText(/se requiere al menos una foto final/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /continuar a confirmar/i })).toBeDisabled()
})

test('cobro con discrepancia exige nota y admin ve el badge', async ({ page }) => {
  await seedInventarioColaboradora([
    { producto_id: producto1Id, cantidad_actual: 0 },
    { producto_id: producto2Id, cantidad_actual: 0 },
  ])

  const visitaId = await createVisita('en_ejecucion')
  await seedDetalleConteo(visitaId, [
    { producto_id: producto1Id, inv_anterior: 10, inv_actual: 8, precio_unitario: 15000 },
    { producto_id: producto2Id, inv_anterior: 20, inv_actual: 20, precio_unitario: 5000 },
  ])

  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)
  await page.locator('input[type="number"]').first().fill('20000')
  await page.locator('select').selectOption({ label: 'Efectivo' })
  await page.getByRole('button', { name: /continuar a reposicion/i }).click()
  await expect(page.getByText(/nota es obligatoria/i)).toBeVisible()

  await page.locator('textarea').fill('El comercio quedo debiendo una parte')
  await page.getByRole('button', { name: /continuar a reposicion/i }).click()
  await page.getByRole('button', { name: /continuar a fotos/i }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'foto-discrepancia.png',
    mimeType: 'image/png',
    buffer: SAMPLE_PNG,
  })
  await page.getByRole('button', { name: /continuar a confirmar/i }).click()
  await page.getByRole('button', { name: /cerrar visita/i }).click()
  await page.waitForURL('/campo/ruta-del-dia')

  await loginAdmin(page)
  await page.goto('/admin/visitas')
  await expect(page.getByText('Discrepancia')).toBeVisible()
})
