'use client'

import { useRutaDelDia } from '@/lib/hooks/useRutaDelDia'
import { RutaDelDiaCard } from '@/components/campo/RutaDelDiaCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ConnectionStatusBar } from '@/components/campo/ConnectionStatusBar'

function formatFecha(): string {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function RutaDelDiaPage() {
  const {
    data: visitas = [],
    isLoading,
    error,
    isOfflineFallback,
    lastSyncedAt,
  } = useRutaDelDia()

  const completadas = visitas.filter((v) => v.estado === 'completada').length
  const rutaNombre = visitas[0]?.ruta?.nombre ?? 'Ruta del día'

  if (isLoading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <ConnectionStatusBar />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <ConnectionStatusBar />
        <p className="text-red-600">Error cargando la ruta: {error.message}</p>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <ConnectionStatusBar isOfflineFallback={isOfflineFallback} lastSyncedAt={lastSyncedAt} />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{rutaNombre}</h1>
          <p className="text-sm text-slate-500 capitalize">{formatFecha()}</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-slate-700">
            {completadas}/{visitas.length}
          </span>
          <p className="text-xs text-slate-400">completadas</p>
        </div>
      </div>

      {/* Lista de PDVs */}
      {visitas.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No hay visitas programadas para hoy.</p>
      ) : (
        <div className="space-y-3">
          {visitas.map((visita) => (
            <RutaDelDiaCard key={visita.id} visita={visita} />
          ))}
        </div>
      )}
    </main>
  )
}
