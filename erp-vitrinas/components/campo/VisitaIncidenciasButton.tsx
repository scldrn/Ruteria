'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VisitaIncidenciasButtonProps {
  count: number
  onClick: () => void
}

export function VisitaIncidenciasButton({ count, onClick }: VisitaIncidenciasButtonProps) {
  return (
    <Button type="button" variant="outline" className="w-full justify-between" onClick={onClick}>
      <span className="flex items-center gap-2">
        <AlertTriangle size={16} />
        Reportar incidencia
      </span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
        {count}
      </span>
    </Button>
  )
}
