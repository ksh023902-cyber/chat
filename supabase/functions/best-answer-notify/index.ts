// ============================================================================
// best-answer-notify — Deno Edge Function 스텁 (미배포)
// ============================================================================
// 목적: 매일 아침 "어제의 베스트 답변"을 사용자에게 푸시로 알려주는 서버 함수.
//
// 상태: 골격만 작성한 스텁이다.
//   - 아직 배포하지 않는다 (README.md 배포 절차 참고).
//   - 앱(클라이언트)에서 이 함수를 호출하는 코드는 만들지 않는다.
//   - 푸시 전송부는 TODO로 남겨둔다.
//
// 실행 흐름(예정):
//   pg_cron(schedule.sql) → 매일 아침 이 함수 호출
//   → 전날 scenario_id의 answers_ranked 상위 답변 조회
//   → 등록된 푸시 토큰들에게 Expo Push로 전송
// ============================================================================

// @ts-nocheck — Deno 런타임 전용. 앱(RN) 번들에는 포함되지 않으므로 타입체크 제외.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 전날의 scenario_id 계산: getScenarioId()와 동일 규칙(date_index).
// PROBLEM_TYPES는 8개 주기, 기준일 2025-01-01. (앱 claude.ts:getTodayProblemType 참조)
function scenarioIdForOffset(offsetDays: number): string {
  const start = new Date('2025-01-01').getTime();
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + offsetDays);
  const daysSinceStart = Math.floor((target.getTime() - start) / 86400000);
  const index = ((daysSinceStart % 8) + 8) % 8;
  return `${target.toISOString().slice(0, 10)}_${index}`;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // service_role 키는 시크릿으로 주입 (README 참고). anon 키가 아님.
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, reason: 'missing env' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 전날(scenario_id) 베스트 답변 상위 3개 조회
    const yesterdayScenarioId = scenarioIdForOffset(-1);
    const { data: best, error } = await supabase
      .from('answers_ranked')
      .select('*')
      .eq('scenario_id', yesterdayScenarioId)
      .limit(3);

    if (error) {
      return new Response(JSON.stringify({ ok: false, reason: error.message }), { status: 500 });
    }

    // TODO(푸시 전송):
    //   1) 푸시 토큰 저장 테이블(예: push_tokens)에서 대상 토큰 조회
    //   2) Expo Push API(https://exp.host/--/api/v2/push/send)로 배치 전송
    //   3) 전송 결과/티켓 로깅
    //   ex) await fetch('https://exp.host/--/api/v2/push/send', { ... })

    return new Response(
      JSON.stringify({ ok: true, scenarioId: yesterdayScenarioId, bestCount: best?.length ?? 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: String(e) }), { status: 500 });
  }
});
