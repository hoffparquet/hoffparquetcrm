-- Hoff Parquet CRM — migration 9: switch card payments from SumUp to Mollie
-- Run this in the Neon SQL Editor. Safe to re-run.
--
-- This adds the new column Mollie payments need. The old sumup_checkout_id
-- column is left in place (harmless, unused) rather than dropped — there's
-- no benefit to removing it and no reason to run a destructive change for
-- a column that simply won't be written to anymore.

alter table invoices add column if not exists mollie_payment_id text not null default '';
