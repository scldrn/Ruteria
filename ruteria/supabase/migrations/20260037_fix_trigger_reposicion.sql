-- ============================================================
-- Parche: asegurar que actualizar_inventario() es SECURITY DEFINER
-- y preserva todos los casos incluyendo reposicion y colaboradora.
--
-- La función original en 20260007 ya tenía el caso 'reposicion'
-- correcto. 20260027 la marcó SECURITY DEFINER vía ALTER FUNCTION.
-- Este patch recrea la función completa como SECURITY DEFINER para
-- garantizar que la propiedad no se pierda en futuros reemplazos.
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta_central       INT := 0;
  delta_vitrina       INT := 0;
  delta_colaboradora  INT := 0;
  v_vitrina_id        UUID;
  v_colaboradora_id   UUID;
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
      ELSIF NEW.origen_tipo = 'colaboradora' THEN
        delta_colaboradora := -NEW.cantidad;
        v_colaboradora_id  := NEW.origen_id;
      ELSE
        delta_vitrina := -NEW.cantidad;
        v_vitrina_id  := NEW.origen_id;
      END IF;

    WHEN 'ajuste' THEN
      IF NEW.direccion = 'entrada' THEN
        IF NEW.origen_tipo = 'central' THEN
          delta_central := NEW.cantidad;
        ELSIF NEW.origen_tipo = 'colaboradora' THEN
          delta_colaboradora := NEW.cantidad;
          v_colaboradora_id  := NEW.origen_id;
        ELSE
          delta_vitrina := NEW.cantidad;
          v_vitrina_id  := NEW.origen_id;
        END IF;
      ELSE
        IF NEW.origen_tipo = 'central' THEN
          delta_central := -NEW.cantidad;
        ELSIF NEW.origen_tipo = 'colaboradora' THEN
          delta_colaboradora := -NEW.cantidad;
          v_colaboradora_id  := NEW.origen_id;
        ELSE
          delta_vitrina := -NEW.cantidad;
          v_vitrina_id  := NEW.origen_id;
        END IF;
      END IF;

    WHEN 'traslado_entre_vitrinas' THEN
      NULL; -- handled below

    WHEN 'carga_colaboradora' THEN
      delta_central      := -NEW.cantidad;
      delta_colaboradora :=  NEW.cantidad;
      v_colaboradora_id  := NEW.destino_id;

    WHEN 'reposicion' THEN
      -- Colaboradora repone stock en vitrina desde su propio inventario
      delta_colaboradora := -NEW.cantidad;
      delta_vitrina      :=  NEW.cantidad;
      v_colaboradora_id  := NEW.origen_id;
      v_vitrina_id       := NEW.destino_id;

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

  IF delta_colaboradora != 0 AND v_colaboradora_id IS NOT NULL THEN
    IF delta_colaboradora > 0 THEN
      INSERT INTO inventario_colaboradora (colaboradora_id, producto_id, cantidad_actual, updated_at)
      VALUES (v_colaboradora_id, NEW.producto_id, delta_colaboradora, now())
      ON CONFLICT (colaboradora_id, producto_id) DO UPDATE SET
        cantidad_actual = inventario_colaboradora.cantidad_actual + EXCLUDED.cantidad_actual,
        updated_at      = now();
    ELSE
      UPDATE inventario_colaboradora
      SET
        cantidad_actual = inventario_colaboradora.cantidad_actual + delta_colaboradora,
        updated_at      = now()
      WHERE colaboradora_id = v_colaboradora_id
        AND producto_id     = NEW.producto_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe inventario de colaboradora para producto %', NEW.producto_id;
      END IF;
    END IF;
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
$$;
