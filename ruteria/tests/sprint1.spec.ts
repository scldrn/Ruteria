import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@erp.local'
const ADMIN_PASSWORD = 'Admin1234!'

// Helper: login como admin
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill(ADMIN_EMAIL)
  await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('**/admin/dashboard')
}

// ── LOGIN ──────────────────────────────────────────────────────────────────

test('login: página carga correctamente', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
})

test('login: credenciales inválidas muestran error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill('noexiste@erp.local')
  await page.getByLabel(/contraseña/i).fill('wrongpassword')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  // Debe mostrar algún mensaje de error (toast o inline)
  await expect(page.getByText(/inválid|credencial|incorrecto|error/i).first()).toBeVisible({ timeout: 5000 })
})

test('login: admin entra y llega al dashboard', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/admin\/dashboard/)
})

test('login: ruta protegida redirige a /login si no hay sesión', async ({ page }) => {
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

// ── SIDEBAR ────────────────────────────────────────────────────────────────

test('sidebar: aparece y tiene enlaces principales', async ({ page }) => {
  await loginAsAdmin(page)
  // El sidebar existe
  await expect(page.getByRole('navigation')).toBeVisible()
})

// ── PRODUCTOS ──────────────────────────────────────────────────────────────

test('productos: listado carga sin error', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/productos')
  // Espera a que desaparezca el skeleton o aparezca la tabla/empty state
  await expect(page.getByRole('table').or(page.getByText(/no hay registros/i))).toBeVisible({ timeout: 8000 })
})

test('productos: crear y ver producto nuevo', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/productos')

  // Abrir sheet
  await page.getByRole('button', { name: /nuevo producto/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Llenar formulario (usar name= porque los labels no tienen htmlFor)
  const codigo = `TEST-${Date.now()}`
  await page.locator('input[name="codigo"]').fill(codigo)
  await page.locator('input[name="nombre"]').fill('Producto de prueba')
  // Seleccionar la primera categoría disponible (excluye el placeholder)
  await page.locator('select[name="categoria_id"]').selectOption({ index: 1 })
  await page.locator('input[name="costo_compra"]').fill('10000')
  await page.locator('input[name="precio_venta_comercio"]').fill('15000')

  // Guardar
  await page.getByRole('button', { name: /guardar/i }).click()

  // Toast de éxito
  await expect(page.getByText(/guardado/i)).toBeVisible({ timeout: 5000 })

  // Aparece en la tabla
  await expect(page.getByText(codigo)).toBeVisible()
})

test('productos: búsqueda filtra resultados', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/productos')

  const search = page.getByPlaceholder(/buscar/i)
  await search.fill('xxxxxnoexiste')
  await expect(page.getByText(/no hay registros/i)).toBeVisible({ timeout: 5000 })
})

// ── CATEGORÍAS ─────────────────────────────────────────────────────────────

test('categorias: crear categoría', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/categorias')

  await page.getByRole('button', { name: /nueva categoría/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('input[name="nombre"]').fill(`Cat-${Date.now()}`)
  await page.getByRole('button', { name: /guardar/i }).click()

  await expect(page.getByText(/guardad/i)).toBeVisible({ timeout: 5000 })
})

// ── PUNTOS DE VENTA ────────────────────────────────────────────────────────

test('puntos de venta: listado carga', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/puntos-de-venta')
  await expect(page.getByRole('table').or(page.getByText(/no hay registros/i))).toBeVisible({ timeout: 8000 })
})

test('puntos de venta: crear PDV', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/puntos-de-venta')

  await page.getByRole('button', { name: /nuevo/i }).click()

  const codigo = `PDV-${Date.now()}`
  await page.locator('input[name="codigo"]').fill(codigo)
  await page.locator('input[name="nombre_comercial"]').fill('Tienda de prueba')

  await page.getByRole('button', { name: /guardar/i }).click()
  await expect(page.getByText(/guardado/i)).toBeVisible({ timeout: 5000 })
  await expect(page.getByText(codigo)).toBeVisible()
})

// ── USUARIOS ───────────────────────────────────────────────────────────────

test('usuarios: accesible para admin', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/usuarios')
  await expect(page.getByRole('table').or(page.getByText(/no hay registros/i))).toBeVisible({ timeout: 8000 })
})

test('usuarios: colaboradora no puede entrar al módulo admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill('colaboradora@erp.local')
  await page.getByLabel(/contraseña/i).fill('Colab1234!')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('**/campo/ruta-del-dia')

  await page.goto('/admin/usuarios')
  await page.waitForURL('**/campo/ruta-del-dia')
  await expect(page).toHaveURL(/campo\/ruta-del-dia/)
})

// ── LOGOUT ─────────────────────────────────────────────────────────────────

test('logout: cierra sesión y redirige a login', async ({ page }) => {
  await loginAsAdmin(page)
  // Enviar el form de logout directamente (evita el nextjs-portal overlay en dev)
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('form[action]')
    if (form) form.requestSubmit()
  })
  await page.waitForURL(/\/login/, { timeout: 8000 })
})
