# Sprint 5 Design — Inventario Avanzado + Incidencias

**Fecha:** 2026-03-23
**Sprint:** 5
**HUs cubiertas:** HU-26, HU-27, HU-28, HU-29, HU-30, HU-31
**Tareas SPRINTS.md:** S5-01 a S5-06

---

## Contexto

Sprint 4 dejó completo el flujo operativo principal de visita: conteo, cobro, reposición, fotos y cierre transaccional. El siguiente bloque natural es fortalecer la trazabilidad operativa en dos frentes:

1. **Inventario avanzado:** bajas auditadas, historial de movimientos y valorización total del inventario.
2. **Incidencias:** registro en campo durante la visita y gestión administrativa de su ciclo de vida.

La base de datos ya tiene piezas útiles:

- `movimientos_inventario` como fuente inmutable de cambios
- `inventario_central`, `inventario_vitrina` e `inventario_colaboradora` como snapshots denormalizados
- `incidencias` como tabla base creada en Fase 0

Lo que falta en Sprint 5 no es el dominio conceptual, sino la capa de producto: reglas faltantes en SQL, vistas/consultas enriquecidas, hooks, UI móvil para captura y UI admin para seguimiento.

---

## Decisiones de diseño

1. **Inventario sigue viviendo en `/admin/inventario`:** No se crea un módulo nuevo de reportes para HU-26/27/28. La página existente crece de 2 tabs a 4: `Central`, `Colaboradoras`, `Movimientos` y `Valorizado`.

2. **La baja sigue siendo `tipo = 'baja'`:** No se crean nuevos tipos de movimiento. Para distinguir la causa se agrega `motivo_baja` estructurado (`robo | perdida | dano`) en `movimientos_inventario`. `notas` queda como contexto libre adicional.

3. **La baja puede salir de cualquier snapshot operativo:** El flujo admin soporta `origen_tipo = 'central' | 'vitrina' | 'colaboradora'`. Eso evita parches posteriores para pérdidas detectadas en campo y aprovecha el modelo ya extendido en Sprint 4.

4. **Historial vía vista SQL enriquecida:** En vez de resolver nombres de producto, ubicación y usuario con joins client-side en cada render, se crea una vista `movimientos_inventario_detalle` pensada para PostgREST. Expone etiquetas de origen/destino, producto, usuario, motivo y timestamps.

5. **Valorización vía vista SQL unificada:** Se crea una vista `inventario_valorizado` con `UNION ALL` sobre inventario central, de colaboradora y de vitrina. Así el frontend consume un solo dataset para tabla, filtros y KPIs.

6. **Registro de incidencia sin romper el stepper de visita:** La captura de incidencias no se vuelve una etapa nueva del flujo `/campo/visita/[id]`. Se integra como una acción secundaria persistente durante `en_ejecucion`, abriendo un sheet/modal no bloqueante. La colaboradora puede reportar una incidencia en cualquier momento y volver a la etapa actual.

7. **Fotos de incidencia en tabla propia, bucket compartido:** Se crea `fotos_incidencia`, pero se reutiliza el bucket existente `fotos-visita` con rutas `incidencias/{incidencia_id}/...`. Así no se duplica infraestructura ni políticas de storage innecesariamente.

8. **Ciclo de vida de incidencia validado en base de datos:** No basta con validación en cliente. Se agrega trigger para asegurar transiciones válidas (`abierta -> en_analisis -> resuelta -> cerrada`) y exigir `resolucion` al pasar a `resuelta` o `cerrada`. `fecha_cierre` se completa automáticamente al cerrar.

9. **Admin de incidencias en ruta dedicada:** Se crea `/admin/incidencias` con filtros por estado, tipo, PDV, fecha y antigüedad. Admin y supervisor pueden actualizar; analista puede entrar en modo lectura.

10. **No reutilizar stubs viejos como base arquitectónica:** `lib/hooks/useInventario.ts` y `lib/validations/visitas.ts` siguen siendo stubs históricos. Sprint 5 se apoya en hooks específicos por dominio y en nuevos schemas dedicados.

---

## Esquema de datos

### Extensión de `movimientos_inventario`

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

Semántica esperada para bajas manuales:

- `tipo = 'baja'`
- `direccion = 'salida'`
- `origen_tipo` obligatorio
- `origen_id` obligatorio cuando el origen sea `vitrina` o `colaboradora`
- `referencia_tipo = 'baja_manual'`
- `usuario_id = auth.uid()`

### Vista `movimientos_inventario_detalle`

La vista expone, como mínimo:

- ids base del movimiento
- `producto_id`, `producto_codigo`, `producto_nombre`
- `tipo`, `motivo_baja`, `cantidad`, `direccion`
- `origen_tipo`, `origen_id`, `origen_label`
- `destino_tipo`, `destino_id`, `destino_label`
- `usuario_id`, `usuario_nombre`
- `referencia_tipo`, `referencia_id`, `notas`
- `created_at`

Regla de etiquetado:

- `central` -> `"Bodega central"`
- `colaboradora` -> nombre de la colaboradora
- `vitrina` -> `"VIT-001 · Nombre PDV"`

### Vista `inventario_valorizado`

Dataset unificado con columnas:

- `ubicacion_tipo`: `central | colaboradora | vitrina`
- `ubicacion_id`
- `ubicacion_nombre`
- `producto_id`, `producto_codigo`, `producto_nombre`
- `cantidad_actual`
- `costo_unitario_ref`
- `precio_venta_ref`
- `valor_costo_total`
- `valor_venta_total`
- `updated_at`

Reglas de cálculo:

- Central usa `inventario_central.costo_promedio` y, si es null, fallback a `productos.costo_compra`
- Vitrina/colaboradora usan `productos.costo_compra` como costo de referencia
- Precio de venta siempre usa `productos.precio_venta_comercio`

### Tabla nueva `fotos_incidencia`

```sql
CREATE TABLE fotos_incidencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidencia_id UUID NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);
```

### Reglas adicionales sobre `incidencias`

No se reemplaza la tabla existente; se fortalece:

- `descripcion` obligatoria a nivel de UX y validación
- transición de estado validada por trigger
- `resolucion` obligatoria para `resuelta` y `cerrada`
- `fecha_cierre = now()` al cerrar

Pseudológica del trigger:

```sql
IF OLD.estado = NEW.estado THEN
  RETURN NEW;
END IF;

-- Solo permitir un paso adelante por actualización
-- abierta -> en_analisis -> resuelta -> cerrada

IF NEW.estado = 'resuelta' AND trim(COALESCE(NEW.resolucion, '')) = '' THEN
  RAISE EXCEPTION 'La resolucion es obligatoria para resolver una incidencia';
END IF;

IF NEW.estado = 'cerrada' AND trim(COALESCE(NEW.resolucion, '')) = '' THEN
  RAISE EXCEPTION 'La resolucion es obligatoria para cerrar una incidencia';
END IF;
```

---

## Flujo admin — `/admin/inventario`

### Tab `Central`

Se mantiene la funcionalidad actual:

- registrar entrada por compra
- búsqueda por nombre/código
- filtro por categoría

Se agrega CTA secundaria:

- `Registrar baja`

### Tab `Colaboradoras`

Se mantiene:

- listado de stock por colaboradora/producto
- transferencia desde central

Desde Sprint 5 también se podrá iniciar una baja desde stock de colaboradora.

### Tab `Movimientos`

Nueva tabla con filtros:

- producto
- vitrina
- tipo de movimiento
- rango de fechas

Columnas:

- fecha
- producto
- tipo
- motivo de baja
- origen
- destino
- cantidad
- usuario
- referencia/notas

### Tab `Valorizado`

Nueva vista de reporte con:

- KPI: unidades totales
- KPI: valor total a costo
- KPI: valor total a venta
- KPI: diferencia potencial
- tabla por ubicación y producto
- filtros por `ubicacion_tipo`, ubicación específica y producto

---

## Flujo campo — `/campo/visita/[id]`

### Acción nueva: `Reportar incidencia`

Disponible solo cuando `visita.estado === 'en_ejecucion'`.

Comportamiento:

- botón secundario persistente en el flujo
- abre `IncidenciaSheet`
- no cambia `etapa`
- al guardar: crea incidencia, sube fotos opcionales, muestra toast y regresa a la etapa actual

### `IncidenciaSheet`

Campos:

- `tipo`
- `descripcion`
- `fotos` opcionales

Datos ocultos/autocompletados:

- `visita_id`
- `pdv_id`
- `vitrina_id`
- `created_by`
- `estado = 'abierta'`

UX:

- puede abrirse varias veces durante la misma visita
- muestra contador de incidencias registradas en la visita actual
- no bloquea el cierre de la visita

---

## Flujo admin — `/admin/incidencias`

### Tabla principal

Filtros:

- estado (default: abiertas y en análisis)
- tipo
- PDV
- fecha apertura
- antigüedad mínima (`dias_abierta >= N`)

Columnas:

- fecha apertura
- días abierta
- tipo
- PDV
- vitrina
- creada por
- estado
- responsable
- indicador de fotos

### Sheet de detalle / gestión

Muestra:

- contexto de la visita
- descripción
- fotos
- estado actual
- responsable
- resolución

Acciones:

- pasar a `en_analisis`
- pasar a `resuelta` con resolución obligatoria
- pasar a `cerrada`

Para `analista`:

- solo lectura

---

## Migraciones esperadas

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `20260021_movimientos_baja_motivo.sql` | `motivo_baja` + checks de baja |
| 2 | `20260022_movimientos_historial_view.sql` | Vista `movimientos_inventario_detalle` |
| 3 | `20260023_inventario_valorizado_view.sql` | Vista `inventario_valorizado` |
| 4 | `20260024_fotos_incidencia.sql` | Tabla `fotos_incidencia` + RLS |
| 5 | `20260025_incidencias_workflow.sql` | Trigger de transiciones, resolución obligatoria y `fecha_cierre` |

---

## Hooks y componentes nuevos

### Hooks

- `useMovimientosInventario()`
- `useRegistrarBajaInventario()`
- `useInventarioValorizado()`
- `useIncidencias()`
- `useCrearIncidencia()`
- `useActualizarIncidencia()`

### Validaciones

- `lib/validations/incidencias.ts`
- Extensión de `lib/validations/inventario.ts` con `bajaInventarioSchema`

### Componentes admin

- `BajaInventarioSheet`
- `MovimientosInventarioTab`
- `InventarioValorizadoTab`
- `IncidenciasTable`
- `IncidenciaDetalleSheet`

### Componentes campo

- `IncidenciaSheet`
- `VisitaIncidenciasButton`

---

## Testing esperado

### Playwright

1. Admin registra baja en inventario y el stock disminuye sin borrar historial.
2. Historial de movimientos refleja una baja con motivo correcto.
3. Reporte valorizado incluye central, vitrina y colaboradora.
4. Colaboradora registra incidencia durante visita.
5. Admin/supervisor no puede cerrar incidencia sin resolución.
6. Listado de incidencias abiertas filtra por tipo/PDV/fecha y muestra antigüedad.

### Riesgos a vigilar

- joins genéricos de `movimientos_inventario` al resolver etiquetas de origen/destino
- paths de storage para fotos de incidencia compartiendo bucket con fotos de visita
- invalidaciones de cache entre inventario, visita e incidencias
- no romper el flujo móvil ya estable de Sprint 4
