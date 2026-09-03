-- Hoff Parquet CRM — migration 3: order sheets
-- Run this in the Neon SQL Editor. Safe to re-run.

create table if not exists order_sheets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  number text not null default '',
  date_created text not null default '',
  target_date text not null default '',
  items jsonb not null default '[]'::jsonb,     -- [{ id, description, quantity, unit }] — no pricing fields at all
  notes text not null default '',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists order_sheets_client_id_idx on order_sheets(client_id);

update app_settings
set data = data || jsonb_build_object('nextOrderNumber', coalesce(data->'nextOrderNumber', to_jsonb(1)))
where id = 1;
