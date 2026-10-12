-- =====================================================================
-- 아요바디요 v185 · 리포트 공유 링크 (SQL Editor에 통째로 붙여넣고 Run)
-- 기존 회원·측정 데이터는 건드리지 않고 '추가'만 함. 여러 번 실행해도 안전.
--   ayo_shares : 공유 링크 정보 (만든 센터 본인만 보고·만들고·지울 수 있음)
--   shares 버킷: 리포트 이미지 (비공개). 회원은 서버 함수 share-view가
--                만든 10분짜리 주소로만 열람 → 만료·중지된 링크는 즉시 안 보임
-- =====================================================================
create table if not exists public.ayo_shares (
  id          text primary key check (id ~ '^[A-Za-z0-9_-]{20,64}$'),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  image_path  text not null,
  center      jsonb not null default '{}'::jsonb,       -- 센터명·로고·연락처·전화·예약 링크
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  views       integer not null default 0,
  check (image_path = (user_id::text || '/' || id || '.jpg')),
  check (expires_at <= created_at + interval '100 days')
);
create index if not exists ayo_shares_user_idx on public.ayo_shares (user_id, created_at desc);
alter table public.ayo_shares enable row level security;
drop policy if exists "own shares select" on public.ayo_shares;
drop policy if exists "own shares insert" on public.ayo_shares;
drop policy if exists "own shares delete" on public.ayo_shares;
create policy "own shares select" on public.ayo_shares for select to authenticated using ((select auth.uid()) = user_id);
create policy "own shares insert" on public.ayo_shares for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own shares delete" on public.ayo_shares for delete to authenticated using ((select auth.uid()) = user_id);
revoke update, truncate on public.ayo_shares from anon, authenticated;   -- 조회수는 서버 함수만 올림
revoke all on public.ayo_shares from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shares', 'shares', false, 3145728, array['image/jpeg'])         -- 장당 3MB, JPEG만
on conflict (id) do nothing;
drop policy if exists "own shares obj select" on storage.objects;
drop policy if exists "own shares obj insert" on storage.objects;
drop policy if exists "own shares obj delete" on storage.objects;
create policy "own shares obj select" on storage.objects for select to authenticated
  using (bucket_id = 'shares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own shares obj insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'shares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own shares obj delete" on storage.objects for delete to authenticated
  using (bucket_id = 'shares' and (storage.foldername(name))[1] = (select auth.uid())::text);
