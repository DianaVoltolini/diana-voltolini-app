-- sql/auditoria_programacao_turmas_futuro_20261113.sql
-- REGISTRO FUTURO; não altera pagamentos, páginas, produtos ou entregas.
-- Pode ser executado novamente sem duplicar tarefa/checklist.
BEGIN;
INSERT INTO public.torre_audit_tasks
  (area,title,description,priority,status,notes)
SELECT
  'Área Comercial',
  'Automatizar programação de turmas, inscrições e atualização da página de vendas',
  'Evolução FUTURA, fora do escopo do lançamento atual. Permitir um produto e uma página de vendas com várias datas de aula; administrar inscrições por turma, data/horário, link e encerramento; a página mostra automaticamente a próxima turma aberta e encerra vendas quando não houver turma elegível. Materiais: liberação após pagamento, N dias ANTES da aula ou NO DIA da aula; compras após a data de liberação recebem os materiais vencidos imediatamente após confirmação do pagamento, dentro do prazo de acesso. Preservar vínculo histórico da compra com sua turma. Definir comportamento da página sem turmas (informativa sem checkout ou retirada) antes de implementar.',
  'baixa','pendente',
  'ADIADO deliberadamente para viabilizar a primeira venda com uma turma única em 21/01/2027. Não bloquear lançamento. Não implementar alterações automáticas de páginas, checkout ou acessos sem homologação específica.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.torre_audit_tasks
  WHERE area='Área Comercial'
    AND title='Automatizar programação de turmas, inscrições e atualização da página de vendas'
);

INSERT INTO public.torre_audit_checklist(task_id,title)
SELECT t.id,x.title
FROM public.torre_audit_tasks t
CROSS JOIN (VALUES
  ('Cadastrar várias datas e horários por produto sem duplicar o produto'),
  ('Associar cada inscrição e pagamento à turma contratada'),
  ('Atualizar página pública com a próxima turma elegível para inscrições'),
  ('Encerrar automaticamente inscrições ao atingir o prazo da turma'),
  ('Programar liberação de materiais após pagamento, antes ou no dia da aula'),
  ('Preservar direitos de compradores antigos e definir página sem turmas'),
  ('Homologar troca de turma, pagamento tardio, cancelamento e expiração')
) AS x(title)
WHERE t.area='Área Comercial'
  AND t.title='Automatizar programação de turmas, inscrições e atualização da página de vendas'
  AND NOT EXISTS (
    SELECT 1 FROM public.torre_audit_checklist c
    WHERE c.task_id=t.id AND c.title=x.title
  );
COMMIT;

SELECT t.area,t.title,t.priority,t.status,
       count(c.id) AS etapas
FROM public.torre_audit_tasks t
LEFT JOIN public.torre_audit_checklist c ON c.task_id=t.id
WHERE t.area='Área Comercial'
  AND t.title='Automatizar programação de turmas, inscrições e atualização da página de vendas'
GROUP BY t.id,t.area,t.title,t.priority,t.status;
