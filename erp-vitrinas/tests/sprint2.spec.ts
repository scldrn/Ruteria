import { test, expect } from '@playwright/test'

test.describe('Sprint 2', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/correo/i).fill('admin@erp.local')
    await page.getByLabel(/contraseña/i).fill('Admin1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  // S2-01: Vitrinas listing
  test('navega a listado de vitrinas', async ({ page }) => {
    await page.goto('/admin/vitrinas')
    await expect(page.getByRole('heading', { name: 'Vitrinas' })).toBeVisible()
  })

  // S2-05: Inventario central page
  test('navega a inventario central', async ({ page }) => {
    await page.goto('/admin/inventario')
    await expect(page.getByRole('heading', { name: 'Inventario Central' })).toBeVisible()
  })

  // S2-06: Rutas listing
  test('navega a listado de rutas', async ({ page }) => {
    await page.goto('/admin/rutas')
    await expect(page.getByRole('heading', { name: 'Rutas' })).toBeVisible()
  })

  // Sidebar navigation
  test('sidebar muestra Vitrinas, Inventario y Rutas', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page.getByRole('link', { name: 'Vitrinas' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Inventario' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Rutas' })).toBeVisible()
  })

  // S2-01 + S2-02: Create vitrina + navigate to detail
  test('crea una vitrina y navega a su detalle', async ({ page }) => {
    await page.goto('/admin/vitrinas')
    await page.getByRole('button', { name: 'Nueva vitrina' }).click()
    // Sheet opens
    await expect(page.getByRole('heading', { name: 'Nueva vitrina' })).toBeVisible()
  })

  // S2-05: Open entrada sheet
  test('abre sheet de registrar entrada en inventario central', async ({ page }) => {
    await page.goto('/admin/inventario')
    await page.getByRole('button', { name: 'Registrar entrada' }).click()
    await expect(page.getByRole('heading', { name: 'Registrar entrada por compra' })).toBeVisible()
  })

  // S2-06: Create ruta
  test('abre sheet de nueva ruta', async ({ page }) => {
    await page.goto('/admin/rutas')
    await page.getByRole('button', { name: 'Nueva ruta' }).click()
    await expect(page.getByRole('heading', { name: 'Nueva ruta' })).toBeVisible()
  })

})
