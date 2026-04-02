const SAFE_EXTENSION = /^[a-z0-9]+$/i

function normalizeExtension(filename: string) {
  const candidate = filename.split('.').pop()?.trim().toLowerCase() ?? 'jpg'
  return SAFE_EXTENSION.test(candidate) ? candidate : 'jpg'
}

export function buildScopedPhotoPath(params: {
  entityType: 'visitas' | 'incidencias'
  ownerId: string
  entityId: string
  photoId: string
  filename: string
}) {
  const extension = normalizeExtension(params.filename)
  return `${params.entityType}/${params.ownerId}/${params.entityId}/${params.photoId}.${extension}`
}
