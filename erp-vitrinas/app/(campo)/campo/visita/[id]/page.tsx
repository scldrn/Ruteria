'use client'

import { use } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useVisita } from '@/lib/hooks/useVisita'
import { VisitaInicioView } from '@/components/campo/VisitaInicioView'
import { VisitaConteoView } from '@/components/campo/VisitaConteoView'

interface Props {
  params: Promise<{ id: string }>
}

export default function VisitaPage({ params }: Props) {
  const { id } = use(params)  // Next.js 15+: params es una Promise
  const { data: visita, isLoading, error, iniciarVisita, guardarConteo, marcarNoRealizada } = useVisita(id)

  if (isLoading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-md" />
      </main>
    )
  }

  if (error || !visita) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <p className="text-red-600">Error: {error?.message ?? 'Visita no encontrada'}</p>
        <Link href="/campo/ruta-del-dia" className="text-blue-600 underline text-sm">
          ← Volver a la ruta
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/campo/ruta-del-dia" className="text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bold text-slate-900">{visita.pdvNombre}</h1>
          <p className="text-xs text-slate-500">Vitrina {visita.vitrinaCodigo}</p>
        </div>
      </div>

      {/* Vista según estado */}
      {visita.estado === 'planificada' && (
        <VisitaInicioView
          visita={visita}
          iniciarVisita={iniciarVisita}
          marcarNoRealizada={marcarNoRealizada}
        />
      )}

      {visita.estado === 'en_ejecucion' && (
        <VisitaConteoView visita={visita} guardarConteo={guardarConteo} />
      )}

      {(visita.estado === 'completada' || visita.estado === 'no_realizada') && (
        <div className="text-center py-8 text-slate-500">
          <p>Esta visita ya está {visita.estado === 'completada' ? 'completada' : 'marcada como no realizada'}.</p>
          <Link href="/campo/ruta-del-dia" className="text-blue-600 underline text-sm mt-2 block">
            ← Volver a la ruta
          </Link>
        </div>
      )}
    </main>
  )
}
