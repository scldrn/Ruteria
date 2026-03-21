import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set(name, '', options)
        },
      },
    }
  )

  // getUser() valida el JWT en el servidor (seguro).
  // getSession() confía en la cookie sin validar — no usar en middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const rol = user?.app_metadata?.rol as string | undefined
  const adminRoles = ['admin', 'supervisor', 'analista', 'compras']

  // Usuario autenticado visitando /login → redirigir a su área
  if (path === '/login' && user) {
    const dest =
      rol === 'colaboradora' ? '/campo/ruta-del-dia' : '/admin/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Rutas privadas sin sesión → /login
  if (!user && (path.startsWith('/admin') || path.startsWith('/campo'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Acceso a área incorrecta según rol
  if (user) {
    if (path.startsWith('/admin') && !adminRoles.includes(rol ?? '')) {
      return NextResponse.redirect(new URL('/campo/ruta-del-dia', request.url))
    }
    if (path.startsWith('/campo') && rol !== 'colaboradora') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/login', '/admin/:path*', '/campo/:path*'],
}
