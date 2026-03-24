DROP POLICY IF EXISTS "inv_col_select" ON inventario_colaboradora;

CREATE POLICY "inv_col_select" ON inventario_colaboradora
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'supervisor', 'analista', 'compras')
    OR colaboradora_id = auth.uid()
  );
