-- sql/fiscal_renewal_readiness_audit.sql
-- AUDITORIA SOMENTE LEITURA: executar primeiro em HOMOLOGAÇÃO.
-- NÃO altera dados, não executa migrations nem chama o Bling.
-- Resultado "presente" NÃO comprova testes de pagamento ou segurança da implantação.

-- 1. Objetos indispensáveis
SELECT 'table' AS type, item,
       CASE WHEN pg_catalog.to_regclass('public.' || item) IS NOT NULL
            THEN 'present' ELSE 'missing' END AS status
FROM (VALUES ('orders'),('payments'),('products'),('fiscal_subscriptions'),
             ('fiscal_subscription_invoices'),('fiscal_bling_issuance_claims')) AS t(item)
UNION ALL
SELECT 'function', item,
       CASE WHEN pg_catalog.to_regprocedure('public.' || item) IS NOT NULL
            THEN 'present' ELSE 'missing' END
FROM (VALUES ('reserve_fiscal_renewal(uuid,uuid)'),
             ('claim_fiscal_bling_issuance(uuid,uuid)'),
             ('activate_fiscal_paid_renewal()'),
             ('activate_fiscal_first_purchase()')) AS t(item)
ORDER BY type,item;

-- 2. Triggers ativos e respectivos eventos na tabela orders
SELECT t.tgname AS trigger_name,
       p.proname AS function_name,
       t.tgenabled AS enabled_mode,
       pg_catalog.pg_get_triggerdef(t.oid) AS definition
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
WHERE n.nspname='public' AND c.relname='orders' AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 3. Colunas essenciais e nullability, para revisar conflitos com o código
SELECT table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('orders','payments','products','fiscal_subscriptions',
                     'fiscal_subscription_invoices','fiscal_bling_issuance_claims')
  AND column_name IN (
    'id','order_id','invoice_id','subscription_id','user_id','product_id',
    'status','metadata','reference_month','paid_until','renewal_enabled',
    'cancellation_requested_at','payment_provider','provider_order_id',
    'provider_payment_id','amount_cents','due_date','checkout_key','state')
ORDER BY table_name,column_name;

-- 4. Unicidade, FKs e CHECKs existentes. Conferir nomes e definições.
SELECT c.conrelid::regclass::text AS table_name,c.conname AS name,
       c.contype AS type,pg_catalog.pg_get_constraintdef(c.oid) AS definition
FROM pg_catalog.pg_constraint c
WHERE c.connamespace='public'::regnamespace
  AND c.conrelid IN (
    'public.orders'::regclass,'public.payments'::regclass,
    'public.fiscal_subscriptions'::regclass,
    'public.fiscal_subscription_invoices'::regclass)
ORDER BY table_name,name;

SELECT t.relname AS table_name,i.relname AS index_name,
       pg_catalog.pg_get_indexdef(ix.indexrelid) AS definition
FROM pg_catalog.pg_index ix
JOIN pg_catalog.pg_class t ON t.oid=ix.indrelid
JOIN pg_catalog.pg_class i ON i.oid=ix.indexrelid
JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public'
  AND t.relname IN ('orders','payments','fiscal_subscription_invoices',
                    'fiscal_bling_issuance_claims')
ORDER BY table_name,index_name;

-- 5. Permissões e RLS da tabela de claims, caso ela exista
SELECT tablename,rowsecurity AS rls_enabled,forcerowsecurity AS rls_forced
FROM pg_catalog.pg_tables pt
JOIN pg_catalog.pg_class pc ON pc.relname=pt.tablename
JOIN pg_catalog.pg_namespace pn ON pn.oid=pc.relnamespace
WHERE pt.schemaname='public' AND pn.nspname='public'
  AND tablename='fiscal_bling_issuance_claims';

-- ATENÇÃO: a execução bem-sucedida deste diagnóstico NÃO libera
-- integração Bling. Próximo passo: testes transacionais em ambiente isolado,
-- incluindo falhas externas e repetição do pagamento.
