-- Hoff Parquet CRM — migration 8: SumUp card payments on invoices
-- Run this in the Neon SQL Editor. Safe to re-run.

alter table invoices add column if not exists sumup_checkout_id text not null default '';
