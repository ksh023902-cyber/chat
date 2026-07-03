/**
 * API 설정 단일 진실 소스 (Single Source of Truth)
 *
 * 키·URL·모델을 여기서만 관리한다.
 * 키 형식: Google AI Studio에서 발급받은 API 키 (AIza로 시작하는 39자)
 *   - gen-lang-client-* → 프로젝트 ID (키 아님)
 *   - AQ.* / ya29.* → OAuth2 액세스 토큰 (키 아님)
 *
 * 변경 후에는 반드시 `npx expo start --clear` 로 재시작해야 반영된다.
 */

export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
export const GEMINI_CHAT_MODEL = 'gemini-2.0-flash';

// 앱 시작 시 키 형식 경고 (dev 빌드에서만)
if (__DEV__) {
  if (!GEMINI_API_KEY) {
    console.warn('[apiConfig] EXPO_PUBLIC_GEMINI_API_KEY 가 비어있음 — .env 확인 후 --clear 재시작');
  } else if (!GEMINI_API_KEY.startsWith('AIza') || GEMINI_API_KEY.length !== 39) {
    console.warn(
      `[apiConfig] 키 형식 이상 — 앞 8자: "${GEMINI_API_KEY.slice(0, 8)}", 길이: ${GEMINI_API_KEY.length}` +
      ' (AIza로 시작하는 39자여야 함)'
    );
  }
}
