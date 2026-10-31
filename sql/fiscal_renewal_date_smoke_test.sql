-- sql/fiscal_renewal_date_smoke_test.sql
-- TESTE SOMENTE LEITURA: cálculos hipotéticos; não consulta clientes reais.
-- Regra proposta: nova vigência = maior entre vigência atual e data do
-- pagamento + 1 mês; pagamentos tardios dependem de elegibilidade.
WITH scenarios(name, old_paid_until, paid_at, expected_paid_until) AS (
 VALUES
  ('antes do vencimento',
   '2026-11-24 16:39:00-03'::timestamptz,
   '2026-11-14 10:00:00-03'::timestamptz,
   '2026-12-24 16:39:00-03'::timestamptz),
  ('no dia do vencimento',
   '2026-11-24 16:39:00-03'::timestamptz,
   '2026-11-24 12:00:00-03'::timestamptz,
   '2026-12-24 16:39:00-03'::timestamptz),
  ('apos vencimento',
   '2026-11-24 16:39:00-03'::timestamptz,
   '2026-11-26 10:00:00-03'::timestamptz,
   '2026-12-26 10:00:00-03'::timestamptz)
)
SELECT name,
  (old_paid_until AT TIME ZONE 'America/Sao_Paulo')::text AS previous_expiration,
  (paid_at AT TIME ZONE 'America/Sao_Paulo')::text AS payment_time,
  (GREATEST(old_paid_until,paid_at)+INTERVAL '1 month'
    AT TIME ZONE 'America/Sao_Paulo')::text AS calculated_expiration,
  (GREATEST(old_paid_until,paid_at)+INTERVAL '1 month') = expected_paid_until AS passed
FROM scenarios;
