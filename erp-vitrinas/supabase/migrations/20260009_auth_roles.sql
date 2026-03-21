-- ============================================================
-- TRIGGER: on_auth_user_created
-- Al registrar un usuario en auth.users, crea su registro en
-- public.usuarios con rol 'colaboradora' por defecto y sincroniza
-- el rol a app_metadata para que el middleware lo lea del JWT.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    'colaboradora',  -- rol por defecto; el admin lo cambia manualmente
    true
    -- created_by omitido intencionalmente: NULL porque no existe un creador previo
  );

  -- Sincronizar rol a app_metadata para lectura sin-DB en el middleware JWT
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('rol', 'colaboradora')
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: on_usuario_rol_changed
-- Al cambiar public.usuarios.rol, sincroniza el nuevo valor a
-- app_metadata. El cambio se refleja en el JWT al próximo refresh
-- de token (comportamiento estándar de Supabase Auth).
-- ============================================================
CREATE OR REPLACE FUNCTION sync_rol_to_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('rol', NEW.rol)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_usuario_rol_changed
  AFTER UPDATE OF rol ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION sync_rol_to_app_metadata();
