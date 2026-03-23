import { test, expect } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve('/Users/sam/Proyects/PowerApp/erp-vitrinas', '.env.local') })

test.use({ viewport: { width: 390, height: 844 } })

test.describe('Mobile — campo viewport (iPhone 14)', () => {
  test('login page renders mobile', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await expect(page.getByLabel(/correo/i)).toBeVisible()
    await expect(page.getByLabel(/contraseña/i)).toBeVisible()
    const box = await page.getByRole('button', { name: /iniciar sesión/i }).boundingBox()
    expect(box!.width).toBeGreaterThan(200)
  })

  test('ruta del día es usable en móvil tras login', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.getByLabel(/correo/i).fill('colaboradora@erp.local')
    await page.getByLabel(/contraseña/i).fill('Colab1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ruta-del-dia')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const vw = page.viewportSize()!.width
    const pageBox = await page.locator('main, [role="main"], body > div').first().boundingBox()
    if (pageBox) expect(pageBox.width).toBeLessThanOrEqual(vw + 5)
  })

  test('no hay overflow horizontal en ruta del día', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.getByLabel(/correo/i).fill('colaboradora@erp.local')
    await page.getByLabel(/contraseña/i).fill('Colab1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ruta-del-dia')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5)
  })
})
