-- ============================================================
-- FUNCIÓN HELPER: get_my_rol()
-- Lee el rol del usuario autenticado desde public.usuarios
-- SECURITY DEFINER + SET search_path previene search path injection
-- STABLE permite al planner cachear el resultado por transacción
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS TEXT AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- Habilitar RLS en todas las tablas
-- ============================================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos_de_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitrinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE surtido_estandar ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas_pdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_vitrina ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_compra ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS: productos, categorias, zonas, proveedores
-- (todos los autenticados leen; solo admin escribe)
-- ============================================================
CREATE POLICY "productos_select" ON productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos_write"  ON productos FOR ALL   TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "categorias_select" ON categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias_write"  ON categorias FOR ALL   TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "zonas_select" ON zonas FOR SELECT TO authenticated USING (true);
CREATE POLICY "zonas_write"  ON zonas FOR ALL   TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "proveedores_select" ON proveedores FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin','compras','analista','supervisor'));
CREATE POLICY "proveedores_write" ON proveedores FOR ALL TO authenticated
  USING (get_my_rol() IN ('admin','compras')) WITH CHECK (get_my_rol() IN ('admin','compras'));

CREATE POLICY "puntos_de_venta_select" ON puntos_de_venta FOR SELECT TO authenticated USING (true);
CREATE POLICY "puntos_de_venta_write"  ON puntos_de_venta FOR ALL   TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "vitrinas_select" ON vitrinas FOR SELECT TO authenticated USING (true);
CREATE POLICY "vitrinas_write"  ON vitrinas FOR ALL   TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "surtido_estandar_select" ON surtido_estandar FOR SELECT TO authenticated USING (true);
CREATE POLICY "surtido_estandar_write"  ON surtido_estandar FOR ALL   TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

-- ============================================================
-- POLÍTICAS: usuarios (solo admin hace CRUD)
-- ============================================================
CREATE POLICY "usuarios_admin" ON usuarios FOR ALL TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

-- ============================================================
-- POLÍTICAS: rutas y rutas_pdv
-- ============================================================
CREATE POLICY "rutas_select" ON rutas FOR SELECT TO authenticated
  USING (colaboradora_id = auth.uid() OR get_my_rol() IN ('admin','supervisor','analista'));
CREATE POLICY "rutas_write" ON rutas FOR ALL TO authenticated
  USING (get_my_rol() IN ('admin','supervisor')) WITH CHECK (get_my_rol() IN ('admin','supervisor'));

CREATE POLICY "rutas_pdv_select" ON rutas_pdv FOR SELECT TO authenticated USING (true);
CREATE POLICY "rutas_pdv_write"  ON rutas_pdv FOR ALL   TO authenticated
  USING (get_my_rol() IN ('admin','supervisor')) WITH CHECK (get_my_rol() IN ('admin','supervisor'));

-- ============================================================
-- POLÍTICAS: inventario_central
-- (dos políticas separadas: una para read, otra para write)
-- ============================================================
CREATE POLICY "inv_central_select" ON inventario_central FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin','compras','supervisor','analista'));
CREATE POLICY "inv_central_write" ON inventario_central FOR ALL TO authenticated
  USING (get_my_rol() IN ('admin','compras')) WITH CHECK (get_my_rol() IN ('admin','compras'));

-- ============================================================
-- POLÍTICAS: inventario_vitrina
-- ============================================================
CREATE POLICY "inv_vitrina_select" ON inventario_vitrina FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_vitrina_write"  ON inventario_vitrina FOR ALL TO authenticated
  USING (get_my_rol() IN ('admin','compras')) WITH CHECK (get_my_rol() IN ('admin','compras'));

-- ============================================================
-- POLÍTICAS: movimientos_inventario
-- ============================================================
CREATE POLICY "mov_inv_select" ON movimientos_inventario FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin','supervisor','analista','compras'));
CREATE POLICY "mov_inv_insert" ON movimientos_inventario FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('admin','colaboradora','compras'));

-- ============================================================
-- POLÍTICAS: visitas
-- ============================================================
CREATE POLICY "visitas_select" ON visitas FOR SELECT TO authenticated
  USING (colaboradora_id = auth.uid() OR get_my_rol() IN ('admin','supervisor','analista'));
CREATE POLICY "visitas_insert" ON visitas FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() = 'colaboradora' AND colaboradora_id = auth.uid());
CREATE POLICY "visitas_update" ON visitas FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin','supervisor') OR
    (get_my_rol() = 'colaboradora' AND colaboradora_id = auth.uid()))
  WITH CHECK (get_my_rol() IN ('admin','supervisor') OR
    (get_my_rol() = 'colaboradora' AND colaboradora_id = auth.uid()));

-- ============================================================
-- POLÍTICAS: detalle_visita
-- ============================================================
CREATE POLICY "detalle_visita_select" ON detalle_visita FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = visita_id
        AND (v.colaboradora_id = auth.uid() OR get_my_rol() IN ('admin','supervisor','analista'))
    )
  );
CREATE POLICY "detalle_visita_insert" ON detalle_visita FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('colaboradora','admin'));

-- ============================================================
-- POLÍTICAS: cobros
-- ============================================================
CREATE POLICY "cobros_select" ON cobros FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin','supervisor','analista') OR
    EXISTS (SELECT 1 FROM visitas v WHERE v.id = visita_id AND v.colaboradora_id = auth.uid())
  );
CREATE POLICY "cobros_insert" ON cobros FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('colaboradora','admin'));
CREATE POLICY "cobros_update" ON cobros FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin','supervisor'))
  WITH CHECK (get_my_rol() IN ('admin','supervisor'));

-- ============================================================
-- POLÍTICAS: fotos_visita
-- ============================================================
CREATE POLICY "fotos_select" ON fotos_visita FOR SELECT TO authenticated USING (true);
CREATE POLICY "fotos_insert" ON fotos_visita FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('colaboradora','admin'));

-- ============================================================
-- POLÍTICAS: incidencias
-- ============================================================
CREATE POLICY "incidencias_select" ON incidencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "incidencias_insert" ON incidencias FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('colaboradora','admin','supervisor'));
CREATE POLICY "incidencias_update" ON incidencias FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin','supervisor'))
  WITH CHECK (get_my_rol() IN ('admin','supervisor'));

-- ============================================================
-- POLÍTICAS: garantias
-- ============================================================
CREATE POLICY "garantias_select" ON garantias FOR SELECT TO authenticated USING (true);
CREATE POLICY "garantias_insert" ON garantias FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('colaboradora','admin'));
CREATE POLICY "garantias_update" ON garantias FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin','supervisor'))
  WITH CHECK (get_my_rol() IN ('admin','supervisor'));

-- ============================================================
-- POLÍTICAS: compras y detalle_compra
-- ============================================================
CREATE POLICY "compras_select" ON compras FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin','compras','analista','supervisor'));
CREATE POLICY "compras_write" ON compras FOR ALL TO authenticated
  USING (get_my_rol() IN ('admin','compras')) WITH CHECK (get_my_rol() IN ('admin','compras'));

CREATE POLICY "detalle_compra_select" ON detalle_compra FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin','compras','analista','supervisor'));
CREATE POLICY "detalle_compra_write" ON detalle_compra FOR ALL TO authenticated
  USING (get_my_rol() IN ('admin','compras')) WITH CHECK (get_my_rol() IN ('admin','compras'));

-- ============================================================
-- POLÍTICAS: Storage (bucket fotos-visita)
-- ============================================================
CREATE POLICY "fotos_visita_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-visita' AND get_my_rol() IN ('colaboradora','admin'));

CREATE POLICY "fotos_visita_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-visita' AND
    get_my_rol() IN ('admin','supervisor','analista','colaboradora'));
