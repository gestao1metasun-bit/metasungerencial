-- C-ENT.1.d Comercial Enterprise — Permissão de visualização de Clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'comercial.cliente.visualizar'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.cliente.visualizar';
  END IF;
END $$;

-- Commit do enum precisa estar em transação isolada antes do INSERT abaixo,
-- mas migrations Supabase rodam como um único batch; usamos um pequeno wrapper
-- via execução posterior.
