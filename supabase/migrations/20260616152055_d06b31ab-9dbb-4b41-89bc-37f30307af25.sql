-- Grants
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('admin_master','comercial.projeto.visualizar'),
  ('admin_master','comercial.projeto.editar_cadastro'),
  ('admin_geral','comercial.projeto.visualizar'),
  ('admin_geral','comercial.projeto.editar_cadastro'),
  ('usuario','comercial.projeto.visualizar')
ON CONFLICT (role, permission) DO NOTHING;

-- Trigger: registra evento de timeline ao criar projeto vinculado a contrato
CREATE OR REPLACE FUNCTION public.tg_projeto_evento_criado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contrato_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.eventos_timeline
        (objeto_tipo, objeto_id, evento_tipo, titulo, descricao, usuario_id, payload)
      VALUES
        ('projeto', NEW.id, 'PROJETO_CRIADO',
         'Projeto criado',
         'Projeto criado a partir do contrato.',
         auth.uid(),
         jsonb_build_object(
           'contrato_id', NEW.contrato_id,
           'cliente_id', NEW.cliente_id,
           'codigo', NEW.codigo,
           'tipo', NEW.tipo
         ));
    EXCEPTION WHEN OTHERS THEN
      -- nunca bloquear a criação do projeto por causa do log
      NULL;
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_projeto_evento_criado ON public.projetos;
CREATE TRIGGER trg_projeto_evento_criado
  AFTER INSERT ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_projeto_evento_criado();