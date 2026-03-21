-- ============================================================
-- FUNCIÓN: set_updated_at
-- Actualiza updated_at automáticamente antes de cada UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas que tienen updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categorias','productos','proveedores',
    'zonas','puntos_de_venta','vitrinas','surtido_estandar',
    'usuarios','rutas','rutas_pdv',
    'visitas','detalle_visita','cobros',
    'incidencias','garantias','compras','detalle_compra'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- FUNCIÓN: calcular_unidades_vendidas
-- TRIGGER: BEFORE INSERT en detalle_visita
-- Calcula unidades_vendidas = MAX(inv_anterior - inv_actual, 0)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_unidades_vendidas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unidades_vendidas = GREATEST(NEW.inv_anterior - NEW.inv_actual, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calcular_unidades_vendidas
  BEFORE INSERT OR UPDATE OF inv_anterior, inv_actual ON detalle_visita
  FOR EACH ROW EXECUTE FUNCTION calcular_unidades_vendidas();

-- ============================================================
-- FUNCIÓN: actualizar_monto_calculado
-- TRIGGER: AFTER INSERT/UPDATE/DELETE en detalle_visita
-- Actualiza visitas.monto_calculado con la suma de subtotales
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_monto_calculado()
RETURNS TRIGGER AS $$
DECLARE
  v_id UUID;
BEGIN
  -- En DELETE, NEW es NULL; usamos OLD
  v_id = COALESCE(NEW.visita_id, OLD.visita_id);
  UPDATE visitas
  SET monto_calculado = COALESCE(
    (SELECT SUM(subtotal_cobro) FROM detalle_visita WHERE visita_id = v_id),
    0
  )
  WHERE id = v_id;
  RETURN NEW; -- RETURN en AFTER trigger es ignorado por PostgreSQL (seguro en DELETE)
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actualizar_monto_calculado
  AFTER INSERT OR UPDATE OR DELETE ON detalle_visita
  FOR EACH ROW EXECUTE FUNCTION actualizar_monto_calculado();

-- ============================================================
-- FUNCIÓN: validar_stock_no_negativo
-- TRIGGER: BEFORE INSERT en movimientos_inventario
-- Lanza excepción si el movimiento de salida dejaría stock < 0
-- ============================================================
CREATE OR REPLACE FUNCTION validar_stock_no_negativo()
RETURNS TRIGGER AS $$
DECLARE
  stock_actual INT := 0;
BEGIN
  IF NEW.direccion = 'salida' THEN
    IF NEW.origen_tipo = 'central' THEN
      SELECT COALESCE(cantidad_actual, 0) INTO stock_actual
      FROM inventario_central
      WHERE producto_id = NEW.producto_id;
    ELSIF NEW.origen_tipo = 'vitrina' THEN
      IF NEW.origen_id IS NULL THEN
        RAISE EXCEPTION 'origen_id requerido para salidas de vitrina';
      END IF;
      SELECT COALESCE(cantidad_actual, 0) INTO stock_actual
      FROM inventario_vitrina
      WHERE vitrina_id = NEW.origen_id AND producto_id = NEW.producto_id;
    ELSE
      RAISE EXCEPTION 'origen_tipo requerido para movimientos de salida. tipo: %', NEW.tipo;
    END IF;

    IF COALESCE(stock_actual, 0) - NEW.cantidad < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente: producto %, disponible %, solicitado %',
        NEW.producto_id, COALESCE(stock_actual, 0), NEW.cantidad;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_stock_no_negativo
  BEFORE INSERT ON movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION validar_stock_no_negativo();

-- ============================================================
-- FUNCIÓN: actualizar_inventario
-- TRIGGER: AFTER INSERT en movimientos_inventario
-- Actualiza las tablas de snapshot usando deltas explícitos por tipo.
-- Cada tipo de movimiento tiene deltas hardcodeados para evitar
-- ambigüedad entre la dirección global y el signo por tabla.
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_inventario()
RETURNS TRIGGER AS $$
DECLARE
  delta_central  INT := 0;
  delta_vitrina  INT := 0;
  v_vitrina_id   UUID;
BEGIN
  -- Calcular deltas explícitos según el tipo de movimiento
  CASE NEW.tipo
    WHEN 'compra' THEN
      delta_central := NEW.cantidad;                    -- + central

    WHEN 'traslado_a_vitrina' THEN
      delta_central := -NEW.cantidad;                   -- - central
      delta_vitrina :=  NEW.cantidad;                   -- + vitrina destino
      v_vitrina_id  := NEW.destino_id;

    WHEN 'venta' THEN
      delta_vitrina := -NEW.cantidad;                   -- - vitrina origen
      v_vitrina_id  := NEW.origen_id;

    WHEN 'devolucion_garantia' THEN
      delta_vitrina := -NEW.cantidad;                   -- - vitrina origen
      v_vitrina_id  := NEW.origen_id;

    WHEN 'baja' THEN
      IF NEW.origen_tipo = 'central' THEN
        delta_central := -NEW.cantidad;
      ELSE
        delta_vitrina := -NEW.cantidad;
        v_vitrina_id  := NEW.origen_id;
      END IF;

    WHEN 'ajuste' THEN
      IF NEW.direccion = 'entrada' THEN
        IF NEW.origen_tipo = 'central' THEN
          delta_central :=  NEW.cantidad;
        ELSE
          delta_vitrina :=  NEW.cantidad;
          v_vitrina_id  := NEW.origen_id;
        END IF;
      ELSE
        IF NEW.origen_tipo = 'central' THEN
          delta_central := -NEW.cantidad;
        ELSE
          delta_vitrina := -NEW.cantidad;
          v_vitrina_id  := NEW.origen_id;
        END IF;
      END IF;

    WHEN 'traslado_entre_vitrinas' THEN
      -- Manejado abajo con dos upserts separados
      NULL;

    ELSE
      NULL;
  END CASE;

  -- Upsert inventario_central
  IF delta_central != 0 THEN
    INSERT INTO inventario_central (producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (NEW.producto_id, delta_central, now())
    ON CONFLICT (producto_id) DO UPDATE SET
      cantidad_actual    = inventario_central.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();
  END IF;

  -- Upsert inventario_vitrina
  IF delta_vitrina != 0 AND v_vitrina_id IS NOT NULL THEN
    INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (v_vitrina_id, NEW.producto_id, delta_vitrina, now())
    ON CONFLICT (vitrina_id, producto_id) DO UPDATE SET
      cantidad_actual    = inventario_vitrina.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();
  END IF;

  -- traslado_entre_vitrinas: salida de origen + entrada a destino
  IF NEW.tipo = 'traslado_entre_vitrinas' THEN
    IF NEW.origen_id IS NULL OR NEW.destino_id IS NULL THEN
      RAISE EXCEPTION 'traslado_entre_vitrinas requiere origen_id y destino_id no nulos';
    END IF;
    INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (NEW.origen_id, NEW.producto_id, -NEW.cantidad, now())
    ON CONFLICT (vitrina_id, producto_id) DO UPDATE SET
      cantidad_actual    = inventario_vitrina.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();

    INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (NEW.destino_id, NEW.producto_id, NEW.cantidad, now())
    ON CONFLICT (vitrina_id, producto_id) DO UPDATE SET
      cantidad_actual    = inventario_vitrina.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actualizar_inventario
  AFTER INSERT ON movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION actualizar_inventario();

-- ============================================================
-- FUNCIÓN SQL: calcular_monto_visita (auxiliar para consultas ad-hoc)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_monto_visita(p_visita_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(subtotal_cobro), 0)
  FROM detalle_visita
  WHERE visita_id = p_visita_id;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- FUNCIÓN SQL: get_kpi_ventas
-- ============================================================
CREATE OR REPLACE FUNCTION get_kpi_ventas(fecha_inicio DATE, fecha_fin DATE)
RETURNS TABLE (
  ruta_id UUID,
  colaboradora_id UUID,
  pdv_id UUID,
  total_vendido DECIMAL,
  total_cobrado DECIMAL,
  visitas_completadas BIGINT
) AS $$
  SELECT
    v.ruta_id,
    v.colaboradora_id,
    v.pdv_id,
    COALESCE(dv_agg.total_vendido, 0) AS total_vendido,
    COALESCE(c.monto, 0)              AS total_cobrado,
    COUNT(v.id)                        AS visitas_completadas
  FROM visitas v
  LEFT JOIN (
    SELECT visita_id, SUM(subtotal_cobro) AS total_vendido
    FROM detalle_visita
    GROUP BY visita_id
  ) dv_agg ON dv_agg.visita_id = v.id
  LEFT JOIN cobros c ON c.visita_id = v.id
  WHERE v.estado = 'completada'
    AND v.fecha_hora_inicio::DATE BETWEEN fecha_inicio AND fecha_fin
  GROUP BY v.ruta_id, v.colaboradora_id, v.pdv_id, dv_agg.total_vendido, c.monto;
$$ LANGUAGE sql STABLE;
