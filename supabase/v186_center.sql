-- =====================================================================
-- 아요바디요 v186 · 전화·예약 클릭 집계 + 센터 소개 페이지 (이미 서버에 적용됨 · 기록용)
-- =====================================================================
alter table public.ayo_shares add column if not exists calls integer not null default 0;
alter table public.ayo_shares add column if not exists books integer not null default 0;

create table if not exists public.ayo_centers (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  slug       text not null unique check (slug ~ '^[A-Za-z0-9_-]{8,40}$'),
  published  boolean not null default false,
  profile    jsonb not null default '{}'::jsonb,
  views      integer not null default 0,
  calls      integer not null default 0,
  books      integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.ayo_centers enable row level security;
create policy "own center select" on public.ayo_centers for select to authenticated using ((select auth.uid()) = user_id);
create policy "own center insert" on public.ayo_centers for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own center update" on public.ayo_centers for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger ayo_centers_touch before update on public.ayo_centers for each row execute function public.ayo_touch();

-- 조회·클릭 수 올리기 (서버 함수 share-view만 호출)
create or replace function public.ayo_hit(p_kind text, p_key text, p_ev text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_ev not in ('view', 'call', 'book') then return; end if;
  if p_kind = 'share' then
    update public.ayo_shares set views = views + (p_ev = 'view')::int, calls = calls + (p_ev = 'call')::int, books = books + (p_ev = 'book')::int where id = p_key;
  elsif p_kind = 'center' then
    update public.ayo_centers set views = views + (p_ev = 'view')::int, calls = calls + (p_ev = 'call')::int, books = books + (p_ev = 'book')::int where slug = p_key and published;
  end if;
end $$;
revoke execute on function public.ayo_hit(text, text, text) from public, anon, authenticated;
grant execute on function public.ayo_hit(text, text, text) to service_role;
