CREATE TABLE sync_operaciones_visita (
  client_sync_id UUID PRIMARY KEY,
  visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('close')),
  payload_hash TEXT,
  procesado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

ALTER TABLE sync_operaciones_visita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_operaciones_visita_select" ON sync_operaciones_visita
  FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin', 'supervisor', 'analista'));

CREATE OR REPLACE FUNCTION cerrar_visita_core(
  p_visita_id UUID,
  p_cobro JSONB,
  p_reposiciones JSONB DEFAULT '[]'::jsonb
) RETURNS void AS $$
DECLARE
  v_visita RECORD;
  v_detalle RECORD;
  v_reposicion JSONB;
  v_producto_id UUID;
  v_unidades_repuestas INT;
  v_monto_calculado DECIMAL(12,2);
  v_monto_cobrado DECIMAL(12,2);
  v_forma_pago_id UUID;
  v_notas TEXT;
  v_estado_cobro TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF COALESCE(jsonb_typeof(p_reposiciones), 'array') <> 'array' THEN
    RAISE EXCEPTION 'Las reposiciones deben enviarse como un arreglo JSON';
  END IF;

  SELECT id, estado, colaboradora_id, vitrina_id
  INTO v_visita
  FROM visitas
  WHERE id = p_visita_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visita no encontrada';
  END IF;

  IF v_visita.estado <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La visita no esta en ejecucion';
  END IF;

  IF get_my_rol() <> 'admin' AND v_visita.colaboradora_id <> auth.uid() THEN
    RAISE EXCEPTION 'No autorizado para cerrar esta visita';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM detalle_visita
    WHERE visita_id = p_visita_id
  ) THEN
    RAISE EXCEPTION 'No se ha guardado el conteo de la visita';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM fotos_visita
    WHERE visita_id = p_visita_id
      AND COALESCE(tipo, 'despues') = 'despues'
  ) THEN
    RAISE EXCEPTION 'Debes registrar al menos una foto final de la vitrina antes de cerrar la visita';
  END IF;

  v_monto_calculado := calcular_monto_visita(p_visita_id);
  v_monto_cobrado := (p_cobro->>'monto')::DECIMAL(12,2);
  v_forma_pago_id := (p_cobro->>'forma_pago_id')::UUID;
  v_notas := NULLIF(BTRIM(COALESCE(p_cobro->>'notas', '')), '');

  IF v_monto_cobrado IS NULL THEN
    RAISE EXCEPTION 'El monto cobrado es obligatorio';
  END IF;

  IF v_forma_pago_id IS NULL THEN
    RAISE EXCEPTION 'La forma de pago es obligatoria';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM formas_pago
    WHERE id = v_forma_pago_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'La forma de pago seleccionada no esta disponible';
  END IF;

  v_estado_cobro := CASE
    WHEN v_monto_cobrado = v_monto_calculado THEN 'registrado'
    ELSE 'discrepancia'
  END;

  IF v_estado_cobro = 'discrepancia' AND v_notas IS NULL THEN
    RAISE EXCEPTION 'Nota obligatoria cuando el monto cobrado difiere del calculado';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT (item->>'producto_id')::UUID AS producto_id, COUNT(*) AS total
      FROM jsonb_array_elements(p_reposiciones) AS item
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) duplicados
  ) THEN
    RAISE EXCEPTION 'No se permiten productos duplicados en las reposiciones';
  END IF;

  UPDATE detalle_visita
  SET unidades_repuestas = 0
  WHERE visita_id = p_visita_id;

  FOR v_detalle IN
    SELECT producto_id, unidades_vendidas
    FROM detalle_visita
    WHERE visita_id = p_visita_id
      AND unidades_vendidas > 0
  LOOP
    INSERT INTO movimientos_inventario (
      tipo,
      direccion,
      origen_tipo,
      origen_id,
      producto_id,
      cantidad,
      referencia_tipo,
      referencia_id,
      usuario_id,
      notas
    ) VALUES (
      'venta',
      'salida',
      'vitrina',
      v_visita.vitrina_id,
      v_detalle.producto_id,
      v_detalle.unidades_vendidas,
      'visita',
      p_visita_id,
      auth.uid(),
      'Salida por venta al cerrar visita'
    );
  END LOOP;

  FOR v_reposicion IN
    SELECT value
    FROM jsonb_array_elements(p_reposiciones)
  LOOP
    v_producto_id := (v_reposicion->>'producto_id')::UUID;
    v_unidades_repuestas := COALESCE((v_reposicion->>'unidades_repuestas')::INT, 0);

    IF v_producto_id IS NULL THEN
      RAISE EXCEPTION 'Cada reposicion debe incluir producto_id';
    END IF;

    IF v_unidades_repuestas < 0 THEN
      RAISE EXCEPTION 'Las unidades repuestas no pueden ser negativas';
    END IF;

    UPDATE detalle_visita
    SET unidades_repuestas = v_unidades_repuestas
    WHERE visita_id = p_visita_id
      AND producto_id = v_producto_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El producto % no pertenece a la visita', v_producto_id;
    END IF;

    IF v_unidades_repuestas > 0 THEN
      INSERT INTO movimientos_inventario (
        tipo,
        direccion,
        origen_tipo,
        origen_id,
        destino_tipo,
        destino_id,
        producto_id,
        cantidad,
        referencia_tipo,
        referencia_id,
        usuario_id,
        notas
      ) VALUES (
        'reposicion',
        'salida',
        'colaboradora',
        v_visita.colaboradora_id,
        'vitrina',
        v_visita.vitrina_id,
        v_producto_id,
        v_unidades_repuestas,
        'visita',
        p_visita_id,
        auth.uid(),
        'Reposicion al cerrar visita'
      );
    END IF;
  END LOOP;

  INSERT INTO cobros (
    visita_id,
    monto,
    forma_pago_id,
    estado,
    notas,
    created_by
  ) VALUES (
    p_visita_id,
    v_monto_cobrado,
    v_forma_pago_id,
    v_estado_cobro,
    v_notas,
    auth.uid()
  );

  UPDATE visitas
  SET
    estado = 'completada',
    fecha_hora_fin = now(),
    monto_calculado = v_monto_calculado,
    monto_cobrado = v_monto_cobrado,
    notas = v_notas,
    updated_at = now()
  WHERE id = p_visita_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION cerrar_visita(
  p_visita_id UUID,
  p_cobro JSONB,
  p_reposiciones JSONB DEFAULT '[]'::jsonb
) RETURNS void AS $$
BEGIN
  PERFORM cerrar_visita_core(p_visita_id, p_cobro, p_reposiciones);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION cerrar_visita_offline(
  p_visita_id UUID,
  p_cobro JSONB,
  p_reposiciones JSONB DEFAULT '[]'::jsonb,
  p_client_sync_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_existing RECORD;
  v_payload_hash TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_client_sync_id IS NULL THEN
    RAISE EXCEPTION 'client_sync_id es obligatorio';
  END IF;

  v_payload_hash := md5(COALESCE(p_cobro::text, '') || '|' || COALESCE(p_reposiciones::text, ''));

  PERFORM pg_advisory_xact_lock(hashtext(p_client_sync_id::text));

  SELECT visita_id, payload_hash
  INTO v_existing
  FROM sync_operaciones_visita
  WHERE client_sync_id = p_client_sync_id;

  IF FOUND THEN
    IF v_existing.visita_id <> p_visita_id THEN
      RAISE EXCEPTION 'client_sync_id ya fue usado para otra visita';
    END IF;

    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION 'client_sync_id ya fue usado con un payload diferente';
    END IF;

    RETURN;
  END IF;

  PERFORM cerrar_visita_core(p_visita_id, p_cobro, p_reposiciones);

  INSERT INTO sync_operaciones_visita (
    client_sync_id,
    visita_id,
    tipo,
    payload_hash,
    created_by
  ) VALUES (
    p_client_sync_id,
    p_visita_id,
    'close',
    v_payload_hash,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION cerrar_visita_core(UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cerrar_visita(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cerrar_visita_offline(UUID, JSONB, JSONB, UUID) TO authenticated;
