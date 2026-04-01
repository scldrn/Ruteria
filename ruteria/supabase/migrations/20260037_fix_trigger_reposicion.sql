-- ============================================================
-- Parche: añadir caso 'reposicion' al trigger actualizar_inventario
--
-- Bug: la reposición decrementaba inventario_colaboradora (trigger en
-- 20260018) pero NO incrementaba inventario_vitrina (ELSE NULL en 20260007).
-- Resultado: stock de vitrina incorrecto tras cada reposición.
--
-- Fix: recrear actualizar_inventario() con el caso 'reposicion' añadido.
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_inventario()
RETURNS TRIGGER AS $$
DECLARE
  delta_central  INT := 0;
  delta_vitrina  INT := 0;
  v_vitrina_id   UUID;
BEGIN
  CASE NEW.tipo
    WHEN 'compra' THEN
      delta_central := NEW.cantidad;

    WHEN 'traslado_a_vitrina' THEN
      delta_central := -NEW.cantidad;
      delta_vitrina :=  NEW.cantidad;
      v_vitrina_id  := NEW.destino_id;

    WHEN 'venta' THEN
      delta_vitrina := -NEW.cantidad;
      v_vitrina_id  := NEW.origen_id;

    WHEN 'devolucion_garantia' THEN
      delta_vitrina := -NEW.cantidad;
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
      NULL;

    WHEN 'reposicion' THEN
      -- Colaboradora repone stock en vitrina: incrementar inventario_vitrina
      delta_vitrina := NEW.cantidad;
      v_vitrina_id  := NEW.destino_id;

    ELSE
      NULL;
  END CASE;

  IF delta_central != 0 THEN
    INSERT INTO inventario_central (producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (NEW.producto_id, delta_central, now())
    ON CONFLICT (producto_id) DO UPDATE SET
      cantidad_actual     = inventario_central.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();
  END IF;

  IF delta_vitrina != 0 AND v_vitrina_id IS NOT NULL THEN
    INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (v_vitrina_id, NEW.producto_id, delta_vitrina, now())
    ON CONFLICT (vitrina_id, producto_id) DO UPDATE SET
      cantidad_actual     = inventario_vitrina.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();
  END IF;

  IF NEW.tipo = 'traslado_entre_vitrinas' THEN
    IF NEW.origen_id IS NULL OR NEW.destino_id IS NULL THEN
      RAISE EXCEPTION 'traslado_entre_vitrinas requiere origen_id y destino_id no nulos';
    END IF;
    INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (NEW.origen_id, NEW.producto_id, -NEW.cantidad, now())
    ON CONFLICT (vitrina_id, producto_id) DO UPDATE SET
      cantidad_actual     = inventario_vitrina.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();

    INSERT INTO inventario_vitrina (vitrina_id, producto_id, cantidad_actual, fecha_actualizacion)
    VALUES (NEW.destino_id, NEW.producto_id, NEW.cantidad, now())
    ON CONFLICT (vitrina_id, producto_id) DO UPDATE SET
      cantidad_actual     = inventario_vitrina.cantidad_actual + EXCLUDED.cantidad_actual,
      fecha_actualizacion = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
