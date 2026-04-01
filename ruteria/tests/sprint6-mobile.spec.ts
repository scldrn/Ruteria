import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getBusinessDate, getBusinessDayUtcRange } from '../lib/dates'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test.use({ viewport: { width: 390, height: 844 } })

let colaboradoraId: string
let pdvId: string
let vitrinaId: string
let rutaId: string
let visitaId: string

async function loginColaboradora(page: Page) {
  await page.goto('/favicon.ico')
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

async function ensureVisitaEnEjecucion() {
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
      estado: 'en_ejecucion',
      fecha_hora_inicio: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (!visita) throw new Error('No se pudo crear visita móvil')
  visitaId = visita.id
}

test.beforeAll(async () => {
  const { data: colab } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('email', 'colaboradora@erp.local')
    .single()
  colaboradoraId = colab!.id

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
    .single()
  rutaId = ruta!.id
})

test.beforeEach(async () => {
  await ensureVisitaEnEjecucion()
})

test('visita en móvil mantiene layout usable y sin overflow horizontal', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  await expect(page.getByText('Tienda Demo Norte')).toBeVisible()
  await expect(page.getByText(/en línea|sin conexión|pendiente por sincronizar/i)).toBeVisible()

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
})

test('sheet de incidencias y CTA principal son usables en viewport móvil', async ({ page }) => {
  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)

  const actionButton = page.getByRole('button', { name: /reportar incidencia/i })
  const actionBox = await actionButton.boundingBox()
  expect(actionBox?.width ?? 0).toBeGreaterThan(260)

  await actionButton.click()
  const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Reportar incidencia' })
  await expect(sheet).toBeVisible()

  const sheetBox = await sheet.boundingBox()
  expect(sheetBox?.width ?? 0).toBeLessThanOrEqual(420)

  await sheet.locator('textarea').fill('Validacion de sheet movil.')
  await expect(sheet.locator('textarea')).toHaveValue('Validacion de sheet movil.')
})
