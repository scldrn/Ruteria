'use client'

import type { ItemConteo } from '@/lib/hooks/useVisita'

function formatMonto(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  items: ItemConteo[]
  onChange: (productoId: string, invActual: number | null) => void
}

export function ConteoTable({ items, onChange }: Props) {
  const total = items.reduce((acc, item) => acc + item.subtotal, 0)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-left px-3 py-2">Producto</th>
              <th className="text-center px-2 py-2 w-12">Ant</th>
              <th className="text-center px-2 py-2 w-16">Act</th>
              <th className="text-right px-3 py-2 w-24">Ventas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.productoId} className="align-middle">
                <td className="px-3 py-2 text-slate-800 font-medium">{item.nombre}</td>
                <td className="px-2 py-2 text-center text-slate-400">{item.invAnterior}</td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="number"
                    min={0}
                    value={item.invActual ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      onChange(item.productoId, val === '' ? null : Math.max(0, parseInt(val, 10)))
                    }}
                    className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="—"
                    aria-label={`Inventario actual de ${item.nombre}`}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {item.invActual !== null ? (
                    <span className={item.unidadesVendidas > 0 ? 'text-green-700 font-semibold' : 'text-slate-400'}>
                      {item.unidadesVendidas > 0 ? formatMonto(item.subtotal) : '—'}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
        <span className="text-sm text-slate-600 font-medium">Total a cobrar</span>
        <span className="text-lg font-bold text-green-700">{formatMonto(total)}</span>
      </div>
    </div>
  )
}
