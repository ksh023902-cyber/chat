-- ============================================================================
-- ⚠️  이 파일은 Supabase 대시보드의 SQL Editor에 붙여넣어 직접 실행하세요.
--     앱에 설정된 anon/publishable 키로는 테이블 생성(DDL)을 실행할 수 없습니다.
--     실행 위치: Supabase Dashboard → 프로젝트 → SQL Editor → New query → 붙여넣기 → Run
-- ============================================================================
--
-- 기능4(관음 욕구 확장)용 스키마.
--   answers  : 사용자가 제출한 관점(입장별 의견) 풀
--   reactions: 공감/반응 (기능1 예약 — 지금은 스키마·select만)
--   answers_ranked: 베스트 답변 랭킹 뷰 (reaction 수 desc, 없으면 최신순 폴백)
-- ============================================================================

-- answers
create table if not exists public.answers (
  answer_id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  device_id uuid not null,
  perspective_tag text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists answers_scenario_idx on public.answers (scenario_id, created_at desc);

-- reactions (기능1 예약 — 지금은 스키마만)
create table if not exists public.reactions (
  reaction_id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(answer_id) on delete cascade,
  device_id uuid not null,
  type text not null,
  created_at timestamptz not null default now()
);
create index if not exists reactions_answer_idx on public.reactions (answer_id);

-- 랭킹 뷰: reaction 수 desc, 없으면 최신순 자연 폴백 (fetchBestAnswers가 소비)
create or replace view public.answers_ranked as
select a.*, coalesce(count(r.reaction_id), 0)::int as reaction_count
from public.answers a
left join public.reactions r on r.answer_id = a.answer_id
group by a.answer_id
order by reaction_count desc, a.created_at desc;

-- RLS
alter table public.answers enable row level security;
alter table public.reactions enable row level security;

-- answers: 익명 select 허용
create policy answers_select_all on public.answers for select to anon using (true);
-- answers: insert는 content 길이만 검증(스팸 방지). ※ device_id 위조는 anon 키로 완전 차단 불가 —
--   진짜 per-device 강제는 Supabase Anonymous Auth(auth.uid()) 도입 시 가능. (한계 명시)
create policy answers_insert_bounded on public.answers for insert to anon
  with check (char_length(content) between 1 and 2000);
-- update/delete: 정책 없음 → RLS 하에서 자동 거부 ✅

-- reactions: 지금은 select만 (기능1에서 insert 정책 추가)
create policy reactions_select_all on public.reactions for select to anon using (true);
