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
let visitaId: string

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
  await page.click('button[type="submit"]')
  await page.waitForURL('/campo/ruta-del-dia')
}

async function ensureVisitaPlanificada() {
  const hoy = getBusinessDate()
  const { start, end } = getBusinessDayUtcRange(hoy)

  const { data: visitasHoy } = await adminSupabase
    .from('visitas')
    .select('id')
    .eq('pdv_id', pdvId)
    .eq('vitrina_id', vitrinaId)
    .eq('colaboradora_id', colaboradoraId)
    .gte('created_at', start)
    .lt('created_at', end)

  const visitaIds = visitasHoy?.map((row) => row.id) ?? []

  if (visitaIds.length > 0) {
    await adminSupabase.from('sync_operaciones_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('movimientos_inventario').delete().in('referencia_id', visitaIds)
    await adminSupabase.from('cobros').delete().in('visita_id', visitaIds)
    await adminSupabase.from('detalle_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('fotos_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('incidencias').delete().in('visita_id', visitaIds)
  }

  await adminSupabase
    .from('visitas')
    .delete()
    .eq('pdv_id', pdvId)
    .eq('vitrina_id', vitrinaId)
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
      estado: 'planificada',
    })
    .select('id')
    .single()

  if (!visita) throw new Error('No se pudo crear visita de prueba offline')
  visitaId = visita.id
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
        codigo: 'RUT-TEST-S6-OFF',
        nombre: 'Ruta Test Sprint 6 Offline',
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
})

test.beforeEach(async () => {
  await ensureVisitaPlanificada()
})

test('ruta del dia reutiliza snapshot local cuando fallan los requests de datos', async ({ page }) => {
  await loginColaboradora(page)
  await expect(page.getByText('Tienda Demo Norte').first()).toBeVisible()

  await page.route('**/rest/v1/**', async (route) => {
    await route.abort('failed')
  })

  await page.reload()

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Tienda Demo Norte').first()).toBeVisible()
  await expect(page.getByText(/mostrando datos guardados/i)).toBeVisible()
})

test('detalle de visita ya abierto reutiliza snapshot local cuando fallan los requests de datos', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await expect(page.getByText('Tienda Demo Norte')).toBeVisible()
  await expect(page.getByRole('button', { name: /iniciar visita/i })).toBeVisible()

  await page.route('**/rest/v1/**', async (route) => {
    await route.abort('failed')
  })

  await page.reload()

  await expect(page.getByText('Tienda Demo Norte')).toBeVisible()
  await expect(page.getByRole('button', { name: /iniciar visita/i })).toBeVisible()
  await expect(page.getByText(/mostrando datos guardados/i)).toBeVisible()
})

test('iniciar visita sin requests disponibles crea draft local y sincroniza al recuperar conexion', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await expect(page.getByRole('button', { name: /iniciar visita/i })).toBeVisible()

  await page.route('**/rest/v1/**', async (route) => {
    await route.abort('failed')
  })

  await page.getByRole('button', { name: /iniciar visita/i }).click()

  await expect(page.getByRole('button', { name: /guardar conteo/i })).toBeVisible()

  await page.getByRole('button', { name: /volver/i }).click()
  await page.waitForURL('/campo/ruta-del-dia')
  await expect(page.getByText('Pendiente sync')).toBeVisible()

  await page.unroute('**/rest/v1/**')
  await page.reload()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('visitas')
        .select('estado, fecha_hora_inicio')
        .eq('id', visitaId)
        .single()

      return `${data?.estado ?? 'missing'}:${data?.fecha_hora_inicio ? 'started' : 'pending'}`
    })
    .toBe('en_ejecucion:started')

  await expect(page.getByText('Pendiente sync')).not.toBeVisible()
  await expect(page.getByRole('button', { name: /continuar/i })).toBeVisible()
})

test('marcar no realizada sin requests disponibles crea draft local y sincroniza al recuperar conexion', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await expect(page.getByRole('button', { name: /marcar como no realizada/i })).toBeVisible()

  await page.route('**/rest/v1/**', async (route) => {
    await route.abort('failed')
  })

  await page.getByRole('button', { name: /marcar como no realizada/i }).click()
  await page.locator('textarea').fill('Local cerrado por inventario anual')
  await page.getByRole('button', { name: /confirmar/i }).click()
  await page.waitForURL('/campo/ruta-del-dia')

  await expect(page.getByText('Pendiente sync')).toBeVisible()
  await expect(page.getByText('Local cerrado por inventario anual')).toBeVisible()

  await page.unroute('**/rest/v1/**')
  await page.reload()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('visitas')
        .select('estado, motivo_no_realizada')
        .eq('id', visitaId)
        .single()

      return `${data?.estado ?? 'missing'}:${data?.motivo_no_realizada ?? 'sin-motivo'}`
    })
    .toBe('no_realizada:Local cerrado por inventario anual')

  await expect(page.getByText('Pendiente sync')).not.toBeVisible()
  await expect(page.getByText('Local cerrado por inventario anual')).toBeVisible()
})

test('crear incidencia sin requests disponibles la guarda localmente y la sincroniza al recuperar conexion', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await page.getByRole('button', { name: /iniciar visita/i }).click()
  await expect(page.getByRole('button', { name: /reportar incidencia/i })).toBeVisible()

  await page.route('**/rest/v1/**', async (route) => {
    await route.abort('failed')
  })

  await page.getByRole('button', { name: /reportar incidencia/i }).click()
  const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Reportar incidencia' })
  await sheet.locator('select').selectOption('robo')
  await sheet.locator('textarea').fill('Incidencia creada sin conexion para validar cola.')
  await sheet.getByRole('button', { name: /registrar incidencia/i }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: /reportar incidencia/i })).toContainText('1')
  await expect(page.getByText('Pendiente por sincronizar')).toBeVisible()

  await page.unroute('**/rest/v1/**')
  await page.reload()

  await expect
    .poll(async () => {
      const { count } = await adminSupabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('visita_id', visitaId)
        .eq('descripcion', 'Incidencia creada sin conexion para validar cola.')

      return count ?? 0
    })
    .toBe(1)

  await expect(page.getByRole('button', { name: /reportar incidencia/i })).toContainText('1')
})

test('subir foto sin requests disponibles la deja pendiente y la sincroniza al recuperar conexion', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await page.getByRole('button', { name: /iniciar visita/i }).click()

  const conteoInputs = page.locator('input[type="number"]')
  await conteoInputs.nth(0).fill('8')
  await conteoInputs.nth(1).fill('20')
  await page.getByRole('button', { name: /guardar conteo/i }).click()

  await page.locator('input[inputmode="decimal"]').fill('30000')
  await page.locator('select').selectOption({ label: 'Efectivo' })
  if (await page.getByPlaceholder(/explica por que el monto cobrado/i).isVisible()) {
    await page.getByPlaceholder(/explica por que el monto cobrado/i).fill('Cobro offline con discrepancia controlada.')
  }
  await page.getByRole('button', { name: /continuar a reposicion/i }).click()
  await page.getByRole('button', { name: /continuar a fotos/i }).click()

  await page.route('**/rest/v1/**', async (route) => {
    await route.abort('failed')
  })

  await page.locator('input[type="file"]').setInputFiles({
    name: 'foto-offline.png',
    mimeType: 'image/png',
    buffer: SAMPLE_PNG,
  })

  await expect(page.getByText(/foto guardada en este dispositivo/i)).toBeVisible()
  await page.getByRole('button', { name: /continuar a confirmar/i }).click()
  await expect(page.getByText(/1 foto\(s\) cargadas/i)).toBeVisible()

  await page.unroute('**/rest/v1/**')
  await page.reload()

  await expect
    .poll(async () => {
      const { count } = await adminSupabase
        .from('fotos_visita')
        .select('*', { count: 'exact', head: true })
        .eq('visita_id', visitaId)

      return count ?? 0
    })
    .toBe(1)
})

test('cerrar visita sin requests disponibles crea cierre pendiente y sincroniza al recuperar conexion', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await page.getByRole('button', { name: /iniciar visita/i }).click()

  const conteoInputs = page.locator('input[type="number"]')
  await conteoInputs.nth(0).fill('8')
  await conteoInputs.nth(1).fill('20')
  await page.getByRole('button', { name: /guardar conteo/i }).click()

  await expect(page.getByText(/monto calculado/i)).toBeVisible()
  await page.locator('input[inputmode="decimal"]').fill('30000')
  await page.locator('select').selectOption({ label: 'Efectivo' })
  if (await page.getByPlaceholder(/explica por que el monto cobrado/i).isVisible()) {
    await page.getByPlaceholder(/explica por que el monto cobrado/i).fill('Cierre offline con discrepancia controlada.')
  }
  await page.getByRole('button', { name: /continuar a reposicion/i }).click()
  await expect(page.getByRole('button', { name: /continuar a fotos/i })).toBeVisible()
  await page.getByRole('button', { name: /continuar a fotos/i }).click()
  await page.getByRole('button', { name: /saltar fotos/i }).click()

  await page.route('**/rest/v1/**', async (route) => {
    await route.abort('failed')
  })

  await page.getByRole('button', { name: /cerrar visita/i }).click()
  await page.waitForURL('/campo/ruta-del-dia')

  await expect(page.getByText('Pendiente sync')).toBeVisible()
  await expect(page.getByText('Completada', { exact: true })).toBeVisible()

  await page.unroute('**/rest/v1/**')
  await page.reload()

  await expect
    .poll(async () => {
      const [{ data: visita }, { count: cobrosCount }] = await Promise.all([
        adminSupabase
          .from('visitas')
          .select('estado, monto_cobrado')
          .eq('id', visitaId)
          .single(),
        adminSupabase
          .from('cobros')
          .select('*', { count: 'exact', head: true })
          .eq('visita_id', visitaId),
      ])

      return `${visita?.estado ?? 'missing'}:${Number(visita?.monto_cobrado ?? 0)}:${cobrosCount ?? 0}`
    })
    .toBe('completada:30000:1')

  await expect(page.getByText('Pendiente sync')).not.toBeVisible()
})
