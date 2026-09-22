-- Hybrid Athlete Log -- Supabase schema
-- Plak dit volledige bestand in Supabase Dashboard > SQL Editor > New query
-- en klik op "Run". Dit maakt alle tabellen aan, zet Row Level Security
-- (RLS) aan en voegt de policies toe zodat elke gebruiker alleen zijn/haar
-- eigen data kan lezen en schrijven (user_id = auth.uid()).
--
-- Dit is een single-user app: er hoeft maar één account te bestaan. Maak dat
-- account aan via Supabase Dashboard > Authentication > Users > Add user,
-- NADAT je dit schema hebt uitgevoerd (zie ook README.md).

create extension if not exists pgcrypto;

-- ---------- races ----------
create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date date not null,
  type text,
  target_pace text,
  pacing_scenarios jsonb,
  pacing_notes text,
  meal_plan jsonb,
  carb_notes text,
  result jsonb,
  created_at timestamptz not null default now()
);
alter table public.races enable row level security;
create policy "races_select_own" on public.races for select using (user_id = auth.uid());
create policy "races_insert_own" on public.races for insert with check (user_id = auth.uid());
create policy "races_update_own" on public.races for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "races_delete_own" on public.races for delete using (user_id = auth.uid());

-- ---------- schedule_entries ----------
create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  week_label text,
  sport text not null,
  type text not null,
  planned_text text,
  distance numeric,
  pace text,
  hr integer,
  completed boolean not null default false,
  actual jsonb,
  created_at timestamptz not null default now()
);
alter table public.schedule_entries enable row level security;
create policy "schedule_entries_select_own" on public.schedule_entries for select using (user_id = auth.uid());
create policy "schedule_entries_insert_own" on public.schedule_entries for insert with check (user_id = auth.uid());
create policy "schedule_entries_update_own" on public.schedule_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "schedule_entries_delete_own" on public.schedule_entries for delete using (user_id = auth.uid());
create index if not exists schedule_entries_user_date_idx on public.schedule_entries(user_id, date);

-- ---------- strength_logs ----------
create table if not exists public.strength_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  template text,
  exercises jsonb not null default '[]'::jsonb,
  hr integer,
  warmup_type text,
  warmup_minutes integer,
  created_at timestamptz not null default now()
);
alter table public.strength_logs enable row level security;
create policy "strength_logs_select_own" on public.strength_logs for select using (user_id = auth.uid());
create policy "strength_logs_insert_own" on public.strength_logs for insert with check (user_id = auth.uid());
create policy "strength_logs_update_own" on public.strength_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "strength_logs_delete_own" on public.strength_logs for delete using (user_id = auth.uid());

-- ---------- strength_templates ----------
-- Krachtschema's (bv. "Leg day", "Upper" en eigen schema's). "exercises" is
-- een jsonb-array van { name, linkToNext } - linkToNext geeft supersets aan.
create table if not exists public.strength_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.strength_templates enable row level security;
create policy "strength_templates_select_own" on public.strength_templates for select using (user_id = auth.uid());
create policy "strength_templates_insert_own" on public.strength_templates for insert with check (user_id = auth.uid());
create policy "strength_templates_update_own" on public.strength_templates for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "strength_templates_delete_own" on public.strength_templates for delete using (user_id = auth.uid());

-- ---------- hyrox_library ----------
create table if not exists public.hyrox_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.hyrox_library enable row level security;
create policy "hyrox_library_select_own" on public.hyrox_library for select using (user_id = auth.uid());
create policy "hyrox_library_insert_own" on public.hyrox_library for insert with check (user_id = auth.uid());
create policy "hyrox_library_update_own" on public.hyrox_library for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hyrox_library_delete_own" on public.hyrox_library for delete using (user_id = auth.uid());

-- ---------- hyrox_logs ----------
-- workout_id verwijst naar hyrox_library en cascadeert bij verwijderen van
-- een workout (net als het origineel, dat gekoppelde logs opruimt zodra je
-- een workout uit de library verwijdert).
create table if not exists public.hyrox_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.hyrox_library(id) on delete cascade,
  date date not null,
  time text,
  note text,
  hr integer,
  created_at timestamptz not null default now()
);
alter table public.hyrox_logs enable row level security;
create policy "hyrox_logs_select_own" on public.hyrox_logs for select using (user_id = auth.uid());
create policy "hyrox_logs_insert_own" on public.hyrox_logs for insert with check (user_id = auth.uid());
create policy "hyrox_logs_update_own" on public.hyrox_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hyrox_logs_delete_own" on public.hyrox_logs for delete using (user_id = auth.uid());

-- ---------- hyrox_race_results ----------
create table if not exists public.hyrox_race_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('solo', 'doubles', 'relay')),
  date date not null,
  time text,
  note text,
  created_at timestamptz not null default now()
);
alter table public.hyrox_race_results enable row level security;
create policy "hyrox_race_results_select_own" on public.hyrox_race_results for select using (user_id = auth.uid());
create policy "hyrox_race_results_insert_own" on public.hyrox_race_results for insert with check (user_id = auth.uid());
create policy "hyrox_race_results_update_own" on public.hyrox_race_results for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hyrox_race_results_delete_own" on public.hyrox_race_results for delete using (user_id = auth.uid());

-- ---------- run_race_results ----------
create table if not exists public.run_race_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  km numeric not null,
  date date not null,
  time text,
  note text,
  created_at timestamptz not null default now()
);
alter table public.run_race_results enable row level security;
create policy "run_race_results_select_own" on public.run_race_results for select using (user_id = auth.uid());
create policy "run_race_results_insert_own" on public.run_race_results for insert with check (user_id = auth.uid());
create policy "run_race_results_update_own" on public.run_race_results for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "run_race_results_delete_own" on public.run_race_results for delete using (user_id = auth.uid());

-- ---------- endurance_logs ----------
create table if not exists public.endurance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.endurance_logs enable row level security;
create policy "endurance_logs_select_own" on public.endurance_logs for select using (user_id = auth.uid());
create policy "endurance_logs_insert_own" on public.endurance_logs for insert with check (user_id = auth.uid());
create policy "endurance_logs_update_own" on public.endurance_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "endurance_logs_delete_own" on public.endurance_logs for delete using (user_id = auth.uid());

-- ---------- mood_logs ----------
-- Eén registratie per dag per gebruiker (upsert vanuit de app).
create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood text not null check (mood in ('green', 'orange', 'red')),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.mood_logs enable row level security;
create policy "mood_logs_select_own" on public.mood_logs for select using (user_id = auth.uid());
create policy "mood_logs_insert_own" on public.mood_logs for insert with check (user_id = auth.uid());
create policy "mood_logs_update_own" on public.mood_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mood_logs_delete_own" on public.mood_logs for delete using (user_id = auth.uid());

-- ---------- complaint_logs ----------
create table if not exists public.complaint_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null,
  pain integer,
  created_at timestamptz not null default now()
);
alter table public.complaint_logs enable row level security;
create policy "complaint_logs_select_own" on public.complaint_logs for select using (user_id = auth.uid());
create policy "complaint_logs_insert_own" on public.complaint_logs for insert with check (user_id = auth.uid());
create policy "complaint_logs_update_own" on public.complaint_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "complaint_logs_delete_own" on public.complaint_logs for delete using (user_id = auth.uid());

-- ---------- triathlon_checklist_items ----------
create table if not exists public.triathlon_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('t1', 't2', 'raceday')),
  text text not null,
  checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.triathlon_checklist_items enable row level security;
create policy "triathlon_checklist_items_select_own" on public.triathlon_checklist_items for select using (user_id = auth.uid());
create policy "triathlon_checklist_items_insert_own" on public.triathlon_checklist_items for insert with check (user_id = auth.uid());
create policy "triathlon_checklist_items_update_own" on public.triathlon_checklist_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "triathlon_checklist_items_delete_own" on public.triathlon_checklist_items for delete using (user_id = auth.uid());

-- ---------- rechten voor de "authenticated" rol ----------
-- Zonder dit krijgt PostgREST 403-fouten op elke query, ook als RLS hierboven
-- correct staat: RLS bepaalt WELKE rijen je mag zien/wijzigen, maar de rol
-- moet sowieso al toestemming hebben om de tabel uberhaupt te benaderen.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
