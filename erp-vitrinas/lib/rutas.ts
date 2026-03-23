export const DIAS_VISITA_VALUES = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const

export type DiaVisita = (typeof DIAS_VISITA_VALUES)[number]

export const DIAS_VISITA_OPTIONS: Array<{ value: DiaVisita; label: string }> = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mie' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sab' },
  { value: 'domingo', label: 'Dom' },
]

const DIA_VISITA_LABELS: Record<string, string> = {
  lun: 'Lunes',
  lunes: 'Lunes',
  mar: 'Martes',
  martes: 'Martes',
  mie: 'Miercoles',
  'mié': 'Miercoles',
  miercoles: 'Miercoles',
  jue: 'Jueves',
  jueves: 'Jueves',
  vie: 'Viernes',
  viernes: 'Viernes',
  sab: 'Sabado',
  'sáb': 'Sabado',
  sabado: 'Sabado',
  dom: 'Domingo',
  domingo: 'Domingo',
}

const DIA_VISITA_NORMALIZED: Record<string, DiaVisita> = {
  lun: 'lunes',
  lunes: 'lunes',
  mar: 'martes',
  martes: 'martes',
  mie: 'miercoles',
  'mié': 'miercoles',
  miercoles: 'miercoles',
  jue: 'jueves',
  jueves: 'jueves',
  vie: 'viernes',
  viernes: 'viernes',
  sab: 'sabado',
  'sáb': 'sabado',
  sabado: 'sabado',
  dom: 'domingo',
  domingo: 'domingo',
}

export function normalizeDiaVisita(value: string): DiaVisita | null {
  return DIA_VISITA_NORMALIZED[value.trim().toLowerCase()] ?? null
}

export function normalizeDiasVisita(values: string[] | null | undefined): DiaVisita[] {
  const normalized = (values ?? [])
    .map(normalizeDiaVisita)
    .filter((value): value is DiaVisita => value !== null)

  return Array.from(new Set(normalized))
}

export function formatDiaVisita(value: string): string {
  return DIA_VISITA_LABELS[value.trim().toLowerCase()] ?? value
}
