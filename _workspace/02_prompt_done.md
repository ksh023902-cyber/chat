# prompt-engineer 완료 보고 — 비판적 사고 채팅

## 추가 export (`src/services/prompts.ts`)

```ts
export const CRITICAL_THINKING_SYSTEM_PROMPT: string;
export function criticalThinkingOpeningUser(userName: string, topic: string): string;
```

## 설계 요지
- 목적: 정답/결론이 아닌 사고력·비판적 사고
- 소크라테스식 열린 질문 1개, 2~4문장
- 사용자 표현 따옴표 인용 필수
- 평가어·번역체·솔루션 모드 금지
- harness TEMPLATES/CHARACTERS/FEWSHOTS **미변경** (멀티턴 경로는 claude.ts 전용)

## claude 소비
- `startCriticalChat` → SYSTEM + opening user
- `continueCriticalChat` → SYSTEM + 이력 + 다음 질문 요청, `<answer>` 래핑

## 기존 무손상
CRISIS_KEYWORDS, CRISIS_MESSAGE, TEMPLATES, CHARACTER_* 유지.
