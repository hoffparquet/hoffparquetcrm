-- Hoff Parquet CRM — migration 6: project category (Commercial / Residential)
-- Run this in the Neon SQL Editor. Safe to re-run.

alter table clients add column if not exists project_category text not null default '';
