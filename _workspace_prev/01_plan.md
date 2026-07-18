# 01_plan.md — 기능4: 관음 욕구 확장 (다른 사람 답변 보기 강화)

> 이 문서는 이전 "캐릭터 이름 자동발송" 계획을 **완전히 대체**한다.
> 기능1(공감/반응/신고), 기능2(우월감 %), 기능3(정체성 리포트)는 **미구현**. 여기선 기능4만 만든다.

---

## 0. 목표 요약
사용자가 자기 의견을 제출하면 Supabase `answers` 풀에 쌓이고, 흐름 마지막(결말 화면)에서
① 실제 관점 분포 ② 베스트 답변 3개 ③ 나와 정반대 관점 답변 ④ 오늘의 다양한 관점(랜덤)을
보여준다. **Supabase 미설정·네트워크 실패 시 절대 throw하지 않고 조용히 폴백**한다(화면 절대 안 죽음).

---

## 1. 코드 리딩 결과 — 실제 흐름 (중요, 근거)

- **네비 흐름**: `Home → Scenario → ScenarioDetail → Perspective → Chat → Ending` (App.tsx).
- **답변 "작성/제출" 지점 = `PerspectiveScreen.handleSubmit`** (src/screens/PerspectiveScreen.tsx:59)
  - `parseCharacters(scenario)`로 시나리오 내 `→ …입장` 줄에서 캐릭터(=관점) 목록을 뽑고,
    각 관점마다 `opinions[i]` 텍스트를 받는다.
  - 제출 시 `Perspective[] = { character, opinion }[]`를 만들어 `navigation.navigate('Chat', { scenario, perspectives })`.
  - **→ 여기가 사용자가 실제로 "답변"을 쓰는 유일한 지점.** `submitAnswer`는 여기서 호출한다.
- **`Chat`은 perspectives를 실제로 쓰지 않는다.** `ChatScreen`은 `route.params`를 읽지 않고
  (props가 `navigation`만), 캐시/lazy 생성으로 시나리오를 다시 확보한다. → ChatScreen은 **건드리지 않는다.**
- **결말/열람 지점 = `EndingScreen`** (터미널 화면, `route.params = { scenario, messages }`).
  - `generateEnding` 후 섹션 카드 렌더 → "다음 사건 보기" → Home. **관음 섹션은 여기 하단에 추가.**
- **"관점 비율(ratio)"은 현재 어느 화면에도 렌더되지 않는다.**
  - `prompts.ts`의 `ratio` 템플릿은 `harness.ts:generateReaction(type:'ratio')`가 소비하지만,
    **어떤 스크린도 `generateReaction`을 호출하지 않는다.** 즉 "AI가 지어내는 가짜 비율 표시"는
    현재 UI에 존재하지 않는 상태다. → "기존 표시 유지"란 실질적으로 **폴백 문구**를 뜻한다(2-D 참조).
- **시나리오는 기기마다 AI가 새로 생성**된다(`generateDailyScenario`, 기기별 캐시).
  → **시나리오 텍스트는 사용자마다 다르다.** 텍스트 해시로 풀을 묶으면 모두가 혼자가 된다.
  → **scenario_id는 "그날의 문제유형 키"(날짜 + PROBLEM_TYPE index)로 정한다.** 모든 기기가 같은 날 같은 값을 갖는다.
  근거: `claude.ts`의 `todayKey()` = `${YYYY-MM-DD}_${index}`, `getTodayProblemType()`가 이미 존재.

---

## 2. 설계 결정 (락)

| 항목 | 결정 | 이유 |
|------|------|------|
| 제출 지점 | `PerspectiveScreen.handleSubmit` (fire-and-forget) | 유일한 답변 작성 지점 |
| 열람 지점 | `EndingScreen` 하단 신규 섹션 | 흐름의 "결과" 화면 |
| scenario_id | `getScenarioId()` = `date_index` (텍스트 아님, 유형키) | 기기별 시나리오 텍스트 상이 → 유형키로 풀 통합 |
| 내 관점 tag 전달 | **AsyncStorage 저장/복원** (`myPerspective:{scenarioId}`) | RootStackParamList/Chat 변경 회피 |
| ratio | 실제 answers 집계(그룹 카운트)로 렌더, 없으면 조용한 폴백 문구 | 오프라인 안전, 강제 AI 호출 없음 |
| SDK | `@supabase/supabase-js` + `react-native-url-polyfill` | 과제 지정. RN에서 URL 폴리필 필요 |
| uuid | `Math.random` 기반 v4 문자열 (네이티브 모듈 없음) | anon device_id는 보안민감 아님, 재빌드 리스크 회피 |
| 실패 처리 | 전부 try/catch → `[]`/`null`/no-op | "화면 죽으면 안 됨" |

### RootStackParamList 변경: **없음** ✅
- 내 관점 tag를 AsyncStorage로 주고받으므로 `Ending` params(`{scenario, messages}`) 변경 불필요.
- App.tsx 변경 없음 (url-polyfill은 supabase.ts 최상단 import).

---

## 3. 영향받는 파일

**신규**
- `supabase/migrations/20260711000000_answers_reactions.sql` — 테이블·RLS·랭킹 뷰 (사용자가 대시보드에서 직접 실행)
- `supabase/functions/best-answer-notify/index.ts` — Edge Function 스텁 (미배포, 클라 호출 코드 없음)
- `supabase/functions/best-answer-notify/schedule.sql` — pg_cron 등록 SQL (문서/준비용)
- `supabase/functions/README.md` — 배포·크론 안내 (실행 안내만)
- `src/services/supabase.ts` — 클라이언트 + device_id + 4개 조회/제출 함수

**수정**
- `src/services/claude.ts` — `getScenarioId()` export 추가 (기존 `todayKey()` 노출용, 로직 변경 없음)
- `src/screens/PerspectiveScreen.tsx` — 제출 시 `submitAnswer` 호출 + 내 관점 tag 저장
- `src/screens/EndingScreen.tsx` — 관음 4개 섹션 추가
- `package.json` — deps 추가 (`expo install`로 builder가 처리)
- `.env` — (이미 반영됨, 손대지 않음)

---

## 4. SQL 마이그레이션 명세 (builder가 파일로 작성, 사용자가 SQL Editor에서 실행)

경로: **`supabase/migrations/20260711000000_answers_reactions.sql`**

```sql
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
```

**builder 주의**: 파일 상단에 주석으로 "이 파일은 Supabase 대시보드 SQL Editor에 붙여넣어 직접 실행하세요.
anon 키로는 DDL 실행 불가" 안내를 넣을 것.

---

## 5. `src/services/supabase.ts` 함수 시그니처 (builder)

```ts
import 'react-native-url-polyfill/auto';   // RN에서 supabase-js URL 의존성 폴리필 (최상단)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean;   // url·key 둘 다 존재 여부

// 익명 device_id — AsyncStorage 캐싱, Math.random 기반 uuid v4. Supabase 미설정이어도 동작.
// ★ 재사용 대상: 이후 인정욕구/반응 기능에서도 이 함수를 그대로 쓴다. 독립적으로 유지.
export async function getDeviceId(): Promise<string>;

export interface AnswerRecord {
  answer_id: string;
  scenario_id: string;
  device_id: string;
  perspective_tag: string;
  content: string;
  created_at: string;
  reaction_count?: number;   // answers_ranked 뷰에서만 채워짐
}

// 미설정/실패 시 조용히 no-op (throw 금지)
export async function submitAnswer(input: {
  scenarioId: string; perspectiveTag: string; content: string;
}): Promise<void>;

// 실패 시 [] 반환
export async function fetchAnswersForScenario(scenarioId: string): Promise<AnswerRecord[]>;

// answers_ranked 뷰 기준(reaction_count desc, created_at desc). 뷰 없거나 실패 시 answers 최신순 폴백. []
export async function fetchBestAnswers(scenarioId: string, limit?: number /*=3*/): Promise<AnswerRecord[]>;

// perspective_tag != myTag 중 하나(랜덤/최신). 없거나 실패 시 null
export async function fetchOppositePerspectiveAnswer(
  scenarioId: string, myTag: string
): Promise<AnswerRecord | null>;
```

**클라이언트 생성 옵션**: `createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })`
(anon 전용, 세션/락 경고 회피). `isSupabaseConfigured()`가 false면 client는 null로 두고 모든 함수가 즉시 폴백 반환.

**"오늘의 다양한 관점(랜덤)"**: 별도 함수 안 만든다. EndingScreen에서 `fetchAnswersForScenario` 결과에서
베스트 id들을 제외하고 클라 셔플 후 3개를 취한다(4개 함수 표면 유지).

---

## 6. claude.ts 변경 (builder — 최소)

기존 `todayKey()`(비공개)를 그대로 재사용하는 얇은 export만 추가. **기존 로직/시나리오/캐릭터 로직 손대지 않는다.**

```ts
// scenario_id: 그날의 문제유형 키(date_index). 모든 기기가 같은 날 동일 값 → 풀 통합.
export function getScenarioId(): string { return todayKey(); }
```

---

## 7. PerspectiveScreen 변경 (builder)

`handleSubmit`에서 **네비게이션은 지금처럼 즉시 수행**하고, 그 앞뒤로 fire-and-forget 제출을 추가:

- `getScenarioId()`로 scenarioId 확보.
- 비어있지 않은 `opinions[i]`마다 `submitAnswer({ scenarioId, perspectiveTag: characters[i], content })` 호출
  (await 하지 말 것 — UX 지연 금지, 실패는 supabase.ts가 삼킴).
- **내 대표 관점 저장**: 가장 긴 opinion의 `characters[i]`를 대표 tag로 골라
  `AsyncStorage.setItem('myPerspective:' + scenarioId, JSON.stringify({ tag, content }))`.
  (EndingScreen의 "정반대 관점" 매칭용.)
- 기존 캐릭터별 입력 UI/`parseCharacters`/`navigation.navigate('Chat', …)`는 **변경 금지.**

---

## 8. EndingScreen 변경 (builder) — 관음 섹션

`generateEnding` 로딩과 **독립된** 별도 effect(자체 mountedRef)로 관음 데이터를 로드. 전부 조용한 폴백.

```
로드 순서 (Promise.all, 각자 catch):
  scenarioId = getScenarioId()
  my   = AsyncStorage 'myPerspective:{scenarioId}' (없으면 null)
  all  = fetchAnswersForScenario(scenarioId)
  best = fetchBestAnswers(scenarioId, 3)
  opp  = my ? fetchOppositePerspectiveAnswer(scenarioId, my.tag) : null
```

렌더 (기존 섹션 카드들 뒤, "다음 사건 보기" 버튼 앞. 기존 다크 스타일 톤 재사용):

1. **관점 분포** (신규, ratio 대체)
   - `all`을 `perspective_tag`로 그룹 → 비율(%) 바 렌더.
   - `all`이 비면 폴백 문구: `"아직 다른 사람들의 관점이 모이는 중이에요."` (AI 호출 없음).
2. **오늘의 베스트 답변 3개** (신규)
   - `best` 카드 리스트(perspective_tag + content 미리보기). 비면: `"첫 답변의 주인공이 되어보세요."`
3. **나와 정반대 관점** (신규)
   - `opp` 있으면 카드 1개 표시. `my`가 없거나 `opp`가 null이면 버튼/카드 **비활성 + 안내 문구**
     (`"정반대 관점이 아직 없어요."`). 토글(접기/펼치기) 형태 권장 — 눌러서 보게(관음 강화).
4. **오늘의 다양한 관점** (신규, 랜덤)
   - `all`에서 best의 answer_id 제외 → 셔플 → 3개. 박탈감 방지 목적(베스트 못 든 답변 노출).
   - 비면 섹션 숨김 또는 위 폴백 재사용.

- 기존 `generateEnding`/섹션 파싱/애니메이션/`mountedRef` 로직은 **변경 금지**(관음용 상태·effect만 추가).

---

## 9. "어제 베스트 푸시" — 서버 준비만 (클라 호출 코드 금지)

`supabase/functions/best-answer-notify/`:
- `index.ts`: Deno Edge Function 스텁 — 전날 scenario_id의 `answers_ranked` 상위를 골라
  (미래) 푸시 전송하는 골격. **배포 안 됨. 앱에서 호출하는 코드는 만들지 않는다.**
- `schedule.sql`: `pg_cron`으로 매일 아침 함수 호출 등록 예시 SQL (주석/문서용).
- `README.md`: `supabase functions deploy`, 시크릿, `pg_cron` 활성화 순서 안내 (실행은 사용자 몫).

---

## 10. package.json (builder)

```
npx expo install @supabase/supabase-js react-native-url-polyfill
```
- `@react-native-async-storage/async-storage`는 이미 있음.
- 네이티브 모듈 추가 없음(둘 다 JS). 그래도 설치 후 `npx expo start --clear` 권장(env·모듈 반영).
- uuid 패키지/`react-native-get-random-values`는 **설치하지 않는다**(Math.random v4로 대체, 재빌드 리스크 회피).

---

## 11. 담당 분리

### ▶ builder 작업 (의존 순서)
1. `expo install` 2개 패키지.
2. `supabase/migrations/…sql` + `supabase/functions/…` 파일 작성(§4, §9).
3. `src/services/supabase.ts` 작성(§5) — 전 함수 silent 폴백 필수.
4. `claude.ts`에 `getScenarioId()` export(§6).
5. `PerspectiveScreen.handleSubmit` 확장(§7).
6. `EndingScreen` 관음 섹션(§8).
- **불변**: ChatScreen, 캐릭터/이름/오프닝/스트릭/알람 로직, RootStackParamList, App.tsx.

### ▶ prompt-engineer 작업 (선택·경량, harness 정합성만 유지)
- 현재 `ratio` 템플릿은 **어느 화면도 호출하지 않음** → 이번 UI는 AI 없이 실제 집계로 렌더.
- 다만 향후 AI 비율 코멘트를 붙일 때를 대비해 `prompts.ts`의 `ratio` 템플릿 본문에
  **"실제 데이터 유무 분기 문구"**를 추가:
  - `{{minority_flag}}` 문자열에 사용자 수 정보가 실릴 수 있음을 전제로,
    "실제로 오늘 이 사건을 본 사람들 사이에서"(실데이터) vs 두루뭉술한 표현(시뮬레이션)을
    캐릭터 톤으로 나눠 말하도록 지침 1~2줄 추가.
  - **주의**: `harness.ts:fill()`은 미치환 변수에서 throw → **새 `{{변수}}`를 도입하지 말 것.**
    기존 `{{minority_flag}}` 안내 문구만 확장(무위험). `validateOutput`(≤4문장+인용) 기준 유지.
- 이 작업은 UI 동작의 전제조건이 **아니다**(빌드 블로킹 아님). 여력 될 때 반영.

---

## 12. 검증 포인트 (reviewer용)
- Supabase env 비운 채로도 Perspective 제출·Ending 진입이 에러 없이 동작(폴백 문구 노출).
- `submitAnswer`가 네비게이션을 지연/블로킹하지 않음(await 없음).
- scenario_id가 텍스트 해시가 아닌 `date_index`인지(풀 통합 핵심).
- RLS: anon select O, insert O(길이제한), update/delete X.
- ChatScreen/RootStackParamList/App.tsx 무변경 확인.
