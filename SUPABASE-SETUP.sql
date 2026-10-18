-- ══════════════════════════════════════════════════════════════
--  PIPO — Supabase setup
--
--  PASTE THIS WHOLE THING INTO THE SUPABASE SQL EDITOR AND RUN IT.
--
--  Supabase dashboard → your project → SQL (left sidebar) →
--  New query → paste → Run.
--
--  It creates four tables and lets anybody read and write them.
--  That is deliberate: this is a public guestbook on an art piece,
--  not a bank. There is no personal data here beyond a name
--  somebody typed in themselves.
--
--  Running it twice is harmless — it drops and rebuilds.
-- ══════════════════════════════════════════════════════════════

-- ── 1 · THE PINNED STARS ─────────────────────────────────────
create table if not exists public.stars (
  id          bigint generated always as identity primary key,
  text        text not null,
  from_name   text default 'a visitor',
  colour      text default '#f4a6c0',
  created_at  timestamptz default now()
);
alter table public.stars enable row level security;
drop policy if exists "anyone can read stars"   on public.stars;
drop policy if exists "anyone can post stars"   on public.stars;
create policy "anyone can read stars" on public.stars for select using (true);
create policy "anyone can post stars" on public.stars for insert with check (true);

-- ── 2 · THE DREAM WISHES ────────────────────────────────────
create table if not exists public.wishes (
  id          bigint generated always as identity primary key,
  text        text not null,
  from_name   text default 'a visitor',
  created_at  timestamptz default now()
);
alter table public.wishes enable row level security;
drop policy if exists "anyone can read wishes"  on public.wishes;
drop policy if exists "anyone can post wishes"  on public.wishes;
create policy "anyone can read wishes" on public.wishes for select using (true);
create policy "anyone can post wishes" on public.wishes for insert with check (true);

-- ── 3 · THE SNEEZE DASH LEADERBOARD ─────────────────────────
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  from_name   text default 'a nameless dragon',
  score       integer not null default 0,
  created_at  timestamptz default now()
);
alter table public.scores enable row level security;
drop policy if exists "anyone can read scores"  on public.scores;
drop policy if exists "anyone can post scores"  on public.scores;
create policy "anyone can read scores" on public.scores for select using (true);
create policy "anyone can post scores" on public.scores for insert with check (true);

-- ── 4 · THE BLOOM YARD ──────────────────────────────────────
-- `payload` holds the flower's strokes as JSON. Not a picture: a
-- bitmap of one flower was 40-80KB, which is far too big to send
-- around. Strokes are about a kilobyte and look better.
create table if not exists public.garden (
  id          bigint generated always as identity primary key,
  from_name   text default 'a visitor',
  colour      text default '#f4a6c0',
  payload     jsonb,
  created_at  timestamptz default now()
);
alter table public.garden enable row level security;
drop policy if exists "anyone can read garden"  on public.garden;
drop policy if exists "anyone can post garden"  on public.garden;
create policy "anyone can read garden" on public.garden for select using (true);
create policy "anyone can post garden" on public.garden for insert with check (true);


-- ══════════════════════════════════════════════════════════════
--  YOU'RE DONE.
--
--  Next: the two numbers you need are on the same page, under
--  Project Settings → API.
--
--      Project URL        https://xxxxxxxxxxxx.supabase.co
--      anon public key    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
--
--  Paste both into the `supa()` function in js/shared.js, replacing
--  YOUR-PROJECT and YOUR-ANON-KEY. That is the whole integration —
--  the walls switch over on the next reload.
-- ══════════════════════════════════════════════════════════════
