'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { ProductoSheet } from '@/components/admin/ProductoSheet'
import { useProductos, useToggleProductoEstado } from '@/lib/hooks/useProductos'
import { useCategorias } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'

type Producto = Database['public']['Tables']['productos']['Row'] & {
  categorias: { nombre: string } | null
}

export default function ProductosPage() {
  const { data: productos = [], isLoading } = useProductos()
  const { data: categorias = [] } = useCategorias()
  const toggleEstado = useToggleProductoEstado()

  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      const matchSearch =
        !search ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase())
      const matchCat = !filterCategoria || p.categoria_id === filterCategoria
      const matchEstado =
        filterEstado === 'todos' || p.estado === filterEstado
      return matchSearch && matchCat && matchEstado
    })
  }, [productos, search, filterCategoria, filterEstado])

  const handleToggle = useCallback((producto: Producto) => {
    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo'
    toggleEstado.mutate(
      { id: producto.id, estado: nuevoEstado },
      {
        onError: () => toast.error('Error al cambiar estado'),
      }
    )
  }, [toggleEstado])

  const columns = useMemo<Column<Producto>[]>(() => [
    { key: 'codigo', header: 'Código', render: (p) => <span className="font-mono text-xs">{p.codigo}</span> },
    { key: 'nombre', header: 'Nombre', render: (p) => p.nombre },
    { key: 'categoria', header: 'Categoría', render: (p) => p.categorias?.nombre ?? '—' },
    {
      key: 'precio',
      header: 'Precio venta',
      render: (p) => `$${Number(p.precio_venta_comercio).toLocaleString('es-CO')}`,
      className: 'text-right',
    },
    {
      key: 'costo',
      header: 'Costo',
      render: (p) => `$${Number(p.costo_compra ?? 0).toLocaleString('es-CO')}`,
      className: 'text-right',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={p.estado === 'activo'}
            onCheckedChange={() => handleToggle(p)}
          />
          <Badge variant={p.estado === 'activo' ? 'default' : 'secondary'} className="text-xs">
            {p.estado}
          </Badge>
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (p) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setEditingProducto(p); setSheetOpen(true) }}
        >
          <Pencil size={14} />
        </Button>
      ),
      className: 'w-12',
    },
  ], [handleToggle, setEditingProducto, setSheetOpen])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Productos</h1>
          <p className="text-sm text-slate-500 mt-1">{productos.length} productos en catálogo</p>
        </div>
        <Button
          className="bg-[#6366f1] hover:bg-indigo-500"
          onClick={() => { setEditingProducto(null); setSheetOpen(true) }}
        >
          <Plus size={16} className="mr-1.5" /> Nuevo producto
        </Button>
      </div>

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
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as 'todos' | 'activo' | 'inactivo')}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
      />

      <ProductoSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        producto={editingProducto}
      />
    </div>
  )
}
