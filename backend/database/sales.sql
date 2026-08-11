create table public.sales (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  user_name character varying(255) not null,
  total numeric(10, 2) not null,
  date timestamp with time zone null default timezone ('Asia/Manila'::text, now()),
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint sales_pkey primary key (id),
  constraint sales_user_id_fkey foreign KEY (user_id) references users (id) on delete set null,
  constraint sales_total_check check ((total >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_sales_user_id on public.sales using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_sales_date on public.sales using btree (date) TABLESPACE pg_default;