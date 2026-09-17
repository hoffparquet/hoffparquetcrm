-- Hoff Parquet CRM — migration 12: job costing (what we actually pay
-- fitters vs what we charge, per named project)
-- Run this in the Neon SQL Editor. Safe to re-run.

create table if not exists installation_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  project_name text not null default '',
  job_date text not null default '',
  fitter_name text not null default '',
  items jsonb not null default '[]'::jsonb,  -- [{ id, description, quantity, unit, costPerUnit, chargePerUnit }]
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists installation_jobs_client_id_idx on installation_jobs(client_id);
