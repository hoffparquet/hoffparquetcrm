-- Hoff Parquet CRM — migration 2: invoices
-- Run this in the Neon SQL Editor. Safe to re-run — every statement only
-- creates or fills in something if it isn't already there.

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  number text not null default '',
  type text not null default 'products',           -- 'products' or 'installation' only
  date_issued text not null default '',
  date_of_supply text not null default '',
  due_date text not null default '',
  items jsonb not null default '[]'::jsonb,
  apply_vat boolean not null default false,
  vat_rate numeric not null default 20,
  terms text not null default '',
  notes text not null default '',
  status text not null default 'unpaid',
  paid_date text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoices_client_id_idx on invoices(client_id);

-- Add invoice numbering and bank details to the existing settings row,
-- without touching anything already saved there (company name, address, etc.).
update app_settings
set data =
  data
  || jsonb_build_object('nextInvoiceNumber', coalesce(data->'nextInvoiceNumber', to_jsonb(1)))
  || jsonb_build_object(
       'company',
       coalesce(data->'company', '{}'::jsonb)
       || jsonb_build_object(
            'bankName', coalesce(data->'company'->>'bankName', ''),
            'accountName', coalesce(data->'company'->>'accountName', ''),
            'sortCode', coalesce(data->'company'->>'sortCode', ''),
            'accountNumber', coalesce(data->'company'->>'accountNumber', '')
          )
     )
where id = 1;
