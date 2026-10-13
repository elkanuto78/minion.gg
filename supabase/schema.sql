-- Minion.GG: esquema para Supabase.
-- Pégalo en el SQL Editor de tu proyecto y ejecútalo una sola vez. Es seguro repetirlo.

create table if not exists public.players (
  puuid       text primary key,
  region      text not null,
  game_name   text not null,
  tag_line    text not null,
  ranks       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.matches (
  id          text primary key,                                   -- "riot-LA2_1234567890"
  puuid       text not null references public.players (puuid) on delete cascade,
  champ       text not null,                                      -- id en minúsculas, p. ej. "kaisa"
  cn          text not null,                                      -- nombre tal como lo manda Riot
  mode        text not null check (mode in ('sr', 'aram', 'arena')),
  role        text not null default '',
  k           int  not null,
  d           int  not null,
  a           int  not null,
  cs          int  not null,
  minutes     int  not null,
  win         boolean not null,
  played_on   date not null,
  created_at  timestamptz not null default now()
);

create index if not exists matches_puuid_played_on_idx
  on public.matches (puuid, played_on desc);

-- Solo el servidor (con la clave secreta) debe leer y escribir estas tablas.
-- Con RLS activado y sin políticas, el navegador y la clave pública no ven nada.
alter table public.players enable row level security;
alter table public.matches enable row level security;

revoke all on public.players, public.matches from anon, authenticated;
grant all on public.players, public.matches to service_role;
