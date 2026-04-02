'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getHomeForRole } from '@/lib/auth/getHomeForRole'
import { resolveCurrentRole } from '@/lib/auth/resolveCurrentRole'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('Correo o contraseña incorrectos')
        return
      }

      const rol = await resolveCurrentRole(
        supabase,
        data.user,
        data.user.app_metadata?.rol as string | undefined
      )
      if (!rol) {
        setError('Tu usuario no tiene un rol configurado. Contacta al administrador.')
        await supabase.auth.signOut()
        return
      }

      router.push(getHomeForRole(rol))
    } catch {
      setError('No se pudo iniciar sesión. Verifica tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--gray-100)' }}
    >
      {/* Card — mismo patrón que el resto del admin */}
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-8"
        style={{ border: '1px solid var(--gray-200)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--blue-600)' }}
          >
            <span
              className="text-white text-[13px] font-black"
              style={{ fontFamily: 'var(--font-jakarta, var(--font-geist-sans))' }}
            >
              R
            </span>
          </div>
          <div>
            <p
              className="text-[14px] font-bold leading-none tracking-[0.08em]"
              style={{
                color: 'var(--gray-900)',
                fontFamily: 'var(--font-jakarta, var(--font-geist-sans))',
              }}
            >
              RUTERIA
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--gray-600)' }}>
              Field Service Management
            </p>
          </div>
        </div>

        {/* Encabezado */}
        <div className="mb-6">
          <h1
            className="text-[22px] font-bold"
            style={{
              color: 'var(--gray-900)',
              fontFamily: 'var(--font-jakarta, var(--font-geist-sans))',
              letterSpacing: '-0.02em',
            }}
          >
            Iniciar sesión
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--gray-600)' }}>
            Ingresa tus credenciales para continuar.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-semibold mb-1.5"
              style={{ color: 'var(--gray-900)' }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
              className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-all"
              style={{
                background: 'var(--gray-100)',
                border: '1.5px solid var(--gray-200)',
                color: 'var(--gray-900)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.borderColor = 'var(--blue-600)'
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--blue-100)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'var(--gray-100)'
                e.currentTarget.style.borderColor = 'var(--gray-200)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-semibold mb-1.5"
              style={{ color: 'var(--gray-900)' }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-all"
              style={{
                background: 'var(--gray-100)',
                border: '1.5px solid var(--gray-200)',
                color: 'var(--gray-900)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.borderColor = 'var(--blue-600)'
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--blue-100)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'var(--gray-100)'
                e.currentTarget.style.borderColor = 'var(--gray-200)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="text-[13px] rounded-xl px-4 py-2.5"
              style={{
                color: 'oklch(0.495 0.240 27)',
                background: 'oklch(0.577 0.245 27 / 8%)',
                border: '1px solid oklch(0.577 0.245 27 / 18%)',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-[14px] font-bold text-white transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed"
            style={{
              background: loading ? 'var(--blue-500)' : 'var(--blue-600)',
              fontFamily: 'var(--font-jakarta, var(--font-geist-sans))',
              marginTop: '4px',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--blue-700)'
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--blue-600)'
            }}
          >
            {loading ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </main>
  )
}
