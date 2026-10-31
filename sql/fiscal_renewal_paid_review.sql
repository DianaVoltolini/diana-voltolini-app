-- sql/fiscal_renewal_paid_review.sql
-- SOMENTE LEITURA. Sinaliza pedidos pagos sem mensalidade marcada como paga.
-- NÃO interpreta automaticamente o pagamento como direito de reativação.
SELECT
  i.id AS invoice_id,
  i.order_id,
  i.reference_month,
  i.status AS invoice_status,
  o.status AS order_status,
  i.amount_cents,
  s.status AS subscription_status,
  s.renewal_enabled,
  (s.cancellation_requested_at IS NOT NULL) AS cancellation_requested,
  s.paid_until
FROM public.fiscal_subscription_invoices i
JOIN public.orders o ON o.id = i.order_id
JOIN public.fiscal_subscriptions s ON s.id = i.subscription_id
JOIN public.products p ON p.id = o.product_id
WHERE p.code = 'ASSINATURA-FISCAL-001'
  AND o.status = 'paid'
  AND i.status <> 'paid'
ORDER BY i.reference_month DESC, i.created_at DESC;
