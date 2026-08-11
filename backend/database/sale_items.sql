create table public.sale_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  sale_id uuid null,
  product_id uuid null,
  product_name character varying(255) not null,
  qty integer not null,
  unit_price numeric(10, 2) not null,
  subtotal numeric(10, 2) not null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  stock_log_id uuid null,
  constraint sale_items_pkey primary key (id),
  constraint sale_items_product_id_fkey foreign KEY (product_id) references products (id) on delete set null,
  constraint sale_items_sale_id_fkey foreign KEY (sale_id) references sales (id) on delete CASCADE,
  constraint sale_items_stock_log_id_fkey foreign KEY (stock_log_id) references stock_logs (id) on delete set null,
  constraint sale_items_unit_price_check check ((unit_price > (0)::numeric)),
  constraint sale_items_subtotal_check check ((subtotal >= (0)::numeric)),
  constraint sale_items_qty_check check ((qty > 0))
) TABLESPACE pg_default;

create index IF not exists idx_sale_items_sale_id on public.sale_items using btree (sale_id) TABLESPACE pg_default;

create index IF not exists idx_sale_items_product_id on public.sale_items using btree (product_id) TABLESPACE pg_default;