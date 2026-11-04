-- Notificação de novos conteúdos GRATUITOS do Blog, com deduplicação por conteúdo.
-- Aplicar após 20261103_marketing_manual_queue.sql.
-- Não realiza envios: somente habilita o enfileiramento quando o cron for ativado.
CREATE TABLE IF NOT EXISTS public.marketing_blog_notifications (
 article_id uuid PRIMARY KEY,
 send_id uuid UNIQUE REFERENCES public.marketing_manual_sends(id),
 status text NOT NULL CHECK (status IN ('enqueued','no_audience')),
 recipient_count integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_blog_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_blog_notifications FROM anon,authenticated;

-- Modelo técnico de referência; não é habilitado como auto_enabled.
-- Editar o modelo na Torre NÃO muda o corpo automático desta função, porque
-- o assunto e texto de cada notícia são compostos a partir do conteúdo publicado.
INSERT INTO public.marketing_email_templates (id,name,subject,body,kind,active)
VALUES (
 'b10b0000-0000-4000-8000-000000000001',
 'Aviso automático — Novo conteúdo do Blog',
 'Novo conteúdo gratuito no Blog Fiscal',
 'Aviso de novos conteúdos gratuitos — modelo gerenciado pelo sistema.',
 'manual',true
) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enqueue_marketing_blog_notification(
 p_article_id uuid, p_send_id uuid
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 v_article public.fiscal_articles%ROWTYPE;
 v_count integer;
 v_template_id uuid := 'b10b0000-0000-4000-8000-000000000001';
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Operacao nao autorizada';
 END IF;
 PERFORM pg_advisory_xact_lock(719184,202611);
 IF EXISTS (SELECT 1 FROM public.marketing_blog_notifications WHERE article_id=p_article_id) THEN
   RETURN 0;
 END IF;
 SELECT * INTO v_article FROM public.fiscal_articles
 WHERE id=p_article_id AND status='published' AND visibility='public'
   AND delivery_type='geral' AND published_at IS NOT NULL;
 IF NOT FOUND THEN RETURN 0; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.marketing_email_templates WHERE id=v_template_id AND active=true) THEN
   RAISE EXCEPTION 'Modelo de avisos do Blog indisponivel';
 END IF;
 CREATE TEMP TABLE IF NOT EXISTS _blog_notice_audience(email text,name text) ON COMMIT DROP;
 TRUNCATE TABLE _blog_notice_audience;
 INSERT INTO _blog_notice_audience(email,name)
 SELECT DISTINCT ON (x.email) x.email,x.name FROM (
   SELECT lower(btrim(email)) AS email, name FROM public.marketing_leads
   WHERE newsletter_opt_in=true
   UNION ALL
   SELECT lower(btrim(email)) AS email,name FROM public.marketing_newsletter_subscribers
   WHERE newsletter_opt_in=true
 ) x
 WHERE x.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 AND NOT EXISTS (
  SELECT 1 FROM public.marketing_email_unsubscribes u WHERE lower(btrim(u.email))=x.email
 )
 ORDER BY x.email, x.name NULLS LAST;
 SELECT count(*) INTO v_count FROM _blog_notice_audience;
 IF v_count > 5000 THEN RAISE EXCEPTION 'Publico maior que o limite de seguranca'; END IF;
 IF v_count=0 THEN
  INSERT INTO public.marketing_blog_notifications(article_id,status,recipient_count)
  VALUES (p_article_id,'no_audience',0);
  RETURN 0;
 END IF;
 INSERT INTO public.marketing_manual_sends
 (id,template_id,description,recipient_count,status,subject_snapshot,body_snapshot,cta_url_snapshot,cta_label_snapshot)
 VALUES (
   p_send_id,v_template_id,'Blog gratuito — '||left(v_article.title,200),v_count,'processing',
   'Novo conteúdo no Blog Fiscal: '||v_article.title,
   'Olá, {{nome}}!'||E'\n\n'||
   'Publiquei um novo conteúdo gratuito no Blog Fiscal:'||E'\n\n'||
   v_article.title||E'\n\n'||
   coalesce(v_article.summary,'')||E'\n\n'||
   'Espero que seja útil na sua rotina de faturamento.'||E'\n\n'||
   'Diana Voltolini',
   'https://dianavoltolini.com.br/blog/'||v_article.slug,
   'Ler conteúdo gratuito'
 );
 INSERT INTO public.marketing_manual_send_recipients(send_id,email,lead_name,status)
 SELECT p_send_id,email,nullif(btrim(name),''),'pending' FROM _blog_notice_audience;
 INSERT INTO public.marketing_blog_notifications(article_id,send_id,status,recipient_count)
 VALUES (p_article_id,p_send_id,'enqueued',v_count);
 RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_marketing_blog_notification(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_marketing_blog_notification(uuid,uuid) TO service_role;
