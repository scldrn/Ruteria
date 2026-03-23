import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const BUSINESS_TIME_ZONE = 'America/Bogota'

function getBusinessDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  const weekday = parts.find((part) => part.type === 'weekday')?.value

  if (!year || !month || !day || !weekday) {
    throw new Error('No se pudo calcular la fecha de negocio')
  }

  return {
    date: `${year}-${month}-${day}`,
    weekday: weekday
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
  }
}

function addDaysToDateString(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, day + days))
  const nextYear = utcDate.getUTCFullYear()
  const nextMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const nextDay = String(utcDate.getUTCDate()).padStart(2, '0')

  return `${nextYear}-${nextMonth}-${nextDay}`
}

type RutaPdvRow = {
  pdv_id: string
  orden_visita: number
  puntos_de_venta: { id: string; activo: boolean } | null
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // Guard: fallar rápido si no hay service role key
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const hoy = getBusinessDateParts(new Date())
  const diaActual = DIAS_SEMANA.includes(hoy.weekday) ? hoy.weekday : DIAS_SEMANA[new Date().getUTCDay()]
  const fechaHoy = hoy.date
  const fechaManana = addDaysToDateString(fechaHoy, 1)
  const start = `${fechaHoy}T05:00:00.000Z`
  const end = `${fechaManana}T05:00:00.000Z`

  // 1. Rutas activas que tienen programado el día actual
  const { data: rutas, error: rutasError } = await supabase
    .from('rutas')
    .select('id, colaboradora_id, rutas_pdv(pdv_id, orden_visita, puntos_de_venta(id, activo))')
    .eq('estado', 'activa')
    .contains('dias_visita', [diaActual])

  if (rutasError) {
    console.error('Error fetching rutas:', rutasError.message)
    return new Response(JSON.stringify({ error: rutasError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let creadas = 0
  let omitidas = 0
  let errores = 0

  for (const ruta of rutas ?? []) {
    const pdvsActivos = ((ruta.rutas_pdv ?? []) as RutaPdvRow[]).filter(
      (rp) => rp.puntos_de_venta?.activo === true
    )

    for (const rp of pdvsActivos) {
      const pdvId = rp.pdv_id

      // 2. Vitrina activa asignada a este PDV
      const { data: vitrina, error: vitrinaError } = await supabase
        .from('vitrinas')
        .select('id')
        .eq('pdv_id', pdvId)
        .eq('estado', 'activa')
        .maybeSingle()

      if (vitrinaError) {
        console.error(`Error fetching vitrina for pdv ${pdvId}:`, vitrinaError.message)
        errores++
        continue
      }

      if (!vitrina) continue // PDV sin vitrina activa — saltar

      // 3. Idempotencia: ya existe planificada para hoy con esta combinación?
      const { data: existente, error: existenteError } = await supabase
        .from('visitas')
        .select('id')
        .eq('pdv_id', pdvId)
        .eq('vitrina_id', vitrina.id)
        .eq('colaboradora_id', ruta.colaboradora_id)
        .eq('estado', 'planificada')
        .gte('created_at', start)
        .lt('created_at', end)
        .maybeSingle()

      if (existenteError) {
        console.error(`Error checking idempotency for pdv ${pdvId}:`, existenteError.message)
        errores++
        continue
      }

      if (existente) {
        omitidas++
        continue
      }

      // 4. Insertar visita planificada
      const { error: insertError } = await supabase.from('visitas').insert({
        ruta_id: ruta.id,
        pdv_id: pdvId,
        vitrina_id: vitrina.id,
        colaboradora_id: ruta.colaboradora_id,
        estado: 'planificada',
      })

      if (insertError) {
        console.error(`Error inserting visita for pdv ${pdvId}:`, insertError.message)
        errores++
      } else {
        creadas++
      }
    }
  }

  console.log(`Visitas generadas: ${creadas}, omitidas: ${omitidas}, errores: ${errores}`)
  const status = errores > 0 ? 207 : 200
  return new Response(JSON.stringify({ creadas, omitidas, errores }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
})
