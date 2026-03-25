import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getBusinessDate, getBusinessDayUtcRange } from '../lib/dates'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let colaboradoraId: string
let pdvId: string
let vitrinaId: string
let rutaId: string
let producto1Id: string
let producto2Id: string
let colaboradoraNombre: string

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
    .from('movimientos_inventario')
    .delete()
    .eq('referencia_tipo', 'baja_manual')
    .eq('producto_id', producto1Id)

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

async function resetIncidencias() {
  await adminSupabase.from('fotos_incidencia').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await adminSupabase.from('incidencias').delete().eq('pdv_id', pdvId)
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
    await adminSupabase.from('fotos_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('cobros').delete().in('visita_id', visitaIds)
    await adminSupabase.from('detalle_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('incidencias').delete().in('visita_id', visitaIds)
  }

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

test.beforeAll(async () => {
  const { data: colab } = await adminSupabase
    .from('usuarios')
    .select('id, nombre')
    .eq('rol', 'colaboradora')
    .limit(1)
    .single()
  if (!colab) throw new Error('No se encontro colaboradora de prueba')
  colaboradoraId = colab.id
  colaboradoraNombre = colab.nombre

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
        codigo: 'RUT-TEST-S5',
        nombre: 'Ruta Test Sprint 5',
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
  await seedInventarioColaboradora([{ producto_id: producto1Id, cantidad_actual: 4 }])
  await resetIncidencias()
})

test('admin no puede registrar una baja mayor al stock disponible de colaboradora', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/inventario')

  await page.getByRole('button', { name: /registrar baja/i }).click()

  const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Registrar baja de inventario' })
  await sheet.locator('select').nth(0).selectOption('colaboradora')
  await sheet.locator('select').nth(1).selectOption(colaboradoraId)
  await sheet.locator('select').nth(2).selectOption(producto1Id)
  await sheet.locator('input[type="number"]').fill('9')
  await sheet.locator('select').nth(3).selectOption('robo')
  await sheet.getByRole('button', { name: /registrar baja/i }).click()

  await expect(page.getByText(/no puede exceder el stock disponible/i)).toBeVisible()
  await expect(sheet).toBeVisible()

  const { data: bajas } = await adminSupabase
    .from('movimientos_inventario')
    .select('id')
    .eq('tipo', 'baja')
    .eq('origen_tipo', 'colaboradora')
    .eq('origen_id', colaboradoraId)

  expect(bajas ?? []).toHaveLength(0)
})

test('admin registra una baja y la ve en historial y valorizado', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/inventario')

  await page.getByRole('button', { name: /registrar baja/i }).click()

  const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Registrar baja de inventario' })
  await sheet.locator('select').nth(0).selectOption('central')
  await sheet.locator('select').nth(1).selectOption(producto1Id)
  await sheet.locator('input[type="number"]').fill('3')
  await sheet.locator('select').nth(2).selectOption('perdida')
  await sheet.locator('textarea').fill('Baja de prueba sprint 5')
  await sheet.getByRole('button', { name: /registrar baja/i }).click()

  await expect(sheet).toBeHidden()

  const { data: inventarioCentral } = await adminSupabase
    .from('inventario_central')
    .select('cantidad_actual')
    .eq('producto_id', producto1Id)
    .single()

  expect(inventarioCentral?.cantidad_actual).toBe(47)

  const { data: ultimaBaja } = await adminSupabase
    .from('movimientos_inventario')
    .select('tipo, motivo_baja, cantidad, referencia_tipo')
    .eq('producto_id', producto1Id)
    .eq('tipo', 'baja')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  expect(ultimaBaja?.motivo_baja).toBe('perdida')
  expect(ultimaBaja?.cantidad).toBe(3)
  expect(ultimaBaja?.referencia_tipo).toBe('baja_manual')

  await page.getByRole('tab', { name: 'Movimientos' }).click()
  await expect(page.getByText('perdida')).toBeVisible()
  await expect(page.getByText('Bodega central').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Valorizado' }).click()
  const valorizadoTable = page.locator('table').last()
  await expect(valorizadoTable.getByText('Bodega central').first()).toBeVisible()
  await expect(valorizadoTable.getByText(colaboradoraNombre).first()).toBeVisible()
  await expect(valorizadoTable.getByText('VIT-001').first()).toBeVisible()
})

test('colaboradora registra incidencia y admin completa el ciclo de vida con resolucion obligatoria', async ({ page }) => {
  const visitaId = await createVisita('en_ejecucion')

  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await page.getByRole('button', { name: /reportar incidencia/i }).click()
  const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Reportar incidencia' })
  await sheet.locator('select').selectOption('robo')
  await sheet.locator('textarea').fill('Faltan unidades en la vitrina y el comercio reporta posible hurto.')
  await sheet.getByRole('button', { name: /registrar incidencia/i }).click()
  await expect(sheet).toBeHidden()

  const { data: incidenciaCreada } = await adminSupabase
    .from('incidencias')
    .select('id, estado, descripcion')
    .eq('visita_id', visitaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  expect(incidenciaCreada?.estado).toBe('abierta')

  await loginAdmin(page)
  await page.goto('/admin/incidencias')

  await page.getByRole('button', { name: /gestionar/i }).click()
  const detail = page.locator('[role="dialog"]').filter({ hasText: 'Detalle de incidencia' })
  await detail.getByRole('button', { name: /pasar a en analisis/i }).click()
  await expect(detail).toBeHidden()

  const { data: incidenciaTrasAnalisis } = await adminSupabase
    .from('incidencias')
    .select('estado, resolucion, fecha_cierre')
    .eq('id', incidenciaCreada!.id)
    .single()

  expect(incidenciaTrasAnalisis?.estado).toBe('en_analisis')

  await page.getByRole('button', { name: /gestionar/i }).click()
  const detailAnalisis = page.locator('[role="dialog"]').filter({ hasText: 'Detalle de incidencia' })
  await detailAnalisis.getByRole('button', { name: /marcar como resuelta/i }).click()

  const incidenciaSinResolucion = (
    await adminSupabase
      .from('incidencias')
      .select('estado')
      .eq('id', incidenciaCreada!.id)
      .single()
  ).data

  expect(incidenciaSinResolucion?.estado).toBe('en_analisis')

  await detailAnalisis.locator('textarea').fill('Se valido con el comercio, se ajusto el inventario y queda en seguimiento.')
  await detailAnalisis.getByRole('button', { name: /marcar como resuelta/i }).click()
  await expect(detailAnalisis).toBeHidden()

  const incidenciaResuelta = (
    await adminSupabase
      .from('incidencias')
      .select('estado, resolucion')
      .eq('id', incidenciaCreada!.id)
      .single()
  ).data

  expect(incidenciaResuelta?.estado).toBe('resuelta')
  expect(incidenciaResuelta?.resolucion).toContain('Se valido con el comercio')

  await page.locator('select').first().selectOption('resuelta')
  await page.getByRole('button', { name: /gestionar/i }).click()
  const detailResuelta = page.locator('[role="dialog"]').filter({ hasText: 'Detalle de incidencia' })
  await detailResuelta.getByRole('button', { name: /cerrar incidencia/i }).click()
  await expect(detailResuelta).toBeHidden()

  const incidenciaCerrada = (
    await adminSupabase
      .from('incidencias')
      .select('estado, fecha_cierre')
      .eq('id', incidenciaCreada!.id)
      .single()
  ).data

  expect(incidenciaCerrada?.estado).toBe('cerrada')
  expect(incidenciaCerrada?.fecha_cierre).not.toBeNull()
})

test('la base de datos bloquea transiciones invalidas de incidencia', async () => {
  const { data: incidencia } = await adminSupabase
    .from('incidencias')
    .insert({
      pdv_id: pdvId,
      vitrina_id: vitrinaId,
      tipo: 'otro',
      descripcion: 'Incidencia de prueba para validar trigger.',
      estado: 'abierta',
    })
    .select('id')
    .single()

  expect(incidencia).toBeTruthy()

  const cierreDirecto = await adminSupabase
    .from('incidencias')
    .update({ estado: 'cerrada' })
    .eq('id', incidencia!.id)

  expect(cierreDirecto.error).not.toBeNull()

  const resolverSinResolucion = await adminSupabase
    .from('incidencias')
    .update({ estado: 'en_analisis' })
    .eq('id', incidencia!.id)

  expect(resolverSinResolucion.error).toBeNull()

  const resolverInvalido = await adminSupabase
    .from('incidencias')
    .update({ estado: 'resuelta' })
    .eq('id', incidencia!.id)

  expect(resolverInvalido.error).not.toBeNull()
})

test('filtro pendientes de incidencias oculta incidencias cerradas', async ({ page }) => {
  await adminSupabase.from('incidencias').insert([
    {
      pdv_id: pdvId,
      vitrina_id: vitrinaId,
      tipo: 'robo',
      descripcion: 'Incidencia abierta visible en pendientes.',
      estado: 'abierta',
    },
    {
      pdv_id: pdvId,
      vitrina_id: vitrinaId,
      tipo: 'otro',
      descripcion: 'Incidencia cerrada que no debe verse en pendientes.',
      estado: 'abierta',
    },
  ])

  const { data: incidencias } = await adminSupabase
    .from('incidencias')
    .select('id, descripcion')
    .eq('pdv_id', pdvId)
    .order('created_at', { ascending: true })

  const abierta = incidencias?.find((item) => item.descripcion.includes('visible'))
  const paraCerrar = incidencias?.find((item) => item.descripcion.includes('no debe verse'))
  expect(abierta).toBeTruthy()
  expect(paraCerrar).toBeTruthy()

  await adminSupabase.from('incidencias').update({ estado: 'en_analisis' }).eq('id', paraCerrar!.id)
  await adminSupabase
    .from('incidencias')
    .update({ estado: 'resuelta', resolucion: 'Se resolvio correctamente.' })
    .eq('id', paraCerrar!.id)
  await adminSupabase
    .from('incidencias')
    .update({ estado: 'cerrada', resolucion: 'Se resolvio correctamente.' })
    .eq('id', paraCerrar!.id)

  await loginAdmin(page)
  await page.goto('/admin/incidencias')

  await expect(page.getByRole('button', { name: /gestionar/i })).toHaveCount(1)
  await expect(page.getByRole('cell', { name: 'robo' })).toBeVisible()
})
