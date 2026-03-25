'use client'

import { Button } from '@/components/ui/button'
import type { CobroDraft } from '@/components/campo/VisitaCobroView'
import type { ReposicionDraft } from '@/components/campo/VisitaReposicionView'
import type { FotoDraft } from '@/components/campo/VisitaFotosView'

interface Props {
  cobro: CobroDraft
  formaPagoNombre: string
  reposiciones: ReposicionDraft[]
  fotos: FotoDraft[]
  isPending: boolean
  onConfirmar: () => void
}

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function VisitaConfirmarView({
  cobro,
  formaPagoNombre,
  reposiciones,
  fotos,
  isPending,
  onConfirmar,
}: Props) {
  const reposicionesConCantidad = reposiciones.filter((item) => item.unidades_repuestas > 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Cobro</p>
        <p className="text-lg font-semibold text-slate-900">{formatCOP(cobro.monto)}</p>
        <p className="text-sm text-slate-500">{formaPagoNombre}</p>
        {cobro.notas && <p className="text-sm text-amber-700">{cobro.notas}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">Reposicion</p>
          <span className="text-xs text-slate-500">{reposicionesConCantidad.length} producto(s)</span>
        </div>

        {reposicionesConCantidad.length === 0 ? (
          <p className="text-sm text-slate-500">No se registraron unidades repuestas.</p>
        ) : (
          <ul className="space-y-2">
            {reposicionesConCantidad.map((item) => (
              <li key={item.producto_id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{item.nombre}</span>
                <span className="font-medium text-slate-900">{item.unidades_repuestas} u.</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-2">
        <p className="text-sm font-medium text-slate-800">Fotos</p>
        <p className="text-sm text-slate-500">{fotos.length} foto(s) cargadas</p>
        <p className="text-xs text-slate-400">La visita solo se completa si queda al menos una foto final registrada.</p>
      </div>

      <Button className="w-full" onClick={onConfirmar} disabled={isPending}>
        {isPending ? 'Cerrando visita...' : 'Cerrar visita'}
      </Button>
    </div>
  )
}
