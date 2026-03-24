'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { VisitaDelDia } from '@/lib/hooks/useRutaDelDia'

const estadoConfig: Record<
  VisitaDelDia['estado'],
  { label: string; className: string }
> = {
  planificada: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  en_ejecucion: { label: 'En ejecución', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completada: { label: 'Completada', className: 'bg-green-100 text-green-700 border-green-200' },
  no_realizada: { label: 'No realizada', className: 'bg-red-100 text-red-600 border-red-200' },
}

interface Props {
  visita: VisitaDelDia
}

function formatHora(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monto)
}

export function RutaDelDiaCard({ visita }: Props) {
  const cfg = estadoConfig[visita.estado]

  return (
    <div
      className={`rounded-xl border p-4 ${
        visita.estado === 'en_ejecucion'
          ? 'border-blue-400 bg-blue-50'
          : visita.estado === 'completada'
          ? 'border-green-300 bg-green-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-400">#{visita.orden_visita}</span>
            <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
            {visita.syncStatus === 'pending' && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                Pendiente sync
              </Badge>
            )}
            {visita.syncStatus === 'error' && (
              <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                Error sync
              </Badge>
            )}
          </div>
          <p className="font-semibold text-slate-900 truncate">{visita.pdv.nombre_comercial}</p>
          {visita.pdv.direccion && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{visita.pdv.direccion}</p>
          )}

          {/* Completada: muestra hora y monto */}
          {visita.estado === 'completada' && (
            <p className="text-xs text-green-700 mt-1">
              {formatHora(visita.fecha_hora_fin)} · {formatMonto(visita.monto_calculado)}
            </p>
          )}

          {/* No realizada: muestra motivo */}
          {visita.estado === 'no_realizada' && visita.motivo_no_realizada && (
            <p className="text-xs text-red-600 mt-1 truncate">{visita.motivo_no_realizada}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="shrink-0">
          {visita.estado === 'planificada' && (
            <Link href={`/campo/visita/${visita.id}`}>
              <Button size="sm" variant="outline">Iniciar →</Button>
            </Link>
          )}
          {visita.estado === 'en_ejecucion' && (
            <Link href={`/campo/visita/${visita.id}`}>
              <Button size="sm">Continuar →</Button>
            </Link>
          )}
        </div>
      </div>

      {/* En ejecución: muestra hora de inicio */}
      {visita.estado === 'en_ejecucion' && visita.fecha_hora_inicio && (
        <p className="text-xs text-blue-600 mt-2">Iniciada a las {formatHora(visita.fecha_hora_inicio)}</p>
      )}
    </div>
  )
}
