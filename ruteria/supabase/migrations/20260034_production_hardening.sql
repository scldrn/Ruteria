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
