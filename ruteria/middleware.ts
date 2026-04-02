import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getHomeForRole } from '@/lib/auth/getHomeForRole'
import { resolveCurrentRole } from '@/lib/auth/resolveCurrentRole'
import type { Database } from '@/lib/supabase/database.types'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient<Database>(
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const rol = await resolveCurrentRole(supabase, user, user?.app_metadata?.rol as string | undefined)
  const adminRoles = ['admin', 'supervisor', 'analista', 'compras']

  // Guard para rutas API sin autenticación: retornar 401 en lugar de redirigir
  if (!user && path.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (path === '/login' && user) {
    return NextResponse.redirect(new URL(getHomeForRole(rol), request.url))
  }

  if (!user && (path.startsWith('/admin') || path.startsWith('/campo'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    if (path.startsWith('/admin') && !adminRoles.includes(rol ?? '')) {
      return NextResponse.redirect(new URL('/campo/ruta-del-dia', request.url))
    }
    if (path.startsWith('/campo') && rol !== 'colaboradora') {
      return NextResponse.redirect(new URL(getHomeForRole(rol), request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/login', '/admin/:path*', '/campo/:path*', '/api/:path*'],
}
