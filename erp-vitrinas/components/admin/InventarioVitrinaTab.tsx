'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useInventarioVitrina } from '@/lib/hooks/useInventarioVitrina'
import type { InventarioVitrinaRow } from '@/lib/hooks/useInventarioVitrina'

interface InventarioVitrinaTabProps {
  vitrinaId: string
}

// Mapa de estado → variante de badge y etiqueta visual
const ESTADO_CONFIG: Record<
  InventarioVitrinaRow['estado'],
  { label: string; className: string }
> = {
  ok: { label: 'OK', className: 'bg-green-100 text-green-800 border-green-200' },
  bajo: { label: 'Bajo', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  vacio: { label: 'Vacío', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function InventarioVitrinaTab({ vitrinaId }: InventarioVitrinaTabProps) {
  const { data: rows = [], isLoading } = useInventarioVitrina(vitrinaId)

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                Objetivo
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                Stock actual
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                Diferencia
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No hay productos en el surtido estándar de esta vitrina
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const estadoCfg = ESTADO_CONFIG[row.estado]
                return (
                  <tr key={row.producto_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-medium">{row.nombre}</span>
                      <span className="ml-2 text-xs text-slate-400">{row.codigo}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {row.cantidad_objetivo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 font-medium">
                      {row.cantidad_actual}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {/* Diferencia negativa = exceso de stock, positiva = faltante */}
                      <span
                        className={
                          row.diferencia > 0
                            ? 'text-orange-600'
                            : row.diferencia < 0
                            ? 'text-blue-600'
                            : 'text-slate-500'
                        }
                      >
                        {row.diferencia > 0 ? `+${row.diferencia}` : row.diferencia}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estadoCfg.className}`}
                      >
                        {estadoCfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
