'use client'

import { use, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { VitrinaSheet } from '@/components/admin/VitrinaSheet'
import { SurtidoEstandarTab } from '@/components/admin/SurtidoEstandarTab'
import { InventarioVitrinaTab } from '@/components/admin/InventarioVitrinaTab'
import { useVitrinas, useRetirarVitrina } from '@/lib/hooks/useVitrinas'

const ESTADO_LABEL: Record<string, string> = {
  activa: 'Activa',
  inactiva: 'Inactiva',
  retirada: 'Retirada',
}

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  activa: 'default',
  inactiva: 'secondary',
  retirada: 'destructive',
}

function SkeletonPage() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-xs" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
    </div>
  )
}

const VALID_ESTADOS = ['activa', 'inactiva', 'retirada'] as const
type EstadoVitrina = typeof VALID_ESTADOS[number]

export default function VitrinaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: vitrinas = [], isLoading } = useVitrinas()
  const retirarVitrina = useRetirarVitrina()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isLoading) return <SkeletonPage />

  const vitrina = vitrinas.find((v) => v.id === id)

  if (!vitrina) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-slate-600 text-lg">Vitrina no encontrada</p>
        <Link href="/admin/vitrinas" className="text-indigo-600 hover:underline text-sm">
          ← Volver a Vitrinas
        </Link>
      </div>
    )
  }

  async function handleRetirar() {
    try {
      await retirarVitrina.mutateAsync(id)
      toast.success('Vitrina retirada')
      router.push('/admin/vitrinas')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg)
    }
  }

  const estado: EstadoVitrina = VALID_ESTADOS.includes(vitrina.estado as EstadoVitrina)
    ? (vitrina.estado as EstadoVitrina)
    : 'inactiva'
  const pdvNombre = vitrina.puntos_de_venta?.nombre_comercial ?? '—'

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/vitrinas"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft size={14} />
        Vitrinas
      </Link>

      {/* Page heading */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{vitrina.codigo}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500">{pdvNombre}</span>
            <Badge variant={ESTADO_VARIANT[estado] ?? 'outline'} className="text-xs">
              {ESTADO_LABEL[estado] ?? estado}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="surtido">Surtido estándar</TabsTrigger>
          <TabsTrigger value="inventario">Inventario actual</TabsTrigger>
        </TabsList>

        {/* Tab: Info */}
        <TabsContent value="info">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Código" value={vitrina.codigo} />
              <Field label="Punto de venta" value={pdvNombre} />
              <Field label="Zona" value={vitrina.puntos_de_venta?.zona_id ?? '—'} />
              <Field
                label="Estado"
                value={
                  <Badge variant={ESTADO_VARIANT[estado] ?? 'outline'} className="text-xs">
                    {ESTADO_LABEL[estado] ?? estado}
                  </Badge>
                }
              />
              <Field
                label="Fecha de creación"
                value={new Date(vitrina.created_at).toLocaleDateString('es-CO')}
              />
              {vitrina.tipo && <Field label="Tipo" value={vitrina.tipo} />}
              {vitrina.notas && (
                <div className="sm:col-span-2">
                  <Field label="Notas" value={vitrina.notas} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSheetOpen(true)}
              >
                <Pencil size={14} className="mr-1.5" />
                Editar
              </Button>

              {estado !== 'retirada' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 size={14} className="mr-1.5" />
                      Marcar como retirada
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Retirar vitrina?</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Seguro que deseas retirar esta vitrina? Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-500 text-white"
                        onClick={handleRetirar}
                        disabled={retirarVitrina.isPending}
                      >
                        {retirarVitrina.isPending ? 'Retirando...' : 'Sí, retirar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Surtido estándar */}
        <TabsContent value="surtido">
          <SurtidoEstandarTab vitrinaId={id} />
        </TabsContent>

        {/* Tab: Inventario actual */}
        <TabsContent value="inventario">
          <InventarioVitrinaTab vitrinaId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit sheet */}
      <VitrinaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vitrina={{
          id: vitrina.id,
          codigo: vitrina.codigo,
          pdv_id: vitrina.pdv_id,
          tipo: vitrina.tipo,
          estado: estado,
          notas: vitrina.notas,
        }}
      />
    </div>
  )
}

// Local helper
function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  )
}
