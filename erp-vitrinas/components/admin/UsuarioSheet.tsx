'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  ROLES,
  type UsuarioCreateValues,
  type UsuarioUpdateValues,
} from '@/lib/validations/usuarios'
import { useCreateUsuario, useUpdateUsuario } from '@/lib/hooks/useUsuarios'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

interface UsuarioSheetProps {
  open: boolean
  onClose: () => void
  usuario?: Usuario | null
}

export function UsuarioSheet({ open, onClose, usuario }: UsuarioSheetProps) {
  const createUsuario = useCreateUsuario()
  const updateUsuario = useUpdateUsuario()
  const isEditing = !!usuario

  const createForm = useForm<UsuarioCreateValues>({
    resolver: zodResolver(usuarioCreateSchema),
  })
  const updateForm = useForm<UsuarioUpdateValues>({
    resolver: zodResolver(usuarioUpdateSchema),
  })

  useEffect(() => {
    if (!open) return
    if (usuario) {
      updateForm.reset({ nombre: usuario.nombre, rol: usuario.rol as UsuarioUpdateValues['rol'], activo: usuario.activo })
    } else {
      createForm.reset()
    }
  }, [open, usuario, createForm, updateForm])

  async function onCreateSubmit(values: UsuarioCreateValues) {
    try {
      await createUsuario.mutateAsync(values)
      toast.success('Usuario creado')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear usuario')
    }
  }

  async function onUpdateSubmit(values: UsuarioUpdateValues) {
    if (!usuario) return
    try {
      await updateUsuario.mutateAsync({ id: usuario.id, values })
      toast.success('Usuario actualizado')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar usuario')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar usuario' : 'Nuevo usuario'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Actualiza el nombre, rol y estado del usuario seleccionado.'
              : 'Crea un usuario con contraseña temporal y rol inicial.'}
          </SheetDescription>
        </SheetHeader>

        {isEditing ? (
          <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4 mt-6">
            <div>
              <label htmlFor="usuario-email" className="block text-xs font-medium text-slate-600 mb-1">Correo (no editable)</label>
              <input id="usuario-email" value={usuario?.email ?? ''} disabled className={`${inputCls} bg-slate-50 text-slate-400`} />
            </div>
            <div>
              <label htmlFor="usuario-nombre" className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input id="usuario-nombre" {...updateForm.register('nombre')} className={inputCls} />
              {updateForm.formState.errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{updateForm.formState.errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="usuario-rol" className="block text-xs font-medium text-slate-600 mb-1">Rol *</label>
              <select id="usuario-rol" {...updateForm.register('rol')} className={inputCls}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" {...updateForm.register('activo')} className="rounded" />
              <label htmlFor="activo" className="text-sm text-slate-600">Usuario activo</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-[#6366f1] hover:bg-indigo-500" disabled={updateForm.formState.isSubmitting}>
                {updateForm.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 mt-6">
            <div>
              <label htmlFor="usuario-create-nombre" className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input id="usuario-create-nombre" {...createForm.register('nombre')} className={inputCls} />
              {createForm.formState.errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="usuario-create-email" className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico *</label>
              <input id="usuario-create-email" {...createForm.register('email')} type="email" autoComplete="email" className={inputCls} />
              {createForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="usuario-create-password" className="block text-xs font-medium text-slate-600 mb-1">Contraseña temporal *</label>
              <input id="usuario-create-password" {...createForm.register('password')} type="password" autoComplete="new-password" className={inputCls} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="usuario-create-rol" className="block text-xs font-medium text-slate-600 mb-1">Rol *</label>
              <select id="usuario-create-rol" {...createForm.register('rol')} className={inputCls}>
                <option value="">Seleccionar rol...</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {createForm.formState.errors.rol && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.rol.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-[#6366f1] hover:bg-indigo-500" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? 'Creando...' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
