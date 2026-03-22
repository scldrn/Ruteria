'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { VisitaDetalle } from '@/lib/hooks/useVisita'
import type { UseMutationResult } from '@tanstack/react-query'

interface Props {
  visita: VisitaDetalle
  iniciarVisita: UseMutationResult<void, Error, void>
  marcarNoRealizada: UseMutationResult<void, Error, string>
}

export function VisitaInicioView({ visita, iniciarVisita, marcarNoRealizada }: Props) {
  const [showMotivo, setShowMotivo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [motivoError, setMotivoError] = useState('')

  function handleIniciar() {
    iniciarVisita.mutate(undefined, {
      onError: (err) => toast.error(err.message),
    })
  }

  function handleNoRealizada() {
    if (!motivo.trim()) {
      setMotivoError('El motivo es requerido')
      return
    }
    setMotivoError('')
    marcarNoRealizada.mutate(motivo.trim(), {
      onSuccess: () => toast.success('Visita marcada como no realizada'),
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4">
      {/* Info vitrina */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Vitrina</p>
        <p className="font-semibold text-slate-900">{visita.vitrinaCodigo}</p>
      </div>

      {/* Inventario anterior */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Inventario anterior</p>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {visita.items.map((item) => (
              <tr key={item.productoId}>
                <td className="px-4 py-2 text-slate-700">{item.nombre}</td>
                <td className="px-4 py-2 text-right font-semibold text-slate-900">
                  {item.invAnterior} u.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Acciones */}
      <Button
        className="w-full"
        onClick={handleIniciar}
        disabled={iniciarVisita.isPending}
      >
        {iniciarVisita.isPending ? 'Iniciando…' : 'Iniciar visita'}
      </Button>

      {!showMotivo ? (
        <Button
          variant="ghost"
          className="w-full text-slate-500"
          onClick={() => setShowMotivo(true)}
        >
          Marcar como no realizada
        </Button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={motivo}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setMotivo(e.target.value); setMotivoError('') }}
            placeholder="Motivo por el que no se realizó la visita…"
            rows={3}
          />
          {motivoError && <p className="text-xs text-red-600">{motivoError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowMotivo(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleNoRealizada}
              disabled={marcarNoRealizada.isPending}
            >
              {marcarNoRealizada.isPending ? 'Guardando…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
