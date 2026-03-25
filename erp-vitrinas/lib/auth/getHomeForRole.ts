import type { UserRol } from '@/lib/validations/usuarios'

export function getHomeForRole(rol: UserRol | string | undefined) {
  if (rol === 'colaboradora') return '/campo/ruta-del-dia'
  if (rol === 'compras') return '/admin/compras'
  return '/admin/dashboard'
}
