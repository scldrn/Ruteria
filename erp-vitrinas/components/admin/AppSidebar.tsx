'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Store,
  Users,
  LogOut,
  Monitor,
  Warehouse,
  Map,
  ClipboardList,
  Settings2,
  AlertTriangle,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { logoutAction } from '@/app/actions/auth'
import type { UserRol } from '@/lib/validations/usuarios'

interface NavItem {
  href: string
  icon: ElementType
  label: string
  roles?: UserRol[]
}

interface NavSection {
  id: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'core',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/productos', icon: Package, label: 'Productos' },
      { href: '/admin/puntos-de-venta', icon: Store, label: 'Puntos de Venta' },
      { href: '/admin/vitrinas', icon: Monitor, label: 'Vitrinas' },
      { href: '/admin/inventario', icon: Warehouse, label: 'Inventario' },
      { href: '/admin/rutas', icon: Map, label: 'Rutas' },
      { href: '/admin/visitas', icon: ClipboardList, label: 'Visitas' },
      { href: '/admin/incidencias', icon: AlertTriangle, label: 'Incidencias', roles: ['admin', 'supervisor', 'analista'] },
      { href: '/admin/usuarios', icon: Users, label: 'Usuarios', roles: ['admin'] },
    ],
  },
  {
    id: 'config',
    items: [
      { href: '/admin/formas-pago', icon: Settings2, label: 'Formas de pago', roles: ['admin'] },
    ],
  },
]

interface AppSidebarProps {
  rol: UserRol
}

export function AppSidebar({ rol }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-14 min-h-screen bg-[#1e293b] py-4 shrink-0">
      <nav className="flex flex-col items-center gap-3 flex-1">
        {NAV_SECTIONS.map((section, sectionIndex) => {
          const items = section.items.filter((item) => !item.roles || item.roles.includes(rol))

          if (items.length === 0) return null

          return (
            <div key={section.id} className="flex flex-col items-center gap-2 w-full">
              {sectionIndex > 0 && <div className="w-8 h-px bg-slate-700" aria-hidden />}

              {items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        aria-label={item.label}
                        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-[#6366f1] text-white'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                        }`}
                      >
                        <Icon size={18} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="flex flex-col items-center pb-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </form>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Cerrar sesión
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
