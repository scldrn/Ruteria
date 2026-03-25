import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill(email)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
}

test.describe('release role routing', () => {
  test('compras entra a su home y no ve la suite analítica completa', async ({ page }) => {
    await login(page, 'compras@erp.local', 'Compras1234!')
    await page.waitForURL('/admin/compras')

    await page.goto('/')
    await page.waitForURL('/admin/compras')

    await page.goto('/admin/dashboard')
    await page.waitForURL('/admin/compras')

    await page.goto('/admin/reportes')
    await page.waitForURL('/admin/reportes')

    await expect(page.getByRole('tab', { name: /^inventario$/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /^ventas$/i })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /ranking vitrinas/i })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /^visitas$/i })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /incidencias \/ garantías/i })).toHaveCount(0)
  })

  test('analista entra al dashboard y conserva acceso a la suite completa de reportes', async ({ page }) => {
    await login(page, 'analista@erp.local', 'Analista1234!')
    await page.waitForURL('/admin/dashboard')

    await page.goto('/admin/reportes')
    await expect(page.getByRole('tab', { name: /^ventas$/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /ranking vitrinas/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /^inventario$/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /^visitas$/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /incidencias \/ garantías/i })).toBeVisible()
  })

  test('colaboradora es redirigida al campo si intenta entrar al admin', async ({ page }) => {
    await login(page, 'colaboradora@erp.local', 'Colab1234!')
    await page.waitForURL('/campo/ruta-del-dia')

    await page.goto('/admin/reportes')
    await page.waitForURL('/campo/ruta-del-dia')
  })
})
