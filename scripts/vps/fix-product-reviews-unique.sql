-- Ensure one review per order line product (not one review per order).
-- Safe to run multiple times.

ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_unique_order_client;

ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_unique_order_product_client;

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_unique_order_product_client
  UNIQUE (order_id, product_slug, client_id);
