-- C-ENT.1.e — Permissões oficiais de criação/edição de cliente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_permission'::regtype
      AND enumlabel = 'comercial.cliente.criar'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.cliente.criar';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_permission'::regtype
      AND enumlabel = 'comercial.cliente.editar'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.cliente.editar';
  END IF;
END$$;