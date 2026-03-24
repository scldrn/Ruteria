CREATE OR REPLACE FUNCTION validar_transicion_incidencia()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.estado = OLD.estado THEN
    RETURN NEW;
  END IF;

  IF OLD.estado = 'cerrada' THEN
    RAISE EXCEPTION 'Una incidencia cerrada no puede modificarse de estado';
  END IF;

  IF OLD.estado = 'abierta' AND NEW.estado <> 'en_analisis' THEN
    RAISE EXCEPTION 'Transicion invalida: abierta solo puede pasar a en_analisis';
  END IF;

  IF OLD.estado = 'en_analisis' AND NEW.estado <> 'resuelta' THEN
    RAISE EXCEPTION 'Transicion invalida: en_analisis solo puede pasar a resuelta';
  END IF;

  IF OLD.estado = 'resuelta' AND NEW.estado <> 'cerrada' THEN
    RAISE EXCEPTION 'Transicion invalida: resuelta solo puede pasar a cerrada';
  END IF;

  IF NEW.estado IN ('resuelta', 'cerrada')
     AND NULLIF(BTRIM(COALESCE(NEW.resolucion, '')), '') IS NULL THEN
    RAISE EXCEPTION 'La resolucion es obligatoria para resolver o cerrar una incidencia';
  END IF;

  IF NEW.estado = 'cerrada' AND NEW.fecha_cierre IS NULL THEN
    NEW.fecha_cierre := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validar_transicion_incidencia ON incidencias;

CREATE TRIGGER validar_transicion_incidencia
  BEFORE UPDATE ON incidencias
  FOR EACH ROW
  EXECUTE FUNCTION validar_transicion_incidencia();
