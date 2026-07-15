# Supabase Edge Functions

이 디렉터리는 **아직 배포되지 않은 서버 준비물**입니다. 앱(React Native)은 이 함수들을
직접 호출하지 않습니다. 나중에 "어제의 베스트 답변 푸시" 기능을 켤 때 아래 순서대로 배포하세요.

## 사전 준비

1. Supabase CLI 설치
   ```bash
   npm install -g supabase   # 또는 brew install supabase/tap/supabase
   ```
2. 로그인 & 프로젝트 연결
   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>   # 대시보드 Project Settings → General
   ```
3. 스키마 준비: `supabase/migrations/20260711000000_answers_reactions.sql` 을
   대시보드 SQL Editor에서 먼저 실행해 `answers` / `answers_ranked` 가 존재해야 합니다.

## best-answer-notify 배포

```bash
supabase functions deploy best-answer-notify
```

### 시크릿 설정 (service_role 키 필요)

Edge Function은 RLS를 우회해 전체 답변을 읽어야 하므로 **anon 키가 아니라 service_role 키**를
사용합니다. (service_role 키는 대시보드 Project Settings → API 에서 확인)

```bash
supabase secrets set SUPABASE_URL="https://<PROJECT_REF>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>"
```

> 주의: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 Edge 런타임에 자동 주입되는
> 예약 이름일 수 있습니다. 배포 후 함수 로그로 값 존재 여부를 먼저 확인하세요.

### 로컬 테스트 (선택)

```bash
supabase functions serve best-answer-notify --env-file ./supabase/.env.local
# 다른 터미널에서:
curl -i http://localhost:54321/functions/v1/best-answer-notify
```

## pg_cron 매일 등록

1. 대시보드 → Database → Extensions 에서 **pg_cron**, **pg_net** 활성화
2. `best-answer-notify/schedule.sql` 의 주석을 해제하고 `<PROJECT_REF>`,
   `<SERVICE_ROLE_KEY>` 를 실제 값으로 바꾼 뒤 SQL Editor에서 실행
3. `select * from cron.job;` 로 등록 확인

## 남은 TODO (index.ts)

현재 `index.ts` 는 전날 `scenario_id` 의 `answers_ranked` 상위 답변을 조회하는 골격까지만
구현돼 있습니다. 실제 푸시 전송(푸시 토큰 저장 테이블 조회 + Expo Push API 배치 전송)은
`index.ts` 의 `TODO(푸시 전송)` 주석 지점에 추가해야 합니다.
