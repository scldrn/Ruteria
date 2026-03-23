'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { productoSchema } from '@/lib/validations/productos'
import { useCreateProducto, useUpdateProducto } from '@/lib/hooks/useProductos'
import { useCategoriasActivas } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'
import type { z } from 'zod'

type Producto = Database['public']['Tables']['productos']['Row']

// Use z.input so estado can be optional (it has .default('activo'))
type ProductoFormInput = z.input<typeof productoSchema>
type ProductoFormOutput = z.output<typeof productoSchema>

interface ProductoSheetProps {
  open: boolean
  onClose: () => void
  producto?: Producto | null
}

export function ProductoSheet({ open, onClose, producto }: ProductoSheetProps) {
  const { data: categorias = [] } = useCategoriasActivas()
  const createProducto = useCreateProducto()
  const updateProducto = useUpdateProducto()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormInput, unknown, ProductoFormOutput>({
    resolver: zodResolver(productoSchema),
    defaultValues: { estado: 'activo', costo_compra: 0, precio_venta_comercio: 0 },
  })

  useEffect(() => {
    if (!open) return
    if (producto) {
      reset({
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria_id: producto.categoria_id ?? '',
        descripcion: producto.descripcion ?? '',
        costo_compra: Number(producto.costo_compra ?? 0),
        precio_venta_comercio: Number(producto.precio_venta_comercio),
        unidad_medida: producto.unidad_medida ?? 'unidad',
        estado: producto.estado as 'activo' | 'inactivo',
      })
    } else {
      reset({ estado: 'activo', costo_compra: 0, precio_venta_comercio: 0, unidad_medida: 'unidad' })
    }
  }, [open, producto, reset])

  async function onSubmit(values: ProductoFormOutput) {
    try {
      if (producto) {
        await updateProducto.mutateAsync({ id: producto.id, values })
      } else {
        await createProducto.mutateAsync(values)
      }
      toast.success('Producto guardado')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isDuplicate = msg.includes('23505') || msg.includes('duplicate key') || msg.includes('unique')
      toast.error(isDuplicate ? 'Este código ya existe' : msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{producto ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
          <SheetDescription>
            Define la información comercial y de inventario del producto.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Field label="Código *" error={errors.codigo?.message}>
            <input {...register('codigo')} className={inputCls} placeholder="AUD-001" disabled={!!producto} />
          </Field>

          <Field label="Nombre *" error={errors.nombre?.message}>
            <input {...register('nombre')} className={inputCls} placeholder="Audífono Bluetooth X1" />
          </Field>

          <Field label="Categoría *" error={errors.categoria_id?.message}>
            <select {...register('categoria_id')} className={inputCls}>
              <option value="">Seleccionar...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Costo compra *" error={errors.costo_compra?.message}>
              <input
                {...register('costo_compra', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
              />
            </Field>
            <Field label="Precio venta *" error={errors.precio_venta_comercio?.message}>
              <input
                {...register('precio_venta_comercio', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Unidad de medida *" error={errors.unidad_medida?.message}>
            <input {...register('unidad_medida')} className={inputCls} placeholder="unidad" />
          </Field>

          <Field label="Descripción" error={errors.descripcion?.message}>
            <textarea {...register('descripcion')} className={`${inputCls} min-h-[80px] resize-none`} />
          </Field>

          <Field label="Estado" error={errors.estado?.message}>
            <select {...register('estado')} className={inputCls}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-[#6366f1] hover:bg-indigo-500" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// Helpers locales
const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
