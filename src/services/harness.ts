// harness.ts — 조립·검증·호출 (Groq/Gemini OpenAI 호환 엔드포인트 기준)
import {
  TEMPLATES,
  CHARACTERS,
  FEWSHOTS,
  FEWSHOTS_SPAR,
  CRISIS_MESSAGE,
  CRISIS_KEYWORDS,
} from './prompts';

export type ReactionType = 'reaction' | 'ratio';
export type CharacterId = 'uncle' | 'kid' | 'detective' | 'teacher' | 'friend';
export type ModeId = 'salvage' | 'normal' | 'spar';

export type GenerateReactionParams = {
  type?: ReactionType;
  character: CharacterId;
  mode: ModeId;
  situation: string;
  userChoice?: string;
  userAnswer: string;
  // ratio 타입 전용: "소수파 (7%)" / "다수파 (81%)" 형식으로 서버가 전달
  minorityFlag?: string;
};

export type ApiConfig = {
  url: string;
  apiKey: string;
  model: string;
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// ── 1. 위기 필터 (LLM 호출 전에 반드시 먼저) ──
// 케이스 F: 캐릭터를 깨는 유일한 예외. 서버 플래그 처리와 함께 사용.
export function checkCrisis(text: string): boolean {
  return CRISIS_KEYWORDS.some((k) => text.includes(k));
}

// ── 2. 변수 치환 + 누락 검증 ──
function fill(template: string, vars: Record<string, string>): string {
  const out = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`변수 누락: ${key}`);
    return vars[key];
  });
  if (out.includes('{{')) throw new Error('치환되지 않은 변수가 남아 있음');
  return out;
}

// ── 3. 출력 검증 (문장 수 + 인용 존재) ──
// 건지기 엔진 공식: 3문장 구조 + 사용자 단어 인용 필수
function validateOutput(text: string): boolean {
  const sentences = text.split(/[.!?…]\s|\n/).filter((s) => s.trim().length > 1);
  const hasQuote = /["'"''「]/.test(text);
  return sentences.length <= 4 && hasQuote;
}

// ── 4. 메인 ──
export async function generateReaction(
  params: GenerateReactionParams,
  apiConfig: ApiConfig
): Promise<{ text: string; crisis: boolean }> {
  // 위기 신호 → LLM 호출 없이 즉시 반환 (캐릭터 해제)
  if (checkCrisis(params.userAnswer)) {
    return { text: CRISIS_MESSAGE, crisis: true };
  }

  const ch = CHARACTERS[params.character];
  const type = params.type ?? 'reaction';

  const vars: Record<string, string> = {
    character: ch.block,
    mode: params.mode,
    situation: params.situation,
    user_choice: params.userChoice ?? '(선택 안 함)',
    user_answer: params.userAnswer,
    // ratio 타입 전용 — reaction 타입에서는 사용 안 되지만 fill()에 전달해도 무방
    minority_flag: params.minorityFlag ?? '',
  };

  const systemPrompt = fill(TEMPLATES[type], vars);

  // few-shot: salvage 기본 + spar 모드 시 추가 퓨샷 병합
  // 구현 메모: 캐릭터당 2개만 포함 (토큰 절약). 나머지는 평가셋으로 보관.
  const shots = [
    ...(FEWSHOTS[params.character] ?? []),
    ...(params.mode === 'spar' ? (FEWSHOTS_SPAR[params.character] ?? []) : []),
  ];

  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
  for (const shot of shots) {
    messages.push({ role: 'user', content: shot.user });
    messages.push({ role: 'assistant', content: shot.assistant });
  }
  // 사용자 답변은 시스템 프롬프트에 이미 포함되어 있음.
  // API 요구사항(마지막 메시지는 user)을 위해 트리거 메시지 추가.
  messages.push({ role: 'user', content: '위 입력 데이터를 바탕으로 캐릭터 말투로 반응해라.' });

  // 호출 → 검증 실패 시 1회만 재시도 (429 rate limit은 재시도 없이 즉시 throw)
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await callLLM(messages, apiConfig);
    } catch (e) {
      if (e instanceof Error && e.message.includes('429')) throw e; // 재시도 금지
      if (attempt === 1) throw e;
      continue;
    }
    if (validateOutput(text) || attempt === 1) return { text, crisis: false };
  }

  return { text: '', crisis: false };
}

// ── 5. API 호출 (OpenAI 호환: Groq / Gemini 둘 다 이 형식 지원) ──
async function callLLM(messages: ChatMessage[], { url, apiKey, model }: ApiConfig): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.8 }),
  });
  if (!res.ok) {
    // 429는 에러 메시지에 상태코드 포함 — 재시도 스킵 판단용
    throw new Error(`API 오류: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

/* ── 사용 예 ──
const result = await generateReaction(
  {
    type: 'reaction',           // 'ratio' = 비율 공개 후
    character: 'detective',     // uncle|kid|detective|teacher|friend
    mode: 'salvage',            // 서버가 사용자 일수 기준으로 결정 (1~4일차: salvage, 5일차~: spar)
    situation: '팀장이 신입 이대리의 기획안을 자기 아이디어처럼 발표했다...',
    userChoice: '이대리',
    userAnswer: '이대리가 말 못한건 신입이라 그런듯',
    // ratio 타입일 때: minorityFlag: '소수파 (7%)'
  },
  {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,  // AI Studio에서 발급받은 키
    model: 'gemini-3.5-flash',
  }
);
console.log(result.text);
// crisis: true 수신 시 → 앱에서 특수 UI로 강조 + 서버에 플래그 전송
*/
