-- Hoff Parquet CRM — database schema
-- Run this once in the Neon SQL Editor before first deploy.
-- Safe to re-run: every statement only creates something if it doesn't exist yet.

create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled enquiry',
  company_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  project_type text not null default '',
  wood_species text not null default '',
  area_sqm text not null default '',
  rooms text not null default '',
  source text not null default '',
  estimate_value text not null default '',
  deposit_amount text not null default '',
  paid_in_full boolean not null default false,
  installation_date text not null default '',
  stage text not null default 'new_lead',
  dates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  note_date text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists notes_client_id_idx on notes(client_id);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  number text not null default '',
  date_created text not null default '',
  valid_until text not null default '',
  items jsonb not null default '[]'::jsonb,
  apply_vat boolean not null default false,
  vat_rate numeric not null default 20,
  terms text not null default '',
  notes text not null default '',
  scope text not null default 'products',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quotes_client_id_idx on quotes(client_id);

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

-- Single-row table holding company/letterhead info and the next quote number.
create table if not exists app_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  constraint app_settings_singleton check (id = 1)
);

insert into app_settings (id, data)
values (1, '{
  "nextQuoteNumber": 1,
  "nextInvoiceNumber": 1,
  "company": {
    "name": "Hoff Parquet",
    "address": "37 Comiston Road, Morningside, Edinburgh, EH10 6AB",
    "phone": "0131 385 7779",
    "email": "",
    "website": "https://www.hoffparquet.co.uk",
    "companyNumber": "",
    "vatNumber": "",
    "vatRegistered": false,
    "logo": "",
    "bankName": "",
    "accountName": "",
    "sortCode": "",
    "accountNumber": ""
  }
}'::jsonb)
on conflict (id) do nothing;
