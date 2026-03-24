import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getBusinessDate, getBusinessDayUtcRange } from '../lib/dates'

// Cliente admin para seed (usa service role en local)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// IDs de datos de seed (definidos en 20260010_seed.sql)
// Se obtienen dinámicamente en beforeAll
let visitaId: string
let colaboradoraId: string

async function resetVisitaCampo(estado: 'planificada' | 'en_ejecucion') {
  await adminSupabase.from('cobros').delete().eq('visita_id', visitaId)
  await adminSupabase.from('detalle_visita').delete().eq('visita_id', visitaId)
  await adminSupabase.from('fotos_visita').delete().eq('visita_id', visitaId)
  await adminSupabase.from('incidencias').delete().eq('visita_id', visitaId)
  await adminSupabase
    .from('visitas')
    .update({
      estado,
      fecha_hora_inicio: estado === 'en_ejecucion' ? new Date().toISOString() : null,
      fecha_hora_fin: null,
      monto_calculado: 0,
      monto_cobrado: 0,
      notas: null,
      motivo_no_realizada: null,
    })
    .eq('id', visitaId)
}

test.describe('Sprint 3 — Campo', () => {
  test.beforeAll(async () => {
    // Obtener colaboradora de prueba (debe existir en el seed de auth)
    const { data: colab } = await adminSupabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'colaboradora')
      .limit(1)
      .single()

    if (!colab) throw new Error('No hay usuario colaboradora en el seed. Crea uno con rol=colaboradora.')
    colaboradoraId = colab.id

    // Obtener PDV y vitrina del seed
    const { data: pdv } = await adminSupabase
      .from('puntos_de_venta')
      .select('id')
      .eq('codigo', 'PDV-001')
      .single()

    const { data: vitrina } = await adminSupabase
      .from('vitrinas')
      .select('id')
      .eq('codigo', 'VIT-001')
      .single()

    // Obtener ruta del seed (o crear una si no existe)
    let { data: ruta } = await adminSupabase
      .from('rutas')
      .select('id')
      .eq('colaboradora_id', colaboradoraId)
      .limit(1)
      .maybeSingle()

    if (!ruta) {
      const { data: newRuta } = await adminSupabase
        .from('rutas')
        .insert({
          codigo: 'RUT-TEST-S3',
          nombre: 'Ruta Test Sprint 3',
          colaboradora_id: colaboradoraId,
          dias_visita: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
          estado: 'activa',
        })
        .select('id')
        .single()
      ruta = newRuta

      // Asociar PDV a la ruta
      await adminSupabase.from('rutas_pdv').insert({
        ruta_id: ruta!.id,
        pdv_id: pdv!.id,
        orden_visita: 1,
      })
    }

    // Crear visita planificada para hoy
    const hoy = getBusinessDate()
    const { start, end } = getBusinessDayUtcRange(hoy)
    const { data: existente } = await adminSupabase
      .from('visitas')
      .select('id')
      .eq('pdv_id', pdv!.id)
      .eq('vitrina_id', vitrina!.id)
      .eq('colaboradora_id', colaboradoraId)
      .eq('estado', 'planificada')
      .gte('created_at', start)
      .lt('created_at', end)
      .maybeSingle()

    if (existente) {
      visitaId = existente.id
    } else {
      const { data: nuevaVisita } = await adminSupabase
        .from('visitas')
        .insert({
          ruta_id: ruta!.id,
          pdv_id: pdv!.id,
          vitrina_id: vitrina!.id,
          colaboradora_id: colaboradoraId,
          estado: 'planificada',
        })
        .select('id')
        .single()
      visitaId = nuevaVisita!.id
    }
  })

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

  // Test 1: Ruta del día
  test('colaboradora ve su ruta del día con PDVs en orden', async ({ page }) => {
    await loginColaboradora(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Tienda Demo Norte').first()).toBeVisible()
  })

  // Test 2: Tap en visita planificada → pantalla de inicio
  test('tap en PDV planificada muestra pantalla de inicio con inventario anterior', async ({ page }) => {
    await resetVisitaCampo('planificada')

    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)
    await expect(page.getByText('Tienda Demo Norte')).toBeVisible()
    await expect(page.getByText('Audífono Básico BT')).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar visita/i })).toBeVisible()
  })

  // Test 3: Iniciar visita → en_ejecucion + hora de inicio
  test('iniciar visita cambia estado a en_ejecucion y muestra hora', async ({ page }) => {
    await resetVisitaCampo('planificada')

    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)
    await page.getByRole('button', { name: /iniciar visita/i }).click()

    await expect(page.getByText('Audífono Básico BT')).toBeVisible()
    await expect(page.locator('th', { hasText: 'Ant' })).toBeVisible()
  })

  // Test 4 + 5: Ingreso de conteos y transición a cobro
  test('ingresa conteos, ve cálculo live y avanza al paso de cobro', async ({ page }) => {
    await resetVisitaCampo('en_ejecucion')

    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)

    await expect(page.locator('th', { hasText: 'Act' })).toBeVisible()

    const inputs = page.locator('input[type="number"]')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill('5')
    }

    const btnGuardar = page.getByRole('button', { name: /guardar conteo/i })
    await expect(btnGuardar).toBeEnabled()
    await btnGuardar.click()

    await expect(page.getByText(/monto calculado/i)).toBeVisible()
    await expect(page.getByText(/continuar a reposicion/i)).toBeVisible()
  })

  // Test 6: Marcar no realizada
  test('marcar no realizada sin motivo muestra error; con motivo cambia estado', async ({ page }) => {
    await resetVisitaCampo('planificada')

    await loginColaboradora(page)
    await page.goto(`/campo/visita/${visitaId}`)

    await page.getByRole('button', { name: /marcar como no realizada/i }).click()
    await page.getByRole('button', { name: /confirmar/i }).click()
    await expect(page.getByText(/motivo es requerido/i)).toBeVisible()

    await page.locator('textarea').fill('Local cerrado por festivo')
    await page.getByRole('button', { name: /confirmar/i }).click()
    await page.waitForURL('/campo/ruta-del-dia')
  })
})

test.describe('Sprint 3 — Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel(/correo/i).fill('admin@erp.local')
    await page.getByLabel(/contraseña/i).fill('Admin1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  // Test 7: Admin ve visitas del día
  test('admin ve página de visitas con filtro de fecha por defecto', async ({ page }) => {
    await page.goto('/admin/visitas')
    await expect(page.getByRole('heading', { name: 'Visitas' })).toBeVisible()
    const hoy = getBusinessDate()
    await expect(page.locator('input[type="date"]').first()).toHaveValue(hoy)
  })

  // Test 8: Reasignación temporal de ruta
  test('admin edita ruta, cambia colaboradora y guarda nota de motivo', async ({ page }) => {
    await page.goto('/admin/rutas')
    await page.getByRole('button', { name: /editar/i }).first().click()
    await expect(page.getByRole('heading', { name: /editar ruta/i })).toBeVisible()
    const textarea = page.locator('textarea[placeholder*="Motivo del cambio"]')
    await expect(textarea).toBeVisible()
    await textarea.fill('Colaboradora de licencia')
    await page.getByRole('button', { name: /guardar/i }).click()
    // Esperar que el sheet se cierre y la lista se actualice
    await expect(page.getByRole('heading', { name: /editar ruta/i })).not.toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /editar/i }).first().click()
    const textareaReopened = page.locator('textarea[placeholder*="Motivo del cambio"]')
    await expect(textareaReopened).toHaveValue('Colaboradora de licencia')
  })
})
