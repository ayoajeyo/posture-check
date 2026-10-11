-- =====================================================================
-- 아요바디요 · Supabase 스키마 (SQL Editor에 통째로 붙여넣고 Run)
-- 계정(센터) 1개 = 데이터 1묶음. 로그인한 본인 데이터만 읽고 쓸 수 있음(RLS).
-- 앱의 기기 저장소(IndexedDB) 구조를 그대로 옮기는 방식:
--   store = members / records / roms / programs / assigns / consults / sales
--   id    = 앱이 만든 기록 id, data = 기록 내용(JSON)
-- 측정 사진 원본은 Storage 'photos' 버킷: photos/{user_id}/{id}
-- =====================================================================

-- 1) 기록 테이블
create table if not exists public.ayo_items (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  store      text        not null check (store in ('members','records','roms','programs','assigns','consults','sales')),
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,        -- 삭제도 다른 기기에 전달되도록 표시만
  updated_at timestamptz not null default now(),
  primary key (user_id, store, id)
);
create index if not exists ayo_items_sync_idx on public.ayo_items (user_id, updated_at);

-- 수정할 때마다 updated_at 자동 갱신 (기기 간 동기화 기준)
create or replace function public.ayo_touch() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;   -- v157 보안: search_path 고정
drop trigger if exists ayo_items_touch on public.ayo_items;
create trigger ayo_items_touch before insert or update on public.ayo_items
  for each row execute function public.ayo_touch();

alter table public.ayo_items enable row level security;
drop policy if exists "own rows select" on public.ayo_items;
drop policy if exists "own rows insert" on public.ayo_items;
drop policy if exists "own rows update" on public.ayo_items;
drop policy if exists "own rows delete" on public.ayo_items;
create policy "own rows select" on public.ayo_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.ayo_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.ayo_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows delete" on public.ayo_items for delete to authenticated using ((select auth.uid()) = user_id);

-- 2) 계정 정보(센터명·설정·동의 기록)
create table if not exists public.ayo_profiles (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  center_name  text,
  settings     jsonb not null default '{}'::jsonb,     -- 센터 로고·연락처 등 앱 설정
  agreed_terms timestamptz,                             -- 이용약관·개인정보 처리방침 동의 시각
  agreed_sensitive timestamptz,                         -- 민감정보(건강·신체 정보) 처리 동의 시각
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists ayo_profiles_touch on public.ayo_profiles;
create trigger ayo_profiles_touch before update on public.ayo_profiles
  for each row execute function public.ayo_touch();
alter table public.ayo_profiles enable row level security;
drop policy if exists "own profile" on public.ayo_profiles;
create policy "own profile" on public.ayo_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 3) 사진 저장소 (비공개 버킷, 본인 폴더만 접근)
insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', false, 15728640)            -- 장당 15MB
on conflict (id) do nothing;

drop policy if exists "own photos select" on storage.objects;
drop policy if exists "own photos insert" on storage.objects;
drop policy if exists "own photos update" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;
create policy "own photos select" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4) v156 사진 저장 방식 2 (사진은 WebP 파일, 정보는 작은 JSON) 이후 권장 설정
--    장당 최대 5MB · 정보(JSON)와 사진(WebP/JPEG/PNG)만 허용 · 경로 규칙(첫 폴더 = 사용자ID)은 위 정책 그대로
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['application/json', 'image/webp', 'image/jpeg', 'image/png']
 where id = 'photos';

-- ===== v158 Google Play 월 구독 상태 =====
-- 서버 함수(play-verify)만 기록하고, 본인은 읽기만 가능
create table if not exists public.ayo_subs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  product_id     text not null,
  purchase_token text not null unique,
  state          text,
  expires_at     timestamptz,
  auto_renew     boolean,
  updated_at     timestamptz not null default now()
);
alter table public.ayo_subs enable row level security;
drop policy if exists "own sub read" on public.ayo_subs;
create policy "own sub read" on public.ayo_subs for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete, truncate on public.ayo_subs from anon, authenticated;
