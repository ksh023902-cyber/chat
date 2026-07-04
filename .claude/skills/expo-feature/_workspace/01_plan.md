# Gemini 네이티브 API 전환 구현 계획

## 목표
OpenAI 호환 엔드포인트(`/v1beta/openai/chat/completions` + Bearer 인증)에서 Gemini 네이티브 REST 엔드포인트(`/v1beta/models/{model}:generateContent` + key 쿼리파라미터)로 전환하여 AQ. 접두사 키의 401 문제를 해결한다.

## 영향받는 파일 (3개)

| 파일 | 변경 내용 |
|------|-----------|
| `src/services/apiConfig.ts` | URL 변경 (base URL로), 키 검증 로직 완화 |
| `src/services/claude.ts` | `messagesToGeminiFormat()` 신설, `apiRequest` 전면 재작성, body 검증 유지 |
| `src/services/harness.ts` | `callLLM` 함수 Gemini 네이티브로 재작성 |

## prompt-engineer 작업: 불필요
- `prompts.ts` 변경 없음. 프롬프트 내용은 동일, 전송 형식만 변환.

## RootStackParamList 변경: 불필요
- 화면 추가/변경 없음.

---

## 작업 단위

### 작업 1: `src/services/apiConfig.ts` 수정

**변경 1 - URL:**
```typescript
// 기존
export const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// 변경 후 (base URL만 — 모델명은 호출 시 조립)
export const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';
```

**변경 2 - 키 검증 완화:**
```typescript
// 기존
} else if (!GEMINI_API_KEY.startsWith('AIza') || GEMINI_API_KEY.length !== 39) {
  console.warn(
    `[apiConfig] 키 형식 이상 — 앞 8자: "${GEMINI_API_KEY.slice(0, 8)}", 길이: ${GEMINI_API_KEY.length}` +
    ' (AIza로 시작하는 39자여야 함)'
  );
}

// 변경 후 (빈값/공백만 체크 — AIza, AQ. 둘 다 허용)
} else if (GEMINI_API_KEY.trim().length < 10) {
  console.warn(
    `[apiConfig] 키가 너무 짧음 — 길이: ${GEMINI_API_KEY.length}. .env 파일 확인 필요`
  );
}
```

---

### 작업 2: `src/services/claude.ts` — `messagesToGeminiFormat()` 신설 + `apiRequest` 재작성

#### 2-1. `messagesToGeminiFormat()` 함수 설계

**입력:**
```typescript
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
```

**출력 타입 (인라인 사용, 별도 export 불필요):**
```typescript
type GeminiRequestBody = {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: 'user' | 'model'; parts: { text: string }[] }[];
  generationConfig: { maxOutputTokens: number; temperature: number };
};
```

**변환 로직:**
1. messages 배열에서 `role === 'system'`인 메시지를 추출
2. system 메시지 -> `systemInstruction: { parts: [{ text: systemContent }] }`
3. 나머지 user/assistant 메시지를 순서대로 contents 배열에 매핑:
   - `role: 'assistant'` -> `role: 'model'`
   - `role: 'user'` -> `role: 'user'`
   - content -> `parts: [{ text: content }]`
4. generationConfig에 maxOutputTokens, temperature 매핑

```typescript
function messagesToGeminiFormat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  maxOutputTokens: number,
  temperature: number
) {
  const systemMsg = messages.find(m => m.role === 'system');
  const turns = messages.filter(m => m.role !== 'system');

  const body: Record<string, unknown> = {
    contents: turns.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens, temperature },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  return body;
}
```

#### 2-2. `apiRequest` 재작성

```typescript
async function apiRequest(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  max_tokens: number,
  temperature: number
): Promise<string> {
  // Gemini 네이티브 엔드포인트: URL에 모델명 + key 쿼리파라미터
  const endpoint = `${API_URL}/${CHAT_MODEL}:generateContent?key=${API_KEY}`;

  // [진단] 키 앞 8자, 모델명 확인
  console.log(
    '[apiRequest] 키:', API_KEY ? API_KEY.slice(0, 8) : '(없음)',
    '길이:', API_KEY?.length ?? 0,
    '모델:', CHAT_MODEL
  );

  const body = messagesToGeminiFormat(messages, max_tokens, temperature);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.error(`[apiRequest] ${response.status} 인증 실패`);
      console.error('[apiRequest] error.message:', data?.error?.message ?? '(없음)');
      console.error('[apiRequest] error.status:', data?.error?.status ?? '(없음)');
    } else if (response.status !== 429) {
      console.error(`[claude] ERROR ${response.status} BODY:`, JSON.stringify(data, null, 2));
    }
    throw new Error(data.error?.message ?? `API error ${response.status}`);
  }

  // Gemini 네이티브 응답 파싱
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
```

**핵심 변경 요약:**
- `Authorization: Bearer` 헤더 제거 -> URL `?key=` 쿼리파라미터
- request body: `{ model, messages, max_tokens, temperature }` -> `{ systemInstruction, contents, generationConfig }`
- response 파싱: `data.choices[0].message.content` -> `data.candidates[0].content.parts[0].text`

#### 2-3. body 검증 (`warnIfInvalidBody`) 유지

`warnIfInvalidBody()`는 `messagesToGeminiFormat()` 호출 전, 기존 messages 배열 단계에서 실행된다. 기존 로직(system 1개 확인, 빈 content 확인, 연속 동일 role 확인) 그대로 유지 — Gemini 변환과 무관하게 입력 데이터 품질 검증 역할.

---

### 작업 3: `src/services/harness.ts` — `callLLM` 재작성

harness.ts는 자체 `ApiConfig`를 받아 독립적으로 API를 호출한다. 동일한 Gemini 네이티브 형식으로 전환.

**ApiConfig 타입은 변경 없음** (url, apiKey, model 필드 그대로 사용. url의 의미만 "base URL"로 변경):

```typescript
async function callLLM(messages: ChatMessage[], { url, apiKey, model }: ApiConfig): Promise<string> {
  // url = base URL (예: https://generativelanguage.googleapis.com/v1beta/models)
  const endpoint = `${url}/${model}:generateContent?key=${apiKey}`;

  const systemMsg = messages.find(m => m.role === 'system');
  const turns = messages.filter(m => m.role !== 'system');

  const body: Record<string, unknown> = {
    contents: turns.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  console.log('[harness] REQUEST to:', endpoint.replace(apiKey, '***'));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status !== 429) {
      console.error(`[harness] ERROR ${res.status}:`, JSON.stringify(errData, null, 2));
    }
    throw new Error(`API 오류: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
```

**파일 상단 주석 업데이트:**
```typescript
// harness.ts — 조립·검증·호출 (Gemini 네이티브 REST 엔드포인트 기준)
```

**하단 사용 예시 주석 업데이트:**
```typescript
url: 'https://generativelanguage.googleapis.com/v1beta/models',
```

---

## 구현 순서 (의존 관계)

```
작업 1 (apiConfig.ts) ─┐
                       ├─→ 작업 2 (claude.ts)
작업 3 (harness.ts) ───┘   (작업 1 완료 후)
```

작업 1과 3은 독립 실행 가능 (병렬). 작업 2는 작업 1의 URL/모델 상수를 참조하므로 작업 1 이후.

---

## 검증 체크리스트

- [ ] `npx expo start --clear` 후 앱 정상 기동 (콘솔에 키 경고 없음)
- [ ] 시나리오 생성 (`generateDailyScenario`) 정상 응답 (200 + text 파싱 성공)
- [ ] 채팅 (`openCharacterSession`, `characterReply`) 정상 응답
- [ ] 엔딩 (`generateEnding`) 정상 응답
- [ ] harness (`generateReaction`) 정상 응답
- [ ] 401/403 에러 시 콘솔에 유의미한 진단 정보 출력
- [ ] 로그에 API 키 전체가 노출되지 않음 (마스킹 확인)

## 주의사항

1. **URL 키 노출 방지**: `?key=` 방식 사용 시 로그/에러 출력에서 반드시 `apiKey`를 `***`로 마스킹
2. **Gemini contents 규칙**: 첫 메시지는 반드시 `user` role이어야 함. 기존 `mergeConsecutiveRoles()`와 assistant-first 방어 코드가 이를 처리 중이므로 변환 후에도 정상 동작
3. **모델명 확인**: 현재 `GEMINI_CHAT_MODEL = 'gemini-2.0-flash'` — 이 값이 Gemini API에서 유효한 모델 ID인지 확인 필요. 대안: `gemini-2.0-flash-001` 또는 `gemini-flash-2.0`
4. **에러 응답 구조 차이**: Gemini 네이티브는 `{ error: { code, message, status } }` 형식 — 기존 파싱 호환됨
