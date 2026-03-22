'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ConteoTable } from '@/components/campo/ConteoTable'
import type { VisitaDetalle, ItemConteo } from '@/lib/hooks/useVisita'
import type { UseMutationResult } from '@tanstack/react-query'

function recalc(item: ItemConteo, invActual: number | null): ItemConteo {
  const vendidas = invActual !== null ? Math.max(item.invAnterior - invActual, 0) : 0
  return { ...item, invActual, unidadesVendidas: vendidas, subtotal: vendidas * item.precioUnitario }
}

interface Props {
  visita: VisitaDetalle
  guardarConteo: UseMutationResult<void, Error, ItemConteo[]>
}

export function VisitaConteoView({ visita, guardarConteo }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ItemConteo[]>(visita.items)

  function handleChange(productoId: string, invActual: number | null) {
    setItems((prev) =>
      prev.map((item) => item.productoId === productoId ? recalc(item, invActual) : item)
    )
  }

  const todosIngresados = useMemo(
    () => items.every((item) => item.invActual !== null),
    [items]
  )

  function handleGuardar() {
    if (!todosIngresados) {
      toast.error('Ingresa el inventario actual de todos los productos antes de guardar')
      return
    }
    guardarConteo.mutate(items, {
      onSuccess: () => {
        toast.success('Conteo guardado correctamente')
        router.push('/campo/ruta-del-dia')
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4">
      <ConteoTable items={items} onChange={handleChange} />
      <Button
        className="w-full"
        onClick={handleGuardar}
        disabled={guardarConteo.isPending || !todosIngresados}
      >
        {guardarConteo.isPending ? 'Guardando…' : 'Guardar conteo'}
      </Button>
    </div>
  )
}
