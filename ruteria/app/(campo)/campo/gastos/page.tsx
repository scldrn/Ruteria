'use client'

import { useState } from 'react'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { useGastos } from '@/lib/hooks/useGastos'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConnectionStatusBar } from '@/components/campo/ConnectionStatusBar'
import { toast } from 'sonner'

export default function GastosPage() {
  const { data: gastos = [], isLoading, error, agregarGasto } = useGastos()

  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('Combustible')
  const [notas, setNotas] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const CONCEPTOS = ['Combustible', 'Pasajes', 'Peaje', 'Parqueadero', 'Alimentación', 'Otro']

  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0)

  async function handleAddGasto(e: React.FormEvent) {
    e.preventDefault()
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    try {
      await agregarGasto.mutateAsync({
        concepto,
        monto: Number(monto),
        notas: notas.trim() || undefined,
      })
      toast.success('Gasto registrado')
      setMonto('')
      setNotas('')
      setIsAdding(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar el gasto')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto bg-gray-50 min-h-screen">
        <ConnectionStatusBar />
        <div className="px-5 py-5 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-5 py-5 space-y-4">
        <ConnectionStatusBar />
        <p className="text-red-500 text-sm">Error cargando gastos: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-5 pt-5 pb-5 shrink-0">
        <ConnectionStatusBar />

        <div className="mt-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Receipt size={13} className="text-blue-600" />
              <span className="text-[12px] font-semibold text-blue-600">
                Operativos
              </span>
            </div>
            <h1 className="text-[22px] font-bold leading-tight text-gray-900 tracking-tight">
              Gastos del Día
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-bold leading-none text-gray-900">
              ${totalGastos.toLocaleString('es-CO')}
            </p>
            <p className="text-[11px] mt-1 text-gray-500">
              total registrado
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {!isAdding ? (
          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" /> Registrar Nuevo Gasto
          </Button>
        ) : (
          <form className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3" onSubmit={handleAddGasto}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Nuevo Gasto</h3>

            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1">Monto ($)</label>
              <input
                type="number"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. 15000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1">Concepto</label>
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              >
                {CONCEPTOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1">Notas (opcional)</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. Peaje Salida Norte"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={agregarGasto.isPending}>
                {agregarGasto.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Historial de Hoy</h3>

          {gastos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No has registrado gastos hoy.</p>
            </div>
          ) : (
            gastos.map((gasto) => (
              <div key={gasto.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{gasto.concepto}</p>
                  {gasto.notas && <p className="text-[11px] text-gray-500 mt-0.5">{gasto.notas}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-gray-900">
                    ${Number(gasto.monto).toLocaleString('es-CO')}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(gasto.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
