'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type QueryErrorStateProps = {
  title?: string
  message: string
  onRetry?: () => void
}

export function QueryErrorState({
  title = 'No se pudo cargar esta sección',
  message,
  onRetry,
}: QueryErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-white/80 p-2 text-red-600">
          <AlertTriangle size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-red-800">{message}</p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
