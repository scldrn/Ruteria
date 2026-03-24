'use client'

type CompressImageOptions = {
  maxBytes?: number
  maxDimension?: number
}

const DEFAULT_MAX_BYTES = 800 * 1024
const DEFAULT_MAX_DIMENSION = 1600

async function fileToImageBitmap(file: File): Promise<ImageBitmap | null> {
  if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') {
    return null
  }

  try {
    return await createImageBitmap(file)
  } catch {
    return null
  }
}

function pickOutputType(inputType: string): string {
  if (inputType === 'image/png') return 'image/png'
  if (inputType === 'image/webp') return 'image/webp'
  return 'image/jpeg'
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  outputType: string,
  quality: number,
  originalName: string
): Promise<File | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), outputType, quality)
  })

  if (!blob) return null

  const extension = outputType === 'image/png' ? 'png' : outputType === 'image/webp' ? 'webp' : 'jpg'
  const safeName = originalName.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${safeName}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  })
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION

  if (!file.type.startsWith('image/')) {
    return file
  }

  if (file.size <= maxBytes) {
    return file
  }

  const bitmap = await fileToImageBitmap(file)
  if (!bitmap || typeof document === 'undefined') {
    return file
  }

  const longestSide = Math.max(bitmap.width, bitmap.height)
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const outputType = pickOutputType(file.type)
  const qualitySteps = outputType === 'image/png' ? [0.92] : [0.9, 0.82, 0.74, 0.66, 0.58]

  let bestCandidate: File | null = null

  for (const quality of qualitySteps) {
    const candidate = await canvasToFile(canvas, outputType, quality, file.name)
    if (!candidate) continue

    bestCandidate = candidate

    if (candidate.size <= maxBytes) {
      return candidate
    }
  }

  return bestCandidate ?? file
}
