'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useVisita, type VisitaDetalle } from '@/lib/hooks/useVisita'
import { useFormasPago } from '@/lib/hooks/useFormasPago'
import { useIncidencias } from '@/lib/hooks/useIncidencias'
import { VisitaInicioView } from '@/components/campo/VisitaInicioView'
import { VisitaConteoView } from '@/components/campo/VisitaConteoView'
import { VisitaCobroView, type CobroDraft } from '@/components/campo/VisitaCobroView'
import { VisitaReposicionView, type ReposicionDraft } from '@/components/campo/VisitaReposicionView'
import { VisitaFotosView, type FotoDraft } from '@/components/campo/VisitaFotosView'
import { VisitaConfirmarView } from '@/components/campo/VisitaConfirmarView'
import { VisitaIncidenciasButton } from '@/components/campo/VisitaIncidenciasButton'
import { IncidenciaSheet } from '@/components/campo/IncidenciaSheet'

type EtapaVisita = 'conteo' | 'cobro' | 'reposicion' | 'fotos' | 'confirmar_cierre'

const ETAPAS_POST_CONTEO: EtapaVisita[] = ['cobro', 'reposicion', 'fotos', 'confirmar_cierre']

interface Props {
  params: Promise<{ id: string }>
}

export default function VisitaPage({ params }: Props) {
  const { id } = use(params)  // Next.js 15+: params es una Promise
  const router = useRouter()
  const {
    data: visita,
    isLoading,
    error,
    iniciarVisita,
    guardarConteo,
    marcarNoRealizada,
    subirFoto,
    eliminarFoto,
    cerrarVisita,
  } = useVisita(id)

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
      {visita.estado === 'planificada' && (
        <>
          <Header
            pdvNombre={visita.pdvNombre}
            vitrinaCodigo={visita.vitrinaCodigo}
            onBack={() => router.push('/campo/ruta-del-dia')}
          />
          <VisitaInicioView visita={visita} iniciarVisita={iniciarVisita} marcarNoRealizada={marcarNoRealizada} />
        </>
      )}

      {visita.estado === 'en_ejecucion' && (
        <VisitaEnEjecucionFlow
          key={visita.id}
          visita={visita}
          guardarConteo={guardarConteo}
          subirFoto={subirFoto}
          eliminarFoto={eliminarFoto}
          cerrarVisita={cerrarVisita}
        />
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

function Header({
  pdvNombre,
  vitrinaCodigo,
  onBack,
}: {
  pdvNombre: string
  vitrinaCodigo: string
  onBack: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-700" aria-label="Volver">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div>
        <h1 className="font-bold text-slate-900">{pdvNombre}</h1>
        <p className="text-xs text-slate-500">Vitrina {vitrinaCodigo}</p>
      </div>
    </div>
  )
}

function VisitaEnEjecucionFlow({
  visita,
  guardarConteo,
  subirFoto,
  eliminarFoto,
  cerrarVisita,
}: {
  visita: VisitaDetalle
  guardarConteo: ReturnType<typeof useVisita>['guardarConteo']
  subirFoto: ReturnType<typeof useVisita>['subirFoto']
  eliminarFoto: ReturnType<typeof useVisita>['eliminarFoto']
  cerrarVisita: ReturnType<typeof useVisita>['cerrarVisita']
}) {
  const router = useRouter()
  const { data: formasPago = [] } = useFormasPago({ soloActivas: true })
  const { data: incidencias = [] } = useIncidencias({ visitaId: visita.id })
  const conteoGuardado = visita.items.some((item) => item.invActual !== null)

  const [etapa, setEtapa] = useState<EtapaVisita>(conteoGuardado ? 'cobro' : 'conteo')
  const [cobro, setCobro] = useState<CobroDraft | null>(null)
  const [reposiciones, setReposiciones] = useState<ReposicionDraft[] | null>(null)
  const [fotos, setFotos] = useState<FotoDraft[]>([])
  const [incidenciaSheetOpen, setIncidenciaSheetOpen] = useState(false)

  const pasoActual = ETAPAS_POST_CONTEO.indexOf(etapa) + 1
  const formaPagoNombre = useMemo(
    () => formasPago.find((item) => item.id === cobro?.forma_pago_id)?.nombre ?? '—',
    [formasPago, cobro]
  )

  function handleBack() {
    if (etapa === 'conteo') {
      router.push('/campo/ruta-del-dia')
      return
    }

    const currentIndex = ETAPAS_POST_CONTEO.indexOf(etapa)
    if (currentIndex <= 0) {
      setEtapa('conteo')
      return
    }

    setEtapa(ETAPAS_POST_CONTEO[currentIndex - 1])
  }

  async function handleCerrarVisita() {
    if (!cobro) {
      toast.error('Falta registrar el cobro')
      return
    }

    try {
      await cerrarVisita.mutateAsync({
        cobro,
        reposiciones: (reposiciones ?? []).map((item) => ({
          producto_id: item.producto_id,
          unidades_repuestas: item.unidades_repuestas,
        })),
      })
      toast.success('Visita completada')
      router.push('/campo/ruta-del-dia')
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'No se pudo cerrar la visita')
    }
  }

  return (
    <div className="space-y-4">
      <Header pdvNombre={visita.pdvNombre} vitrinaCodigo={visita.vitrinaCodigo} onBack={handleBack} />
      <VisitaIncidenciasButton count={incidencias.length} onClick={() => setIncidenciaSheetOpen(true)} />

      {etapa !== 'conteo' && (
        <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-300">Cierre de visita</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-100">
              Paso {pasoActual} de 4
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            {ETAPAS_POST_CONTEO.map((step) => (
              <span
                key={step}
                className={`h-2 flex-1 rounded-full ${
                  ETAPAS_POST_CONTEO.indexOf(step) <= ETAPAS_POST_CONTEO.indexOf(etapa)
                    ? 'bg-white'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {etapa === 'conteo' && (
        <VisitaConteoView
          visita={visita}
          guardarConteo={guardarConteo}
          onConteoGuardado={() => setEtapa('cobro')}
        />
      )}

      {etapa === 'cobro' && (
        formasPago.length > 0 ? (
          <VisitaCobroView
            key={cobro ? `draft-${cobro.forma_pago_id}-${cobro.monto}` : `calc-${visita.monto_calculado}`}
            initialValue={cobro}
            montoCalculado={visita.monto_calculado}
            formasPago={formasPago}
            onContinuar={(value) => {
              setCobro(value)
              setEtapa('reposicion')
            }}
          />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No hay formas de pago activas. Pide a un admin configurarlas antes de cerrar la visita.
          </div>
        )
      )}

      {etapa === 'reposicion' && (
        <VisitaReposicionView
          key={reposiciones ? 'loaded' : 'fresh'}
          items={visita.items}
          initialValue={reposiciones}
          onContinuar={(value) => {
            setReposiciones(value)
            setEtapa('fotos')
          }}
        />
      )}

      {etapa === 'fotos' && (
        <VisitaFotosView
          key={fotos.length > 0 ? 'loaded' : 'fresh'}
          initialValue={fotos}
          isUploading={subirFoto.isPending || eliminarFoto.isPending}
          onSubirFoto={async (file) => {
            const uploaded = await subirFoto.mutateAsync(file)
            return { id: uploaded.id, url: uploaded.url }
          }}
          onEliminarFoto={async (fotoId, path) => {
            await eliminarFoto.mutateAsync({ fotoId, path })
          }}
          onContinuar={(value) => {
            setFotos(value)
            setEtapa('confirmar_cierre')
          }}
        />
      )}

      {etapa === 'confirmar_cierre' && cobro && (
        <VisitaConfirmarView
          cobro={cobro}
          formaPagoNombre={formaPagoNombre}
          reposiciones={reposiciones ?? []}
          fotos={fotos}
          isPending={cerrarVisita.isPending}
          onConfirmar={handleCerrarVisita}
        />
      )}

      <IncidenciaSheet
        open={incidenciaSheetOpen}
        onOpenChange={setIncidenciaSheetOpen}
        visitaId={visita.id}
        pdvId={visita.pdvId}
        vitrinaId={visita.vitrinaId}
      />
    </div>
  )
}
