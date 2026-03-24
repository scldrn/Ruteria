'use client'

import { useOfflineSync } from '@/lib/hooks/useOfflineSync'

interface ConnectionStatusBarProps {
  isOfflineFallback?: boolean
  lastSyncedAt?: string | null
}

function formatSyncTime(value: string | null | undefined): string | null {
  if (!value) return null

  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ConnectionStatusBar({
  isOfflineFallback = false,
  lastSyncedAt = null,
}: ConnectionStatusBarProps) {
  const { isOnline, isOfflineCapable, isSyncing, pendingCount, errorCount } = useOfflineSync()
  const formattedSyncTime = formatSyncTime(lastSyncedAt)
  const isCheckingConnection = isOnline === null
  const hasPendingSync = pendingCount > 0
  const hasSyncErrors = errorCount > 0

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${
        isCheckingConnection
          ? 'border-slate-200 bg-slate-50 text-slate-700'
          : hasSyncErrors
          ? 'border-red-200 bg-red-50 text-red-800'
          : isSyncing
          ? 'border-sky-200 bg-sky-50 text-sky-800'
          : hasPendingSync
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : isOnline
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">
          {isCheckingConnection
            ? 'Verificando conexion'
            : hasSyncErrors
            ? 'Error al sincronizar'
            : isSyncing
            ? 'Sincronizando...'
            : hasPendingSync
            ? 'Pendiente por sincronizar'
            : isOnline
            ? 'En linea'
            : 'Sin conexion'}
        </span>
        {isOfflineCapable && <span className="text-[11px] opacity-80">Modo offline disponible</span>}
      </div>
      {hasPendingSync && (
        <p className="mt-1">
          {pendingCount} cambio(s) pendiente(s) de sincronizar
          {hasSyncErrors ? ' · revisa la conexion para reintentar' : ''}
        </p>
      )}
      {isOfflineFallback && (
        <p className="mt-1">
          Mostrando datos guardados en este dispositivo
          {formattedSyncTime ? ` · ultima sincronizacion ${formattedSyncTime}` : ''}
        </p>
      )}
      {!isCheckingConnection && !isOnline && !isOfflineFallback && (
        <p className="mt-1">Esta pantalla solo mostrara datos ya descargados previamente.</p>
      )}
    </div>
  )
}
