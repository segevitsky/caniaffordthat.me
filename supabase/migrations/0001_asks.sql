-- asks: one row per verdict shown. ROADMAP.md Phase 1 item 1 (learning loop).
-- Phase 1 columns only: no user_id (phase 2 adds a nullable one).
-- month_state, category, signals, writer_model ship with later Phase 1 items and stay null until then.

create table public.asks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  item text,
  price numeric,
  currency text,
  category text,
  income_bucket text,
  household text,
  month_state text,
  use text,
  replaces text,
  wanted text,
  ifnot text, -- not in the ROADMAP sketch, but it's 1/4 of the need score; without it an ask can't be replayed
  corner text,
  can boolean,
  should boolean,
  signals jsonb,
  punch text,
  writer_model text,
  source text
);

alter table public.asks enable row level security;

-- No policies on purpose: all writes go through api/ask using the secret (service role) key,
-- which bypasses RLS. The browser never talks to Supabase directly in phase 1, so with RLS
-- enabled and zero policies, the publishable key can neither read nor write this table.
