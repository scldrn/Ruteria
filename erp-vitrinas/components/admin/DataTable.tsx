'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  pageSize?: number
  emptyMessage?: string
  getRowKey: (row: T) => string | number
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
}

const DEFAULT_PAGE_SIZE = 20

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyMessage = 'No hay registros',
  getRowKey,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(data.length / pageSize)
  // Resetear página cuando cambia la cantidad de datos (e.g. búsqueda/filtro)
  const currentPage = page >= totalPages && totalPages > 0 ? totalPages - 1 : page
  const pageData = data.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            pageData.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, data.length)} de {data.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="Página anterior"
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              aria-label="Página siguiente"
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
