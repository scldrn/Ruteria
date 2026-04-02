-- ============================================================
-- Production hardening:
-- 1. Narrow overly broad read policies and media access.
-- 2. Recreate analytics views with security_invoker.
-- 3. Make daily visit generation idempotent and concurrency-safe.
-- ============================================================

-- ------------------------------------------------------------
-- Authorization helpers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_backoffice_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_my_rol() IN ('admin', 'supervisor', 'analista', 'compras');
$$;

CREATE OR REPLACE FUNCTION can_access_route(p_ruta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      get_my_rol() IN ('admin', 'supervisor', 'analista')
      OR EXISTS (
        SELECT 1
        FROM rutas r
        WHERE r.id = p_ruta_id
          AND r.colaboradora_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION can_access_visita(p_visita_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      get_my_rol() IN ('admin', 'supervisor', 'analista')
      OR EXISTS (
        SELECT 1
        FROM visitas v
        WHERE v.id = p_visita_id
          AND v.colaboradora_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION can_access_pdv(p_pdv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      is_backoffice_role()
      OR EXISTS (
        SELECT 1
        FROM rutas r
        JOIN rutas_pdv rp
          ON rp.ruta_id = r.id
        WHERE rp.pdv_id = p_pdv_id
          AND r.colaboradora_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM visitas v
        WHERE v.pdv_id = p_pdv_id
          AND v.colaboradora_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION can_access_vitrina(p_vitrina_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      is_backoffice_role()
      OR EXISTS (
        SELECT 1
        FROM vitrinas vit
        WHERE vit.id = p_vitrina_id
          AND can_access_pdv(vit.pdv_id)
      )
      OR EXISTS (
        SELECT 1
        FROM visitas v
        WHERE v.vitrina_id = p_vitrina_id
          AND v.colaboradora_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION can_access_incidencia(p_incidencia_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      get_my_rol() IN ('admin', 'supervisor', 'analista', 'compras')
      OR EXISTS (
        SELECT 1
        FROM incidencias i
        LEFT JOIN visitas v
          ON v.id = i.visita_id
        WHERE i.id = p_incidencia_id
          AND (
            (i.visita_id IS NOT NULL AND v.colaboradora_id = auth.uid())
            OR (i.visita_id IS NULL AND can_access_pdv(i.pdv_id))
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION can_access_photo_object(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      get_my_rol() IN ('admin', 'supervisor', 'analista')
      OR EXISTS (
        SELECT 1
        FROM fotos_visita fv
        WHERE fv.url = p_object_name
          AND can_access_visita(fv.visita_id)
      )
      OR EXISTS (
        SELECT 1
        FROM fotos_incidencia fi
        WHERE fi.url = p_object_name
          AND can_access_incidencia(fi.incidencia_id)
      )
    );
$$;

REVOKE ALL ON FUNCTION is_backoffice_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_route(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_visita(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_pdv(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_vitrina(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_incidencia(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_photo_object(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION is_backoffice_role() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_route(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_visita(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_pdv(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_vitrina(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_incidencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_photo_object(text) TO authenticated;

-- ------------------------------------------------------------
-- Indexes that keep the new policies and helpers cheap
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rutas_pdv_pdv_id
  ON rutas_pdv(pdv_id);

CREATE INDEX IF NOT EXISTS idx_visitas_colaboradora_pdv
  ON visitas(colaboradora_id, pdv_id);

CREATE INDEX IF NOT EXISTS idx_fotos_visita_url
  ON fotos_visita(url);

CREATE INDEX IF NOT EXISTS idx_fotos_incidencia_url
  ON fotos_incidencia(url);

-- ------------------------------------------------------------
-- Narrow broad read policies and media policies
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "puntos_de_venta_select" ON puntos_de_venta;
CREATE POLICY "puntos_de_venta_select" ON puntos_de_venta
  FOR SELECT TO authenticated
  USING (can_access_pdv(id));

DROP POLICY IF EXISTS "vitrinas_select" ON vitrinas;
CREATE POLICY "vitrinas_select" ON vitrinas
  FOR SELECT TO authenticated
  USING (can_access_vitrina(id));

DROP POLICY IF EXISTS "surtido_estandar_select" ON surtido_estandar;
CREATE POLICY "surtido_estandar_select" ON surtido_estandar
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'supervisor', 'analista', 'compras')
    OR can_access_vitrina(vitrina_id)
  );

DROP POLICY IF EXISTS "rutas_pdv_select" ON rutas_pdv;
CREATE POLICY "rutas_pdv_select" ON rutas_pdv
  FOR SELECT TO authenticated
  USING (can_access_route(ruta_id));

DROP POLICY IF EXISTS "inv_vitrina_select" ON inventario_vitrina;
CREATE POLICY "inv_vitrina_select" ON inventario_vitrina
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'supervisor', 'analista', 'compras')
    OR can_access_vitrina(vitrina_id)
  );

DROP POLICY IF EXISTS "detalle_visita_insert" ON detalle_visita;
CREATE POLICY "detalle_visita_insert" ON detalle_visita
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'admin'
    OR can_access_visita(visita_id)
  );

DROP POLICY IF EXISTS "cobros_insert" ON cobros;
CREATE POLICY "cobros_insert" ON cobros
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'admin'
    OR (get_my_rol() = 'colaboradora' AND can_access_visita(visita_id))
  );

DROP POLICY IF EXISTS "fotos_select" ON fotos_visita;
CREATE POLICY "fotos_select" ON fotos_visita
  FOR SELECT TO authenticated
  USING (can_access_visita(visita_id));

DROP POLICY IF EXISTS "fotos_insert" ON fotos_visita;
CREATE POLICY "fotos_insert" ON fotos_visita
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() IN ('admin', 'supervisor')
    OR (get_my_rol() = 'colaboradora' AND can_access_visita(visita_id))
  );

DROP POLICY IF EXISTS "incidencias_select" ON incidencias;
CREATE POLICY "incidencias_select" ON incidencias
  FOR SELECT TO authenticated
  USING (can_access_incidencia(id));

DROP POLICY IF EXISTS "incidencias_insert" ON incidencias;
CREATE POLICY "incidencias_insert" ON incidencias
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() IN ('admin', 'supervisor')
    OR (
      get_my_rol() = 'colaboradora'
      AND (
        -- incidencia ligada a una visita: acceso a la visita implica acceso al PDV
        (visita_id IS NOT NULL AND can_access_visita(visita_id))
        -- incidencia directa sobre un PDV sin visita
        OR (visita_id IS NULL AND can_access_pdv(pdv_id))
      )
    )
  );

DROP POLICY IF EXISTS "garantias_insert" ON garantias;
CREATE POLICY "garantias_insert" ON garantias
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'admin'
    OR (
      get_my_rol() = 'colaboradora'
      AND visita_recepcion_id IS NOT NULL
      AND can_access_visita(visita_recepcion_id)
    )
  );

DROP POLICY IF EXISTS "fotos_incidencia_select" ON fotos_incidencia;
CREATE POLICY "fotos_incidencia_select" ON fotos_incidencia
  FOR SELECT TO authenticated
  USING (can_access_incidencia(incidencia_id));

DROP POLICY IF EXISTS "fotos_incidencia_insert" ON fotos_incidencia;
CREATE POLICY "fotos_incidencia_insert" ON fotos_incidencia
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() IN ('admin', 'supervisor')
    OR (
      get_my_rol() = 'colaboradora'
      AND can_access_incidencia(incidencia_id)
    )
  );

DROP POLICY IF EXISTS "fotos_visita_upload" ON storage.objects;
CREATE POLICY "fotos_visita_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-visita'
    AND (
      get_my_rol() IN ('admin', 'supervisor')
      OR (
        get_my_rol() = 'colaboradora'
        AND (
          name LIKE 'visitas/' || auth.uid()::text || '/%'
          OR name LIKE 'incidencias/' || auth.uid()::text || '/%'
        )
      )
    )
  );

DROP POLICY IF EXISTS "fotos_visita_read" ON storage.objects;
CREATE POLICY "fotos_visita_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fotos-visita'
    AND can_access_photo_object(name)
  );

DROP POLICY IF EXISTS "fotos_visita_delete" ON storage.objects;
CREATE POLICY "fotos_visita_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'fotos-visita'
    AND (
      get_my_rol() IN ('admin', 'supervisor')
      OR (
        get_my_rol() = 'colaboradora'
        AND can_access_photo_object(name)
      )
    )
  );

-- ------------------------------------------------------------
-- Analytics views must honor caller RLS
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_dashboard_hoy
WITH (security_invoker = true) AS
WITH fecha_operacion AS (
  SELECT (now() AT TIME ZONE 'America/Bogota')::date AS hoy
),
visitas_hoy AS (
  SELECT v.*
  FROM visitas v
  CROSS JOIN fecha_operacion fo
  WHERE COALESCE(
    (v.fecha_hora_inicio AT TIME ZONE 'America/Bogota')::date,
    (v.created_at AT TIME ZONE 'America/Bogota')::date
  ) = fo.hoy
)
SELECT
  COALESCE(
    (
      SELECT SUM(dv.subtotal_cobro)
      FROM visitas_hoy vh
      JOIN detalle_visita dv
        ON dv.visita_id = vh.id
      WHERE vh.estado = 'completada'
    ),
    0
  ) AS ventas_hoy,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM visitas_hoy
      WHERE estado = 'completada'
    ),
    0
  ) AS visitas_realizadas,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM visitas_hoy
    ),
    0
  ) AS visitas_planificadas,
  COALESCE(
    (
      SELECT SUM(c.monto)
      FROM cobros c
      WHERE date_trunc('month', c.fecha AT TIME ZONE 'America/Bogota')
        = date_trunc('month', now() AT TIME ZONE 'America/Bogota')
    ),
    0
  ) AS cobros_mes,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM incidencias i
      WHERE i.estado IN ('abierta', 'en_analisis')
    ),
    0
  ) AS incidencias_abiertas;

CREATE OR REPLACE VIEW v_incidencias_abiertas_recientes
WITH (security_invoker = true) AS
SELECT
  i.id AS incidencia_id,
  pdv.nombre_comercial AS pdv_nombre,
  i.tipo,
  i.fecha_apertura,
  EXTRACT(day FROM now() - i.fecha_apertura)::INT AS dias_abierta
FROM incidencias i
JOIN puntos_de_venta pdv
  ON pdv.id = i.pdv_id
WHERE i.estado IN ('abierta', 'en_analisis')
ORDER BY i.fecha_apertura DESC
LIMIT 5;

CREATE OR REPLACE VIEW v_stock_bajo
WITH (security_invoker = true) AS
SELECT
  iv.vitrina_id,
  iv.producto_id,
  iv.cantidad_actual AS stock_actual,
  se.cantidad_objetivo,
  ROUND((iv.cantidad_actual::numeric / se.cantidad_objetivo::numeric) * 100, 1) AS pct_stock,
  pdv.nombre_comercial AS pdv_nombre,
  p.nombre AS producto_nombre
FROM inventario_vitrina iv
JOIN surtido_estandar se
  ON se.vitrina_id = iv.vitrina_id
  AND se.producto_id = iv.producto_id
JOIN vitrinas vit
  ON vit.id = iv.vitrina_id
JOIN puntos_de_venta pdv
  ON pdv.id = vit.pdv_id
JOIN productos p
  ON p.id = iv.producto_id
WHERE
  se.cantidad_objetivo > 0
  AND (iv.cantidad_actual::numeric / se.cantidad_objetivo::numeric) < 0.30
ORDER BY pct_stock ASC, pdv.nombre_comercial, p.nombre;

CREATE OR REPLACE VIEW v_ventas_30_dias
WITH (security_invoker = true) AS
WITH fecha_operacion AS (
  SELECT (now() AT TIME ZONE 'America/Bogota')::date AS hoy
)
SELECT
  (v.fecha_hora_inicio AT TIME ZONE 'America/Bogota')::date AS fecha,
  COALESCE(SUM(dv.subtotal_cobro), 0) AS total_ventas
FROM visitas v
JOIN detalle_visita dv
  ON dv.visita_id = v.id
CROSS JOIN fecha_operacion fo
WHERE
  v.estado = 'completada'
  AND (v.fecha_hora_inicio AT TIME ZONE 'America/Bogota')::date BETWEEN (fo.hoy - 29) AND fo.hoy
GROUP BY (v.fecha_hora_inicio AT TIME ZONE 'America/Bogota')::date
ORDER BY fecha ASC;

CREATE OR REPLACE VIEW v_ventas_por_ruta_mes
WITH (security_invoker = true) AS
WITH mes_operacion AS (
  SELECT date_trunc('month', now() AT TIME ZONE 'America/Bogota')::date AS inicio_mes
)
SELECT
  COALESCE(r.nombre, 'Sin ruta') AS ruta,
  COALESCE(u.nombre, 'Sin colaboradora') AS colaboradora,
  COALESCE(SUM(dv.subtotal_cobro), 0) AS total_ventas
FROM visitas v
LEFT JOIN rutas r
  ON r.id = v.ruta_id
LEFT JOIN usuarios u
  ON u.id = v.colaboradora_id
JOIN detalle_visita dv
  ON dv.visita_id = v.id
CROSS JOIN mes_operacion mo
WHERE
  v.estado = 'completada'
  AND (v.fecha_hora_inicio AT TIME ZONE 'America/Bogota')::date >= mo.inicio_mes
GROUP BY COALESCE(r.nombre, 'Sin ruta'), COALESCE(u.nombre, 'Sin colaboradora')
ORDER BY total_ventas DESC, ruta, colaboradora;

CREATE OR REPLACE VIEW v_top_vitrinas_mes
WITH (security_invoker = true) AS
WITH mes_operacion AS (
  SELECT date_trunc('month', now() AT TIME ZONE 'America/Bogota')::date AS inicio_mes
)
SELECT
  vit.id AS vitrina_id,
  pdv.nombre_comercial AS pdv_nombre,
  COALESCE(SUM(dv.subtotal_cobro), 0) AS total_ventas
FROM visitas v
JOIN vitrinas vit
  ON vit.id = v.vitrina_id
JOIN puntos_de_venta pdv
  ON pdv.id = vit.pdv_id
JOIN detalle_visita dv
  ON dv.visita_id = v.id
CROSS JOIN mes_operacion mo
WHERE
  v.estado = 'completada'
  AND (v.fecha_hora_inicio AT TIME ZONE 'America/Bogota')::date >= mo.inicio_mes
GROUP BY vit.id, pdv.nombre_comercial
ORDER BY total_ventas DESC, pdv.nombre_comercial
LIMIT 10;

GRANT SELECT ON v_dashboard_hoy TO authenticated;
GRANT SELECT ON v_incidencias_abiertas_recientes TO authenticated;
GRANT SELECT ON v_stock_bajo TO authenticated;
GRANT SELECT ON v_ventas_30_dias TO authenticated;
GRANT SELECT ON v_ventas_por_ruta_mes TO authenticated;
GRANT SELECT ON v_top_vitrinas_mes TO authenticated;

-- ------------------------------------------------------------
-- Idempotent, concurrency-safe daily visit generation
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION business_weekday_es(p_target_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (ARRAY['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'])[
    EXTRACT(dow FROM p_target_date)::integer + 1
  ];
$$;

CREATE OR REPLACE FUNCTION ensure_daily_visits_for_user(
  p_colaboradora_id uuid,
  p_target_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_target_date date := COALESCE(
    p_target_date,
    (now() AT TIME ZONE 'America/Bogota')::date
  );
  v_weekday text := business_weekday_es(v_target_date);
BEGIN
  IF p_colaboradora_id IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('daily-visits:' || p_colaboradora_id::text || ':' || v_target_date::text)
  );

  WITH rutas_del_dia AS (
    SELECT
      r.id AS ruta_id,
      r.colaboradora_id,
      rp.pdv_id,
      (
        SELECT vit.id
        FROM vitrinas vit
        WHERE vit.pdv_id = rp.pdv_id
          AND vit.estado = 'activa'
        ORDER BY vit.created_at DESC, vit.id DESC
        LIMIT 1
      ) AS vitrina_id
    FROM rutas r
    JOIN rutas_pdv rp
      ON rp.ruta_id = r.id
    JOIN puntos_de_venta pdv
      ON pdv.id = rp.pdv_id
    WHERE r.estado = 'activa'
      AND pdv.activo = true
      AND r.colaboradora_id = p_colaboradora_id
      AND r.dias_visita @> ARRAY[v_weekday]
  ),
  inserted AS (
    INSERT INTO visitas (
      ruta_id,
      pdv_id,
      vitrina_id,
      colaboradora_id,
      estado
    )
    SELECT
      rd.ruta_id,
      rd.pdv_id,
      rd.vitrina_id,
      rd.colaboradora_id,
      'planificada'
    FROM rutas_del_dia rd
    WHERE rd.vitrina_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM visitas v
        WHERE v.colaboradora_id = rd.colaboradora_id
          AND v.pdv_id = rd.pdv_id
          AND (COALESCE(v.fecha_hora_inicio, v.created_at) AT TIME ZONE 'America/Bogota')::date = v_target_date
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted
  FROM inserted;

  RETURN COALESCE(v_inserted, 0);
END;
$$;

CREATE OR REPLACE FUNCTION ensure_today_visits_for_current_user()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF get_my_rol() <> 'colaboradora' THEN
    RETURN 0;
  END IF;

  RETURN ensure_daily_visits_for_user(
    v_user_id,
    (now() AT TIME ZONE 'America/Bogota')::date
  );
END;
$$;

CREATE OR REPLACE FUNCTION generar_visitas_diarias(
  p_target_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_date date := COALESCE(
    p_target_date,
    (now() AT TIME ZONE 'America/Bogota')::date
  );
  v_weekday text := business_weekday_es(v_target_date);
  v_created_total integer := 0;
  v_expected_total integer := 0;
  v_user record;
BEGIN
  SELECT COUNT(*)
  INTO v_expected_total
  FROM (
    SELECT DISTINCT
      r.colaboradora_id,
      rp.pdv_id
    FROM rutas r
    JOIN rutas_pdv rp
      ON rp.ruta_id = r.id
    JOIN puntos_de_venta pdv
      ON pdv.id = rp.pdv_id
    WHERE r.estado = 'activa'
      AND pdv.activo = true
      AND r.colaboradora_id IS NOT NULL
      AND r.dias_visita @> ARRAY[v_weekday]
  ) objetivo;

  FOR v_user IN
    SELECT DISTINCT r.colaboradora_id
    FROM rutas r
    WHERE r.estado = 'activa'
      AND r.colaboradora_id IS NOT NULL
      AND r.dias_visita @> ARRAY[v_weekday]
  LOOP
    v_created_total := v_created_total
      + ensure_daily_visits_for_user(v_user.colaboradora_id, v_target_date);
  END LOOP;

  RETURN jsonb_build_object(
    'fecha', v_target_date,
    'creadas', v_created_total,
    'omitidas', GREATEST(v_expected_total - v_created_total, 0),
    'errores', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION business_weekday_es(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION ensure_daily_visits_for_user(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION ensure_today_visits_for_current_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION generar_visitas_diarias(date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION business_weekday_es(date) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_today_visits_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION generar_visitas_diarias(date) TO service_role;
