CREATE TABLE fotos_incidencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidencia_id UUID NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX fotos_incidencia_incidencia_id_idx
  ON fotos_incidencia (incidencia_id);

ALTER TABLE fotos_incidencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fotos_incidencia_select" ON fotos_incidencia
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "fotos_incidencia_insert" ON fotos_incidencia
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('colaboradora', 'admin', 'supervisor'));

CREATE POLICY "fotos_incidencia_delete" ON fotos_incidencia
  FOR DELETE TO authenticated
  USING (get_my_rol() IN ('admin', 'supervisor'));

DROP POLICY IF EXISTS "fotos_visita_upload" ON storage.objects;

CREATE POLICY "fotos_visita_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-visita'
    AND get_my_rol() IN ('colaboradora', 'admin', 'supervisor')
  );
