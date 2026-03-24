# Sprint 5 — Inventario Avanzado + Incidencias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar bajas auditadas de inventario, historial de movimientos, reporte valorizado y el flujo completo de incidencias en campo/admin sin romper el flujo de visita de Sprint 4.

**Architecture:** Reutilizar la base consolidada de Sprint 4. `/admin/inventario` se expande con tabs nuevas para `Movimientos` y `Valorizado`; `/campo/visita/[id]` mantiene su máquina de estados actual y añade captura de incidencias como acción secundaria no bloqueante. Las reglas críticas del dominio se refuerzan en PostgreSQL con vistas y triggers.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase PostgreSQL + PostgREST + Storage, React Query v5, TailwindCSS v4, shadcn/ui, Playwright e2e

---

## Prerequisito — Rama feature

```bash
cd /Users/sam/Proyects/PowerApp/erp-vitrinas
git checkout main && git pull
git checkout -b feature/sprint5-inventario-incidencias
```

Verificar que Sprint 4 sigue verde:

```bash
npx playwright test tests/sprint4.spec.ts
```

Expected: suite de Sprint 4 pasando antes de tocar flujo móvil.

---

## File Map

### Archivos nuevos

| Archivo | Responsabilidad |
|---------|----------------|
| `supabase/migrations/20260021_movimientos_baja_motivo.sql` | `motivo_baja` + constraints para bajas |
| `supabase/migrations/20260022_movimientos_historial_view.sql` | Vista `movimientos_inventario_detalle` |
| `supabase/migrations/20260023_inventario_valorizado_view.sql` | Vista `inventario_valorizado` |
| `supabase/migrations/20260024_fotos_incidencia.sql` | Tabla `fotos_incidencia` + RLS |
| `supabase/migrations/20260025_incidencias_workflow.sql` | Trigger de transiciones y cierre de incidencias |
| `lib/validations/incidencias.ts` | Schemas Zod para crear/actualizar incidencias |
| `lib/hooks/useMovimientosInventario.ts` | Query historial + mutación de baja |
| `lib/hooks/useInventarioValorizado.ts` | Query del reporte valorizado |
| `lib/hooks/useIncidencias.ts` | Query y mutaciones de incidencias |
| `components/admin/BajaInventarioSheet.tsx` | Sheet para registrar bajas manuales |
| `components/admin/MovimientosInventarioTab.tsx` | Tab historial de movimientos |
| `components/admin/InventarioValorizadoTab.tsx` | Tab reporte valorizado |
| `components/admin/IncidenciasTable.tsx` | Tabla admin de incidencias |
| `components/admin/IncidenciaDetalleSheet.tsx` | Sheet de seguimiento/admin |
| `components/campo/IncidenciaSheet.tsx` | Captura de incidencia durante visita |
| `components/campo/VisitaIncidenciasButton.tsx` | CTA secundaria + contador |
| `app/(admin)/admin/incidencias/page.tsx` | Página admin incidencias |
| `tests/sprint5.spec.ts` | E2E del sprint |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/(admin)/admin/inventario/page.tsx` | Agregar tabs `Movimientos` y `Valorizado`, CTA de baja |
| `app/(campo)/campo/visita/[id]/page.tsx` | Integrar botón/sheet de incidencias durante visita |
| `components/admin/AppSidebar.tsx` | Agregar item `Incidencias` |
| `lib/hooks/useInventarioCentral.ts` | Invalidar queries nuevas al registrar entradas |
| `lib/hooks/useInventarioColaboradora.ts` | Invalidar historial/valorizado al transferir |
| `lib/hooks/useVisita.ts` | Exponer `incidencias` relacionadas si se necesitan en la vista |
| `lib/validations/inventario.ts` | Agregar schema de baja |
| `lib/supabase/database.types.ts` | Regenerar tras migraciones |
| `CODEX_CONTEXT.md` | Dejar estado real actualizado para futuras sesiones |

### Archivos a evitar como base

| Archivo | Motivo |
|---------|--------|
| `lib/hooks/useInventario.ts` | Sigue stub y no es la base real del módulo |
| `lib/validations/visitas.ts` | Sigue stub histórico, no modela Sprint 5 |

---

## Task 1: Migraciones SQL + vistas + reglas de incidencias

**Files:**

- Create: `erp-vitrinas/supabase/migrations/20260021_movimientos_baja_motivo.sql`
- Create: `erp-vitrinas/supabase/migrations/20260022_movimientos_historial_view.sql`
- Create: `erp-vitrinas/supabase/migrations/20260023_inventario_valorizado_view.sql`
- Create: `erp-vitrinas/supabase/migrations/20260024_fotos_incidencia.sql`
- Create: `erp-vitrinas/supabase/migrations/20260025_incidencias_workflow.sql`
- Modify: `erp-vitrinas/lib/supabase/database.types.ts`

- [ ] **Step 1: Crear migración 20260021_movimientos_baja_motivo.sql**

```sql
ALTER TABLE movimientos_inventario
ADD COLUMN motivo_baja TEXT
  CHECK (motivo_baja IS NULL OR motivo_baja IN ('robo', 'perdida', 'dano'));

ALTER TABLE movimientos_inventario
ADD CONSTRAINT movimientos_baja_motivo_required
CHECK (
  tipo <> 'baja'
  OR motivo_baja IS NOT NULL
);
```

Opcional recomendado:

```sql
ALTER TABLE movimientos_inventario
ADD CONSTRAINT movimientos_baja_direccion_check
CHECK (
  tipo <> 'baja'
  OR direccion = 'salida'
);
```

- [ ] **Step 2: Crear migración 20260022_movimientos_historial_view.sql**

Crear una vista `movimientos_inventario_detalle` con joins a:

- `productos`
- `usuarios`
- `vitrinas`
- `puntos_de_venta`

Campos mínimos:

- `id`, `created_at`
- `producto_id`, `producto_codigo`, `producto_nombre`
- `tipo`, `motivo_baja`, `cantidad`, `direccion`
- `origen_tipo`, `origen_id`, `origen_label`
- `destino_tipo`, `destino_id`, `destino_label`
- `usuario_nombre`
- `referencia_tipo`, `referencia_id`, `notas`

Recomendación: usar `LEFT JOIN` y `CASE` para resolver labels legibles.

- [ ] **Step 3: Crear migración 20260023_inventario_valorizado_view.sql**

Crear una vista `inventario_valorizado` con `UNION ALL` de:

1. `inventario_central`
2. `inventario_colaboradora`
3. `inventario_vitrina`

Cada select debe devolver:

- `ubicacion_tipo`
- `ubicacion_id`
- `ubicacion_nombre`
- `producto_id`, `producto_codigo`, `producto_nombre`
- `cantidad_actual`
- `costo_unitario_ref`
- `precio_venta_ref`
- `valor_costo_total`
- `valor_venta_total`
- `updated_at`

- [ ] **Step 4: Crear migración 20260024_fotos_incidencia.sql**

```sql
CREATE TABLE fotos_incidencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidencia_id UUID NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

ALTER TABLE fotos_incidencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fotos_incidencia_select" ON fotos_incidencia
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "fotos_incidencia_insert" ON fotos_incidencia
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('colaboradora', 'admin', 'supervisor'));

CREATE POLICY "fotos_incidencia_delete" ON fotos_incidencia
  FOR DELETE TO authenticated
  USING (get_my_rol() IN ('admin', 'supervisor'));
```

Nota: reutilizar bucket `fotos-visita`; no hace falta bucket nuevo.

- [ ] **Step 5: Crear migración 20260025_incidencias_workflow.sql**

Objetivos:

- validar transición secuencial
- exigir `resolucion` para `resuelta` y `cerrada`
- setear `fecha_cierre` al cerrar

Pseudocódigo recomendado:

```sql
CREATE OR REPLACE FUNCTION validar_transicion_incidencia()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.estado = OLD.estado THEN
    RETURN NEW;
  END IF;

  IF OLD.estado = 'abierta' AND NEW.estado <> 'en_analisis' THEN
    RAISE EXCEPTION 'Transicion invalida';
  END IF;

  IF OLD.estado = 'en_analisis' AND NEW.estado <> 'resuelta' THEN
    RAISE EXCEPTION 'Transicion invalida';
  END IF;

  IF OLD.estado = 'resuelta' AND NEW.estado <> 'cerrada' THEN
    RAISE EXCEPTION 'Transicion invalida';
  END IF;

  IF NEW.estado IN ('resuelta', 'cerrada') AND trim(COALESCE(NEW.resolucion, '')) = '' THEN
    RAISE EXCEPTION 'La resolucion es obligatoria';
  END IF;

  IF NEW.estado = 'cerrada' AND NEW.fecha_cierre IS NULL THEN
    NEW.fecha_cierre := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 6: Aplicar migraciones y regenerar tipos**

```bash
cd erp-vitrinas
supabase db reset
supabase gen types typescript --local > lib/supabase/database.types.ts
```

Expected:

- tipos actualizados para `fotos_incidencia`
- vistas disponibles en `database.types.ts`
- `motivo_baja` visible en `movimientos_inventario`

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/ lib/supabase/database.types.ts
git commit -m "feat: preparar base de datos Sprint 5 para inventario e incidencias"
```

---

## Task 2: Hooks y validaciones del sprint

**Files:**

- Modify: `erp-vitrinas/lib/validations/inventario.ts`
- Create: `erp-vitrinas/lib/validations/incidencias.ts`
- Create: `erp-vitrinas/lib/hooks/useMovimientosInventario.ts`
- Create: `erp-vitrinas/lib/hooks/useInventarioValorizado.ts`
- Create: `erp-vitrinas/lib/hooks/useIncidencias.ts`
- Modify: `erp-vitrinas/lib/hooks/useInventarioCentral.ts`
- Modify: `erp-vitrinas/lib/hooks/useInventarioColaboradora.ts`

- [ ] **Step 1: Extender `inventario.ts` con schema de baja**

Agregar `bajaInventarioSchema` con:

- `origen_tipo`
- `origen_id` preprocess para `'' -> undefined`
- `producto_id`
- `cantidad`
- `motivo_baja`
- `notas`

Regla:

- `origen_id` requerido cuando `origen_tipo !== 'central'`

- [ ] **Step 2: Crear `incidencias.ts`**

Schemas mínimos:

- `crearIncidenciaSchema`
- `actualizarIncidenciaSchema`

Campos:

- `tipo`
- `descripcion`
- `responsable_id?`
- `estado?`
- `resolucion?`

Usar `z.preprocess` en selects opcionales.

- [ ] **Step 3: Crear `useMovimientosInventario.ts`**

Debe exponer:

- query historial desde `movimientos_inventario_detalle`
- filtros por `producto_id`, `vitrina_id`, `tipo`, fechas
- mutación `registrarBaja`

La mutación debe insertar:

```ts
{
  tipo: 'baja',
  direccion: 'salida',
  origen_tipo,
  origen_id: origen_tipo === 'central' ? null : origen_id,
  producto_id,
  cantidad,
  motivo_baja,
  notas,
  referencia_tipo: 'baja_manual',
  usuario_id: auth.user.id,
}
```

Invalidaciones requeridas:

- `['inventario_central']`
- `['inventario_colaboradora']`
- `['movimientos_inventario']`
- `['inventario_valorizado']`

- [ ] **Step 4: Crear `useInventarioValorizado.ts`**

Query simple a vista `inventario_valorizado`, con filtros client-side si ayudan a la UX.

Retornar además helpers derivados:

- total unidades
- total costo
- total venta
- margen potencial

- [ ] **Step 5: Crear `useIncidencias.ts`**

Debe exponer:

- `useIncidencias(filters)`
- `crearIncidencia`
- `actualizarIncidencia`

`useIncidencias` debe traer joins con:

- `puntos_de_venta(nombre_comercial)`
- `vitrinas(codigo)`
- `usuarios` para `responsable`
- `fotos_incidencia`

`crearIncidencia`:

- inserta row en `incidencias`
- luego sube fotos opcionales al bucket
- registra `fotos_incidencia`

`actualizarIncidencia`:

- cambia estado/resolución/responsable
- deja que el trigger SQL haga de guard rail final

- [ ] **Step 6: Ajustar invalidaciones de hooks existentes**

Cuando se creen entradas o transferencias, invalidar también:

- `['movimientos_inventario']`
- `['inventario_valorizado']`

- [ ] **Step 7: Commit**

```bash
git add lib/validations lib/hooks
git commit -m "feat: agregar hooks y validaciones de Sprint 5"
```

---

## Task 3: UI admin de inventario avanzado

**Files:**

- Modify: `erp-vitrinas/app/(admin)/admin/inventario/page.tsx`
- Create: `erp-vitrinas/components/admin/BajaInventarioSheet.tsx`
- Create: `erp-vitrinas/components/admin/MovimientosInventarioTab.tsx`
- Create: `erp-vitrinas/components/admin/InventarioValorizadoTab.tsx`

- [ ] **Step 1: Agregar CTA `Registrar baja` en `/admin/inventario`**

Regla UX:

- visible al menos en tabs `Central` y `Colaboradoras`
- si el diseño lo permite, dejarlo visible global al módulo para soportar bajas desde vitrina también

- [ ] **Step 2: Crear `BajaInventarioSheet`**

Campos:

- `origen_tipo`
- selector dinámico de origen:
  - nada extra si es `central`
  - colaboradora si es `colaboradora`
  - vitrina si es `vitrina`
- producto
- cantidad
- motivo de baja
- notas

Validaciones:

- cantidad > 0
- no exceder stock visible del origen cuando el dato ya esté en cliente
- dejar que DB siga siendo la fuente de verdad final

- [ ] **Step 3: Crear tab `Movimientos`**

Reutilizar `DataTable` + `SearchInput`.

Filtros mínimos:

- producto
- vitrina
- tipo
- fecha desde/hasta

Columnas mínimas:

- fecha
- producto
- tipo
- motivo
- origen
- destino
- cantidad
- usuario

- [ ] **Step 4: Crear tab `Valorizado`**

Contenido:

- 4 tarjetas KPI
- filtros por ubicación y producto
- tabla detallada por ubicación/producto

Evitar crear un módulo nuevo de reportes.

- [ ] **Step 5: Mantener consistencia visual**

Seguir el patrón actual de:

- `Tabs`
- `DataTable`
- `SearchInput`
- sheets con `SheetContent` y `Button` primario índigo

- [ ] **Step 6: Commit**

```bash
git add app/'(admin)'/admin/inventario/page.tsx components/admin
git commit -m "feat: extender modulo de inventario con bajas, historial y valorizado"
```

---

## Task 4: Captura de incidencias en campo

**Files:**

- Modify: `erp-vitrinas/app/(campo)/campo/visita/[id]/page.tsx`
- Modify: `erp-vitrinas/lib/hooks/useVisita.ts`
- Create: `erp-vitrinas/components/campo/IncidenciaSheet.tsx`
- Create: `erp-vitrinas/components/campo/VisitaIncidenciasButton.tsx`

- [ ] **Step 1: Mantener intacta la máquina de estados principal**

No agregar una nueva `EtapaVisita`. Sprint 4 ya está estable y no debe reestructurarse.

- [ ] **Step 2: Integrar CTA de incidencia**

Ubicación sugerida:

- debajo del header de la visita
- visible durante todo `VisitaEnEjecucionFlow`

El CTA muestra:

- label `Reportar incidencia`
- badge/counter con incidencias ya registradas en esa visita

- [ ] **Step 3: Crear `IncidenciaSheet`**

Campos:

- `tipo`
- `descripcion`
- `fotos` opcionales

Datos del contexto recibidos por props:

- `visita_id`
- `pdv_id`
- `vitrina_id`

Comportamiento:

- subir fotos a `fotos-visita/incidencias/{incidencia_id}/...`
- insertar `fotos_incidencia`
- toast en éxito
- cerrar sheet y conservar etapa actual

- [ ] **Step 4: Si hace falta, extender `useVisita`**

Opciones válidas:

1. Mantener incidencias en `useIncidencias({ visitaId })` desde el componente
2. O extender `useVisita` con array de incidencias relacionadas

Preferencia: opción 1 para no sobrecargar `useVisita` con otro dominio si no es necesario.

- [ ] **Step 5: Commit**

```bash
git add app/'(campo)'/campo/visita/[id]/page.tsx components/campo lib/hooks
git commit -m "feat: permitir registrar incidencias durante la visita"
```

---

## Task 5: UI admin de incidencias

**Files:**

- Create: `erp-vitrinas/app/(admin)/admin/incidencias/page.tsx`
- Create: `erp-vitrinas/components/admin/IncidenciasTable.tsx`
- Create: `erp-vitrinas/components/admin/IncidenciaDetalleSheet.tsx`
- Modify: `erp-vitrinas/components/admin/AppSidebar.tsx`

- [ ] **Step 1: Agregar item `Incidencias` al sidebar**

Usar icono `AlertTriangle` o similar.

Visibilidad recomendada:

- `admin`
- `supervisor`
- `analista`

- [ ] **Step 2: Crear `IncidenciasTable`**

Filtros:

- estado
- tipo
- PDV
- fecha desde/hasta
- antigüedad mínima

Columnas:

- apertura
- días abierta
- tipo
- PDV
- vitrina
- estado
- responsable
- fotos
- acción `Ver detalle`

- [ ] **Step 3: Crear `IncidenciaDetalleSheet`**

Debe permitir:

- ver descripción y fotos
- asignar responsable
- avanzar estado
- registrar resolución

Regla importante:

- UI no ofrece `cerrar` si no hay resolución
- aunque falle la UI, la DB debe seguir protegiendo

- [ ] **Step 4: Modo lectura para analista**

Si el rol actual es `analista`:

- deshabilitar botones de transición
- mantener detalle visible

- [ ] **Step 5: Commit**

```bash
git add app/'(admin)'/admin/incidencias components/admin/AppSidebar.tsx components/admin
git commit -m "feat: agregar gestion admin de incidencias"
```

---

## Task 6: Tests e2e + documentación viva

**Files:**

- Create: `erp-vitrinas/tests/sprint5.spec.ts`
- Modify: `CODEX_CONTEXT.md`
- Optionally modify after implementation: `SPRINTS.md`

- [ ] **Step 1: Crear `tests/sprint5.spec.ts`**

Casos mínimos:

1. Admin registra baja desde inventario y disminuye stock.
2. La baja aparece en historial con `motivo_baja`.
3. El tab valorizado refleja central + colaboradora + vitrina.
4. Colaboradora registra incidencia durante una visita en ejecución.
5. Admin no puede cerrar incidencia sin resolución.
6. Admin/supervisor completa `abierta -> en_analisis -> resuelta -> cerrada`.
7. Filtros de incidencias abiertas funcionan.

- [ ] **Step 2: Ejecutar checks**

```bash
cd erp-vitrinas
npm run type-check
npm run lint
npx playwright test tests/sprint4.spec.ts tests/sprint5.spec.ts
```

- [ ] **Step 3: Actualizar documentación**

Al cerrar implementación real:

- marcar S5-01 a S5-06 en `SPRINTS.md`
- añadir log con decisiones relevantes
- actualizar `CODEX_CONTEXT.md`

- [ ] **Step 4: Commit**

```bash
git add tests/sprint5.spec.ts CODEX_CONTEXT.md SPRINTS.md
git commit -m "test: cubrir sprint 5 y actualizar contexto del proyecto"
```

---

## Notas de implementación

- La numeración de migraciones debe continuar en `20260021+` porque Sprint 4 ya ocupa hasta `20260020`.
- No hacer llamadas directas a Supabase desde componentes; toda la data de Sprint 5 va en hooks.
- Mantener comentarios de negocio en español.
- Reutilizar `DataTable` aunque no tenga acciones built-in; agregar columna de acciones explícita si hace falta.
- Si la query de historial se vuelve compleja en PostgREST, preferir vista SQL antes que lógica client-side repetida.
- No introducir un módulo `/admin/reportes` solo para HU-28; el mejor encaje actual es `/admin/inventario`.
- En móvil, priorizar no romper el cierre de visita. La incidencia debe sentirse accesoria, no una nueva rama compleja del flujo.
