'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { InventarioCentralSheet } from '@/components/admin/InventarioCentralSheet'
import { InventarioColaboradorasTab } from '@/components/admin/InventarioColaboradorasTab'
import { BajaInventarioSheet } from '@/components/admin/BajaInventarioSheet'
import { MovimientosInventarioTab } from '@/components/admin/MovimientosInventarioTab'
import { InventarioValorizadoTab } from '@/components/admin/InventarioValorizadoTab'
import { useInventarioCentral, type InventarioCentralItem } from '@/lib/hooks/useInventarioCentral'

// Formateador de moneda COP
function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
  }).format(value)
}

// Formateador de fecha corta
function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

export default function InventarioCentralPage() {
  const { data: items = [], isLoading } = useInventarioCentral()

  const [activeTab, setActiveTab] = useState('central')
  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [bajaSheetOpen, setBajaSheetOpen] = useState(false)

  // Filtrado por búsqueda de nombre/código y por categoría
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const nombre = item.productos?.nombre ?? ''
      const codigo = item.productos?.codigo ?? ''
      const matchSearch =
        !search ||
        nombre.toLowerCase().includes(search.toLowerCase()) ||
        codigo.toLowerCase().includes(search.toLowerCase())
      const categoriaNombre = item.productos?.categorias?.nombre ?? ''
      const matchCat =
        !filterCategoria ||
        categoriaNombre === filterCategoria
      return matchSearch && matchCat
    })
  }, [items, search, filterCategoria])

  const columns = useMemo<Column<InventarioCentralItem>[]>(() => [
    {
      key: 'producto',
      header: 'Producto',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-800">{item.productos?.nombre ?? '—'}</p>
          <p className="text-xs text-slate-400 font-mono">{item.productos?.codigo ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (item) => item.productos?.categorias?.nombre ?? '—',
    },
    {
      key: 'stock',
      header: 'Stock actual',
      render: (item) => (
        <span className="font-semibold text-slate-700">{item.cantidad_actual}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'costo',
      header: 'Costo unitario',
      render: (item) => {
        const costo = item.costo_promedio ?? item.productos?.costo_compra ?? 0
        return formatCOP(Number(costo))
      },
      className: 'text-right',
    },
    {
      key: 'valor_total',
      header: 'Valor total',
      render: (item) => (
        <span className="font-medium">{formatCOP(item.valor_total)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'actualizacion',
      header: 'Última actualización',
      render: (item) => (
        <span className="text-xs text-slate-500">{formatFecha(item.fecha_actualizacion)}</span>
      ),
    },
  ], [])

  // Categorías únicas presentes en el inventario actual (para el filtro)
  const categoriasEnInventario = useMemo(() => {
    const nombres = new Set(
      items.map((i) => i.productos?.categorias?.nombre).filter(Boolean) as string[]
    )
    return Array.from(nombres).sort()
  }, [items])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Inventario</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'central' && `${items.length} productos en bodega`}
            {activeTab === 'colaboradoras' && 'Stock asignado a colaboradoras de campo'}
            {activeTab === 'movimientos' && 'Historial inmutable de movimientos por producto y ubicacion'}
            {activeTab === 'valorizado' && 'Reporte consolidado del inventario a costo y a venta'}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'central' && (
            <Button
              className="bg-[#6366f1] hover:bg-indigo-500"
              onClick={() => setSheetOpen(true)}
            >
              <Plus size={16} className="mr-1.5" /> Registrar entrada
            </Button>
          )}
          <Button variant="outline" onClick={() => setBajaSheetOpen(true)}>
            Registrar baja
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="central">Central</TabsTrigger>
          <TabsTrigger value="colaboradoras">Colaboradoras</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="valorizado">Valorizado</TabsTrigger>
        </TabsList>

        <TabsContent value="central">
          <div className="flex gap-3 mb-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre o código..."
              className="max-w-xs"
            />
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las categorías</option>
              {categoriasEnInventario.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            getRowKey={(item) => item.id}
          />
        </TabsContent>

        <TabsContent value="colaboradoras">
          <InventarioColaboradorasTab />
        </TabsContent>

        <TabsContent value="movimientos">
          <MovimientosInventarioTab />
        </TabsContent>

        <TabsContent value="valorizado">
          <InventarioValorizadoTab />
        </TabsContent>
      </Tabs>

      <InventarioCentralSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <BajaInventarioSheet open={bajaSheetOpen} onOpenChange={setBajaSheetOpen} />
    </div>
  )
}
