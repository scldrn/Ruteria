-- ============================================================
-- RPC crear_compra: inserción atómica de cabecera + líneas
-- Resuelve hallazgo M-02: rollback manual no-atómico
-- ============================================================

CREATE OR REPLACE FUNCTION crear_compra(
  p_proveedor_id    UUID,
  p_fecha           DATE,
  p_notas           TEXT,
  p_total_estimado  NUMERIC,
  p_created_by      UUID,
  p_lineas          JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compra_id UUID;
  v_linea     JSONB;
BEGIN
  -- Verificar que el llamador tiene rol autorizado
  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
      AND rol IN ('admin', 'compras')
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'No autorizado para crear compras';
  END IF;

  -- Validar que hay al menos una línea
  IF jsonb_array_length(p_lineas) < 1 THEN
    RAISE EXCEPTION 'La compra debe tener al menos una línea de detalle';
  END IF;

  -- Insertar cabecera
  INSERT INTO compras (proveedor_id, fecha, estado, notas, total_estimado, created_by)
  VALUES (p_proveedor_id, p_fecha, 'pendiente', p_notas, p_total_estimado, p_created_by)
  RETURNING id INTO v_compra_id;

  -- Insertar líneas (atómico con la cabecera — si falla aquí, todo hace rollback)
  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    INSERT INTO detalle_compra (
      compra_id,
      producto_id,
      cantidad_pedida,
      costo_unitario,
      created_by
    ) VALUES (
      v_compra_id,
      (v_linea->>'producto_id')::UUID,
      (v_linea->>'cantidad_pedida')::INTEGER,
      NULLIF(v_linea->>'costo_unitario', '')::NUMERIC,
      p_created_by
    );
  END LOOP;

  RETURN v_compra_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_compra(UUID, DATE, TEXT, NUMERIC, UUID, JSONB) TO authenticated;
