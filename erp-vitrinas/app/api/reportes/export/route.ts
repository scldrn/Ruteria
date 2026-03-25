import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import type { UserRol } from '@/lib/validations/usuarios'

export const runtime = 'nodejs'

type ReporteExportTipo = 'ventas' | 'ranking' | 'inventario' | 'visitas' | 'incidencias'
type CellValue = string | number | boolean | null | undefined

type ColumnDef<TRow> = {
  header: string
  value: (row: TRow) => CellValue
  width?: number
  numFmt?: string
}

type ReporteVentasRow = Database['public']['Functions']['get_reporte_ventas']['Returns'][number]
type RankingVitrinasRow = Database['public']['Functions']['get_ranking_vitrinas']['Returns'][number]
type ReporteVisitasRow = Database['public']['Functions']['get_reporte_visitas']['Returns'][number]
type ReporteIncidenciasGarantiasRow =
  Database['public']['Functions']['get_reporte_incidencias_garantias']['Returns'][number]
type InventarioValorizadoRow = Database['public']['Views']['inventario_valorizado']['Row']

const REPORTES_BY_ROLE: Record<UserRol, ReporteExportTipo[]> = {
  admin: ['ventas', 'ranking', 'inventario', 'visitas', 'incidencias'],
  supervisor: ['ventas', 'ranking', 'inventario', 'visitas', 'incidencias'],
  analista: ['ventas', 'ranking', 'inventario', 'visitas', 'incidencias'],
  compras: ['inventario'],
  colaboradora: [],
}

function forbidden(message = 'Sin permisos para exportar este reporte') {
  return new NextResponse(message, { status: 403 })
}

function badRequest(message: string) {
  return new NextResponse(message, { status: 400 })
}

function readOptional(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key)?.trim()
  return value ? value : undefined
}

function readRequiredDate(searchParams: URLSearchParams, key: string) {
  const value = readOptional(searchParams, key)
  if (!value) throw new Error(`El parámetro ${key} es obligatorio`)
  return value
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(date)
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  return value
}

function normalizeCellValue(value: CellValue) {
  if (value === null || value === undefined) return ''
  return value
}

function applyWorksheetStyle<TRow>(worksheet: ExcelJS.Worksheet, rows: TRow[], columns: ColumnDef<TRow>[]) {
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: column.width ?? Math.max(14, column.header.length + 4),
    style: column.numFmt ? { numFmt: column.numFmt } : undefined,
  }))

  for (const row of rows) {
    worksheet.addRow(columns.map((column) => normalizeCellValue(column.value(row))))
  }

  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFF8FAFC' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      if (rowNumber > 1) {
        cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left' }
      }
    })
  })

  columns.forEach((column, index) => {
    const longestValue = rows.reduce((max, row) => {
      const value = column.value(row)
      return Math.max(max, String(normalizeCellValue(value)).length)
    }, column.header.length)

    worksheet.getColumn(index + 1).width = Math.min(Math.max(longestValue + 4, column.width ?? 14), 42)
  })
}

async function createWorkbookBuffer<TRow>(
  sheetName: string,
  rows: TRow[],
  columns: ColumnDef<TRow>[]
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'powERP'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheetName)
  applyWorksheetStyle(worksheet, rows, columns)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new NextResponse('Debes iniciar sesión para continuar', { status: 401 })
  }

  const rol = user.app_metadata?.rol as UserRol | undefined
  if (!rol || !(rol in REPORTES_BY_ROLE)) {
    return forbidden()
  }

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') as ReporteExportTipo | null

  if (!tipo || !['ventas', 'ranking', 'inventario', 'visitas', 'incidencias'].includes(tipo)) {
    return badRequest('El parámetro tipo es inválido')
  }

  if (!REPORTES_BY_ROLE[rol].includes(tipo)) {
    return forbidden()
  }

  try {
    if (tipo === 'ventas') {
      const desde = readRequiredDate(searchParams, 'desde')
      const hasta = readRequiredDate(searchParams, 'hasta')
      const { data, error } = await supabase.rpc('get_reporte_ventas', {
        p_desde: desde,
        p_hasta: hasta,
        p_ruta_id: readOptional(searchParams, 'rutaId'),
        p_colaboradora_id: readOptional(searchParams, 'colaboradoraId'),
        p_pdv_id: readOptional(searchParams, 'pdvId'),
        p_producto_id: readOptional(searchParams, 'productoId'),
      })

      if (error) throw new Error(error.message)

      const rows = (data ?? []).map((row: ReporteVentasRow) => ({
        pdv_nombre: row.pdv_nombre ?? '—',
        ruta_nombre: row.ruta_nombre ?? 'Sin ruta',
        colaboradora_nombre: row.colaboradora_nombre ?? 'Sin colaboradora',
        fecha: formatDate(row.fecha ?? ''),
        unidades_vendidas: row.unidades_vendidas ?? 0,
        monto_cobrado: row.monto_cobrado ?? 0,
        forma_pago: row.forma_pago ?? '—',
      }))

      const buffer = await createWorkbookBuffer('Ventas', rows, [
        { header: 'PDV', value: (row) => row.pdv_nombre, width: 24 },
        { header: 'Ruta', value: (row) => row.ruta_nombre, width: 22 },
        { header: 'Colaboradora', value: (row) => row.colaboradora_nombre, width: 22 },
        { header: 'Fecha', value: (row) => row.fecha, width: 14 },
        { header: 'Unidades vendidas', value: (row) => row.unidades_vendidas, width: 18, numFmt: '#,##0' },
        { header: 'Monto cobrado', value: (row) => row.monto_cobrado, width: 18, numFmt: '#,##0' },
        { header: 'Forma de pago', value: (row) => row.forma_pago, width: 18 },
      ])

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="reporte-ventas-${desde}-${hasta}.xlsx"`,
          'cache-control': 'no-store',
        },
      })
    }

    if (tipo === 'ranking') {
      const desde = readRequiredDate(searchParams, 'desde')
      const hasta = readRequiredDate(searchParams, 'hasta')
      const start = new Date(`${desde}T00:00:00.000Z`)
      const end = new Date(`${hasta}T00:00:00.000Z`)
      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
      const previousStart = new Date(start)
      previousStart.setUTCDate(previousStart.getUTCDate() - diffDays)
      const previousEnd = new Date(start)
      previousEnd.setUTCDate(previousEnd.getUTCDate() - 1)

      const { data, error } = await supabase.rpc('get_ranking_vitrinas', {
        p_desde_actual: desde,
        p_hasta_actual: hasta,
        p_desde_anterior: previousStart.toISOString().slice(0, 10),
        p_hasta_anterior: previousEnd.toISOString().slice(0, 10),
      })

      if (error) throw new Error(error.message)

      const rows = (data ?? []).map((row: RankingVitrinasRow) => ({
        pdv_nombre: row.pdv_nombre ?? '—',
        ventas_actual: row.ventas_actual ?? 0,
        ventas_anterior: row.ventas_anterior ?? 0,
        variacion_pct: row.variacion_pct ?? null,
      }))

      const buffer = await createWorkbookBuffer('Ranking vitrinas', rows, [
        { header: 'PDV', value: (row) => row.pdv_nombre, width: 24 },
        { header: 'Ventas período actual', value: (row) => row.ventas_actual, width: 20, numFmt: '#,##0' },
        { header: 'Ventas período anterior', value: (row) => row.ventas_anterior, width: 22, numFmt: '#,##0' },
        { header: 'Variación %', value: (row) => row.variacion_pct ?? '', width: 14, numFmt: '0.0' },
      ])

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="ranking-vitrinas-${desde}-${hasta}.xlsx"`,
          'cache-control': 'no-store',
        },
      })
    }

    if (tipo === 'inventario') {
      const { data, error } = await supabase
        .from('inventario_valorizado')
        .select('*')
        .order('ubicacion_tipo')
        .order('ubicacion_nombre')
        .order('producto_nombre')

      if (error) throw new Error(error.message)

      const rows = (data ?? []).map((row: InventarioValorizadoRow) => ({
        ubicacion_tipo: row.ubicacion_tipo ?? '—',
        ubicacion_nombre: row.ubicacion_nombre ?? '—',
        producto_codigo: row.producto_codigo ?? '—',
        producto_nombre: row.producto_nombre ?? '—',
        cantidad_actual: row.cantidad_actual ?? 0,
        costo_unitario_ref: row.costo_unitario_ref ?? 0,
        precio_venta_ref: row.precio_venta_ref ?? 0,
        valor_costo_total: row.valor_costo_total ?? 0,
        valor_venta_total: row.valor_venta_total ?? 0,
        updated_at: formatDateTime(row.updated_at),
      }))

      const buffer = await createWorkbookBuffer('Inventario', rows, [
        { header: 'Tipo de ubicación', value: (row) => row.ubicacion_tipo, width: 18 },
        { header: 'Ubicación', value: (row) => row.ubicacion_nombre, width: 24 },
        { header: 'Código producto', value: (row) => row.producto_codigo, width: 16 },
        { header: 'Producto', value: (row) => row.producto_nombre, width: 28 },
        { header: 'Cantidad actual', value: (row) => row.cantidad_actual, width: 16, numFmt: '#,##0' },
        { header: 'Costo unitario ref', value: (row) => row.costo_unitario_ref, width: 18, numFmt: '#,##0' },
        { header: 'Precio venta ref', value: (row) => row.precio_venta_ref, width: 18, numFmt: '#,##0' },
        { header: 'Valor costo total', value: (row) => row.valor_costo_total, width: 18, numFmt: '#,##0' },
        { header: 'Valor venta total', value: (row) => row.valor_venta_total, width: 18, numFmt: '#,##0' },
        { header: 'Actualizado', value: (row) => row.updated_at, width: 22 },
      ])

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': 'attachment; filename="reporte-inventario.xlsx"',
          'cache-control': 'no-store',
        },
      })
    }

    if (tipo === 'visitas') {
      const desde = readRequiredDate(searchParams, 'desde')
      const hasta = readRequiredDate(searchParams, 'hasta')
      const { data, error } = await supabase.rpc('get_reporte_visitas', {
        p_desde: desde,
        p_hasta: hasta,
        p_ruta_id: readOptional(searchParams, 'rutaId'),
      })

      if (error) throw new Error(error.message)

      const rows = (data ?? []).map((row: ReporteVisitasRow) => ({
        pdv_nombre: row.pdv_nombre ?? '—',
        ruta_nombre: row.ruta_nombre ?? 'Sin ruta',
        colaboradora_nombre: row.colaboradora_nombre ?? 'Sin colaboradora',
        fecha_planificada: formatDate(row.fecha_planificada ?? ''),
        estado: row.estado ?? '—',
        motivo_no_realizada: row.motivo_no_realizada ?? '',
      }))

      const buffer = await createWorkbookBuffer('Visitas', rows, [
        { header: 'PDV', value: (row) => row.pdv_nombre, width: 24 },
        { header: 'Ruta', value: (row) => row.ruta_nombre, width: 22 },
        { header: 'Colaboradora', value: (row) => row.colaboradora_nombre, width: 22 },
        { header: 'Fecha planificada', value: (row) => row.fecha_planificada, width: 18 },
        { header: 'Estado', value: (row) => row.estado, width: 16 },
        { header: 'Motivo no realizada', value: (row) => row.motivo_no_realizada, width: 30 },
      ])

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="reporte-visitas-${desde}-${hasta}.xlsx"`,
          'cache-control': 'no-store',
        },
      })
    }

    const desde = readRequiredDate(searchParams, 'desde')
    const hasta = readRequiredDate(searchParams, 'hasta')
    const { data, error } = await supabase.rpc('get_reporte_incidencias_garantias', {
      p_desde: desde,
      p_hasta: hasta,
      p_tipo: readOptional(searchParams, 'tipo'),
      p_pdv_id: readOptional(searchParams, 'pdvId'),
    })

    if (error) throw new Error(error.message)

    const rows = (data ?? []).map((row: ReporteIncidenciasGarantiasRow) => ({
      tipo_registro: row.tipo_registro ?? '—',
      pdv_nombre: row.pdv_nombre ?? '—',
      descripcion_o_motivo: row.descripcion_o_motivo ?? '',
      estado: row.estado ?? '—',
      fecha_apertura: formatDateTime(row.fecha_apertura),
      fecha_cierre: formatDateTime(row.fecha_cierre),
      dias_abierta: row.dias_abierta ?? 0,
    }))

    const buffer = await createWorkbookBuffer('Incidencias y garantias', rows, [
      { header: 'Tipo', value: (row) => row.tipo_registro, width: 14 },
      { header: 'PDV', value: (row) => row.pdv_nombre, width: 24 },
      { header: 'Descripción o motivo', value: (row) => row.descripcion_o_motivo, width: 34 },
      { header: 'Estado', value: (row) => row.estado, width: 16 },
      { header: 'Fecha apertura', value: (row) => row.fecha_apertura, width: 22 },
      { header: 'Fecha cierre', value: (row) => row.fecha_cierre, width: 22 },
      { header: 'Días abierta', value: (row) => row.dias_abierta, width: 14, numFmt: '#,##0' },
    ])

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="reporte-incidencias-garantias-${desde}-${hasta}.xlsx"`,
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el archivo'
    return new NextResponse(message, { status: 500 })
  }
}
