-- supabase/migrations/20261112_commerce_v2_student_delivery_planning.sql
-- Configuração administrativa isolada: NÃO altera entregas/checkout em produção.
ALTER TABLE public.commerce_v2_materials
  ADD COLUMN IF NOT EXISTS available_to_student boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.commerce_v2_materials.available_to_student IS
  'Material apto a ser selecionado para entrega; sozinho não libera arquivos a alunos.';

CREATE TABLE IF NOT EXISTS public.commerce_v2_product_materials (
  product_id uuid NOT NULL REFERENCES public.commerce_v2_products(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.commerce_v2_materials(id) ON DELETE RESTRICT,
  release_mode text NOT NULL CHECK (release_mode IN ('after_payment','scheduled')),
  release_date date,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id,material_id),
  CONSTRAINT commerce_v2_release_date_required CHECK (
    (release_mode='after_payment' AND release_date IS NULL) OR
    (release_mode='scheduled' AND release_date IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS commerce_v2_product_materials_product_idx
  ON public.commerce_v2_product_materials(product_id,display_order);
ALTER TABLE public.commerce_v2_product_materials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_v2_product_materials FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.commerce_v2_product_materials IS
 'Vínculos e datas planejadas na Torre V2; sem efeitos na entrega atual do cliente.';

-- Entrega futura: liberar somente se pedido pago, material disponível
-- e hoje (America/Sao_Paulo) >= release_date para agendados.
-- Encerrar no dia CIVIL final: data local do pagamento + 90 dias,
-- incluindo todo o último dia; bloquear a partir do dia seguinte.
