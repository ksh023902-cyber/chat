/**
 * API 설정 단일 진실 소스 (Single Source of Truth)
 *
 * 키·URL·모델을 여기서만 관리한다.
 * Gemini 네이티브 REST API 사용 (OpenAI 호환 엔드포인트가 아님).
 *
 * 변경 후에는 반드시 `npx expo start --clear` 로 재시작해야 반영된다.
 */

export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';
export const GEMINI_CHAT_MODEL = 'gemini-flash-latest';

// 어떤 라이브러리도 건드리기 전 모듈 로드 시점의 fetch를 포착한다.
// SDK·폴리필이 global.fetch를 나중에 패치해도 이 참조는 오염되지 않는다.
// eslint-disable-next-line no-undef
export const RAW_FETCH: typeof fetch = (global as any).fetch ?? fetch;

// 앱 시작 시 키 형식 경고 (dev 빌드에서만)
if (__DEV__) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim().length < 10) {
    console.warn('[apiConfig] EXPO_PUBLIC_GEMINI_API_KEY 가 비어있거나 너무 짧음 — .env 확인 후 --clear 재시작');
  }
}
