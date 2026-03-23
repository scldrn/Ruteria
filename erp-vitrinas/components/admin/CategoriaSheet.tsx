'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { categoriaSchema } from '@/lib/validations/categorias'
import { useCreateCategoria, useUpdateCategoria } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'
import type { z } from 'zod'

type Categoria = Database['public']['Tables']['categorias']['Row']

// z.input keeps activo optional (for .default(true)); z.output has it required
type CategoriaFormInput = z.input<typeof categoriaSchema>
type CategoriaFormOutput = z.output<typeof categoriaSchema>

interface CategoriaSheetProps {
  open: boolean
  onClose: () => void
  categoria?: Categoria | null
}

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function CategoriaSheet({ open, onClose, categoria }: CategoriaSheetProps) {
  const create = useCreateCategoria()
  const update = useUpdateCategoria()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoriaFormInput, unknown, CategoriaFormOutput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { activo: true },
  })

  useEffect(() => {
    if (!open) return
    if (categoria) {
      reset({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '', activo: categoria.activo })
    } else {
      reset({ nombre: '', descripcion: '', activo: true })
    }
  }, [open, categoria, reset])

  async function onSubmit(values: CategoriaFormOutput) {
    try {
      if (categoria) {
        await update.mutateAsync({ id: categoria.id, values })
      } else {
        await create.mutateAsync(values)
      }
      toast.success('Categoría guardada')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{categoria ? 'Editar categoría' : 'Nueva categoría'}</SheetTitle>
          <SheetDescription>
            Organiza los productos por categoría y controla si están activas.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Field label="Nombre *" error={errors.nombre?.message}>
            <input {...register('nombre')} className={inputCls} placeholder="Audífonos" />
          </Field>
          <Field label="Descripción" error={errors.descripcion?.message}>
            <textarea {...register('descripcion')} className={`${inputCls} min-h-[80px] resize-none`} />
          </Field>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cat-activo" {...register('activo')} className="rounded" />
            <label htmlFor="cat-activo" className="text-sm text-slate-600">Categoría activa</label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-[#6366f1] hover:bg-indigo-500" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
