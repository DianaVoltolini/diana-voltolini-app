-- supabase/migrations/20261113_commerce_v2_customer_delivery_bridge.sql
-- Ponte EXPLÍCITA do catálogo V2 para o produto real comprado.
-- Nada é publicado automaticamente: liberação padrão FALSE.
ALTER TABLE public.commerce_v2_products
  ADD COLUMN IF NOT EXISTS sales_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_delivery_active boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS commerce_v2_products_sales_product_unique
  ON public.commerce_v2_products(sales_product_id)
  WHERE sales_product_id IS NOT NULL;

ALTER TABLE public.commerce_v2_products
  ADD CONSTRAINT commerce_v2_active_requires_sales_product
  CHECK (NOT student_delivery_active OR sales_product_id IS NOT NULL);

COMMENT ON COLUMN public.commerce_v2_products.sales_product_id IS
  'Produto de venda real em public.products; vínculo explícito feito na Torre';
COMMENT ON COLUMN public.commerce_v2_products.student_delivery_active IS
  'Somente TRUE habilita a leitura segura da programação V2 na Área do Cliente';

-- Toda entrega ainda exige pedido com status paid e paid_at,
-- vínculo produto↔material, flag disponível, material não arquivado,
-- data de liberação vencida e prazo de 90 dias civis válido.
