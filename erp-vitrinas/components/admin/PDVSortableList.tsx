'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'

type PdvItem = {
  pdv_id: string
  orden_visita: number
  nombre: string
}

interface PDVSortableListProps {
  items: PdvItem[]
  onReorder: (items: PdvItem[]) => void
  onRemove: (pdv_id: string) => void
}

// Ítem individual con drag handle
function SortableItem({
  item,
  onRemove,
}: {
  item: PdvItem
  onRemove: (pdv_id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.pdv_id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 flex-shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical size={16} />
      </button>

      {/* Número de orden */}
      <span className="w-6 text-center text-xs font-semibold text-slate-500 flex-shrink-0">
        {item.orden_visita}
      </span>

      {/* Nombre del PDV */}
      <span className="flex-1 truncate text-slate-800">{item.nombre}</span>

      {/* Botón de eliminar */}
      <button
        type="button"
        onClick={() => onRemove(item.pdv_id)}
        className="text-slate-400 hover:text-red-500 flex-shrink-0"
        aria-label={`Quitar ${item.nombre} de la ruta`}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function PDVSortableList({ items, onReorder, onRemove }: PDVSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.pdv_id === active.id)
    const newIndex = items.findIndex((item) => item.pdv_id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Reordenar y recalcular orden_visita (1-based)
    const reordenado = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      orden_visita: index + 1,
    }))

    onReorder(reordenado)
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No hay PDVs en esta ruta. Agrega desde la columna de la izquierda.
      </p>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.pdv_id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItem key={item.pdv_id} item={item} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
