-- ============================================================
-- Revocación de sesiones activas al cambiar rol o desactivar usuario
--
-- Problema: el JWT anterior permanecía válido hasta 1h después de
-- un cambio de rol o desactivación, permitiendo al usuario ver
-- la UI incorrecta (routing por JWT). RLS corregía el acceso a datos,
-- pero la UX era engañosa y podía confundirse en auditorías.
--
-- Fix: al cambiar rol o desactivar, eliminar sesiones activas en
-- auth.sessions para forzar re-login inmediato.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_rol_to_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar el rol en app_metadata del JWT
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('rol', NEW.rol)
  WHERE id = NEW.id;

  -- Revocar sesiones activas cuando el rol cambia o el usuario se desactiva
  -- para forzar re-login inmediato (elimina el lag de hasta 1h del JWT)
  IF OLD.rol IS DISTINCT FROM NEW.rol
     OR (OLD.activo = true AND NEW.activo = false)
  THEN
    DELETE FROM auth.sessions WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Actualizar el trigger para que también reaccione a cambios en activo
DROP TRIGGER IF EXISTS on_usuario_rol_changed ON public.usuarios;

CREATE TRIGGER on_usuario_rol_changed
  AFTER UPDATE OF rol, activo ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION sync_rol_to_app_metadata();
