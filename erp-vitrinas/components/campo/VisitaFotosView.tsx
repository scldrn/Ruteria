'use client'

import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export type FotoDraft = {
  id: string
  fotoId: string
  storagePath: string
  previewUrl: string | null
}

interface Props {
  initialValue?: FotoDraft[] | null
  onSubirFoto: (file: File) => Promise<{ id: string; url: string }>
  onEliminarFoto: (fotoId: string, path: string) => Promise<void>
  isUploading: boolean
  onContinuar: (fotos: FotoDraft[]) => void
}

export function VisitaFotosView({
  initialValue,
  onSubirFoto,
  onEliminarFoto,
  isUploading,
  onContinuar,
}: Props) {
  const [fotos, setFotos] = useState<FotoDraft[]>(initialValue ?? [])
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return

    for (const file of Array.from(files)) {
      const previewUrl = URL.createObjectURL(file)

      try {
        const uploaded = await onSubirFoto(file)
        if (uploaded.url.startsWith('offline://')) {
          toast.success('Foto guardada en este dispositivo. Se sincronizara al reconectar.')
        }
        setFotos((current) => [
          ...current,
          {
            id: `${uploaded.id}-${Date.now()}`,
            fotoId: uploaded.id,
            storagePath: uploaded.url,
            previewUrl,
          },
        ])
      } catch (error) {
      URL.revokeObjectURL(previewUrl)
        toast.error(error instanceof Error ? error.message : 'No se pudo subir la foto')
      }
    }

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  async function handleRemove(foto: FotoDraft) {
    try {
      await onEliminarFoto(foto.fotoId, foto.storagePath)
      if (foto.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(foto.previewUrl)
      }
      setFotos((current) => current.filter((item) => item.id !== foto.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la foto')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-slate-900 text-white p-2">
            <Camera size={16} />
          </div>
          <div>
            <p className="font-medium text-slate-800">Toma una foto de como quedo la vitrina</p>
            <p className="text-sm text-slate-500">Se requiere al menos una foto final para completar la visita.</p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
        />
      </div>

      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative rounded-xl overflow-hidden border border-slate-200">
              {foto.previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.previewUrl} alt="Vista previa de la vitrina" className="h-36 w-full object-cover" />
                </>
              ) : (
                <div className="flex h-36 items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500">
                  Foto ya registrada en la visita
                </div>
              )}
              <button
                type="button"
                className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow"
                onClick={() => handleRemove(foto)}
                aria-label="Eliminar foto"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button className="w-full" onClick={() => onContinuar(fotos)} disabled={isUploading || fotos.length === 0}>
        {isUploading ? 'Subiendo...' : 'Continuar a confirmar'}
      </Button>
    </div>
  )
}
