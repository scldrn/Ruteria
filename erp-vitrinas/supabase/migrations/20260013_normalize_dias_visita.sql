UPDATE rutas
SET dias_visita = ARRAY(
  SELECT CASE LOWER(dia)
    WHEN 'lun' THEN 'lunes'
    WHEN 'mar' THEN 'martes'
    WHEN 'mie' THEN 'miercoles'
    WHEN 'mié' THEN 'miercoles'
    WHEN 'jue' THEN 'jueves'
    WHEN 'vie' THEN 'viernes'
    WHEN 'sab' THEN 'sabado'
    WHEN 'sáb' THEN 'sabado'
    WHEN 'dom' THEN 'domingo'
    ELSE LOWER(dia)
  END
  FROM unnest(COALESCE(rutas.dias_visita, ARRAY[]::TEXT[])) WITH ORDINALITY AS t(dia, ord)
  ORDER BY ord
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(COALESCE(rutas.dias_visita, ARRAY[]::TEXT[])) AS t(dia)
  WHERE LOWER(dia) IN ('lun', 'mar', 'mie', 'mié', 'jue', 'vie', 'sab', 'sáb', 'dom')
);
