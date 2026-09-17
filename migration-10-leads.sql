-- Hoff Parquet CRM — migration 10: lead generation module
-- Run this in the Neon SQL Editor. Safe to re-run.
--
-- This adds THREE NEW TABLES and touches nothing that already exists.
-- Clients, quotes, invoices, order sheets and products are all left
-- exactly as they are — a lead only becomes a client when you press
-- "Convert to client", and that goes through the normal clients table.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),

  -- Straight from Companies House
  company_number text not null default '',
  company_name text not null default '',
  company_status text not null default '',
  incorporated_on text not null default '',
  sic_codes jsonb not null default '[]'::jsonb,
  address text not null default '',
  locality text not null default '',
  region text not null default '',
  postcode text not null default '',

  -- Which target group this lead came from (see lib/leads.js)
  segment text not null default '',

  -- Contact details. Companies House does NOT publish these, so they
  -- start empty and get filled in later — by you, or by an enrichment
  -- step we add afterwards.
  contact_name text not null default '',
  email text not null default '',
  email_status text not null default '',   -- '' | 'valid' | 'invalid' | 'unknown' (from verification)
  phone text not null default '',
  website text not null default '',

  -- Where this lead is up to.
  --   new        — just imported, nothing done
  --   review     — needs your eyes before any contact (fit-out/joinery firms)
  --   approved   — you've okayed it for outreach
  --   contacted  — an email has gone out
  --   replied    — they responded
  --   converted  — became a client (client_id below points at them)
  --   rejected   — not a fit, never contact
  status text not null default 'new',
  review_required boolean not null default false,

  notes text not null default '',
  client_id uuid references clients(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stops the same company being imported twice. Partial index, so any
-- leads you add by hand without a company number are still allowed.
create unique index if not exists leads_company_number_key
  on leads(company_number) where company_number <> '';

create index if not exists leads_status_idx on leads(status);
create index if not exists leads_segment_idx on leads(segment);

-- A record of each Companies House search you run, so you can see what
-- you've already covered and don't re-trawl the same ground.
create table if not exists lead_searches (
  id uuid primary key default gen_random_uuid(),
  segment text not null default '',
  location text not null default '',
  result_count int not null default 0,
  imported_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Single-row table for the lead platform's own settings, kept separate
-- from app_settings on purpose: it holds the Companies House API key,
-- and this table is never sent to the browser in full.
create table if not exists lead_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  constraint lead_settings_singleton check (id = 1)
);

insert into lead_settings (id, data)
values (1, '{
  "companiesHouseKey": "",
  "sendingDomain": "",
  "dkimSelectors": ["selector1", "selector2"]
}'::jsonb)
on conflict (id) do nothing;
