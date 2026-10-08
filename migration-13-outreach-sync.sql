-- Hoff Parquet CRM — migration 13: outreach email tracking
-- Run this in the Neon SQL Editor AFTER migration-10-leads.sql.
-- Safe to re-run.
--
-- ADDS ONLY. Nothing is deleted, renamed or overwritten:
--   * three new empty columns on the leads table
--   * one new table that remembers which emails have already been processed,
--     so the same reply can never create a client twice.
-- Clients, quotes, invoices, order sheets, products and payments are not touched.

alter table leads add column if not exists last_contacted_at timestamptz;
alter table leads add column if not exists last_reply_at timestamptz;
alter table leads add column if not exists outreach_conversation_id text not null default '';

create index if not exists leads_email_lower_idx on leads (lower(email));
create index if not exists leads_conversation_idx on leads (outreach_conversation_id);

create table if not exists outreach_mail_log (
  message_id text primary key,          -- Microsoft's id for the email
  kind text not null default '',        -- 'sent' | 'reply' | 'unsubscribe' | 'bounce' | 'ignored'
  lead_id uuid references leads(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  summary text not null default '',
  processed_at timestamptz not null default now()
);
