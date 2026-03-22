-- Política UPDATE necesaria para upsert (INSERT ... ON CONFLICT DO UPDATE).
-- Restringe a la colaboradora dueña de la visita padre, o admin.
CREATE POLICY "detalle_visita_update" ON detalle_visita
  FOR UPDATE TO authenticated
  USING (
    get_my_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = detalle_visita.visita_id
        AND v.colaboradora_id = auth.uid()
    )
  )
  WITH CHECK (
    get_my_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.id = detalle_visita.visita_id
        AND v.colaboradora_id = auth.uid()
    )
  );
