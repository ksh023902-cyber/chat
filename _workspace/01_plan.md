# 01_plan.md — 비판적 사고 유도 AI 채팅

## 0. 목표 요약
이름·주제를 입력하면 대화가 시작되고, AI가 주제 중심의 소크라테스식 질문만 이어가며
**정답/결론이 아닌 사고력·비판적 사고**를 키우는 모바일 채팅 흐름을 만든다.

---

## 1. 코드 리딩 결과

- 현재 진입점: `Main` (Today/Write/Calendar 저널 탭). Chat 미등록.
- `src/screens/ChatScreen.tsx`는 미추적·고아 파일: `commentOnAnswer` / `MessageBubble` / `TypingIndicator` 전부 없음 → **전면 재작성**.
- AI 호출 패턴: `claude.ts`의 `chatCompletion` + 시스템 프롬프트 (예: `generateEntryReaction`).
- harness `generateReaction`은 캐릭터 입장 반응 전용(단발·validateOutput≤4문장+인용)이라 **멀티턴 Q&A에는 부적합**.

---

## 2. 설계 결정 (락)

| 항목 | 결정 | 이유 |
|------|------|------|
| AI 경로 | `claude.ts` 전용 (`startCriticalChat` / `continueCriticalChat`) | 멀티턴·질문 중심. harness 단발 검증과 충돌 |
| 프롬프트 | `prompts.ts`에 `CRITICAL_THINKING_SYSTEM` + 오프닝 유저 템플릿 export | prompt-engineer 소유, builder는 소비만 |
| 네비 | `StartChat` → `Chat` 루트 스택, **initialRouteName = `StartChat`** | 이 기능이 앱의 주 경험. 기존 Main/저널은 유지(도달 가능) |
| params | `Chat: { userName: string; topic: string }` | 이름·주제 전달 |
| Enter | 시작: 주제 입력란 `onSubmitEditing`. 채팅: 전송(플랫폼별 키/버튼) | 사용자 요구 충족 |
| 위기 | `CRISIS_KEYWORDS` 선필터 → `CRISIS_MESSAGE` 즉시 반환 | 기존 패턴 유지 |

### RootStackParamList 변경: **있음** ✅
```ts
StartChat: undefined;
Chat: { userName: string; topic: string };
// Main, Home, Alarm 유지
```

---

## 3. 영향받는 파일

**신규**
- `src/screens/StartChatScreen.tsx` — 이름 + 주제 입력
- `src/components/MessageBubble.tsx` — 말풍선
- `src/components/TypingIndicator.tsx` — 타이핑 표시

**수정·재작성**
- `src/screens/ChatScreen.tsx` — 비판적 사고 Q&A 채팅
- `src/types/index.ts` — `StartChat`, `Chat` params
- `App.tsx` — Screen 등록 + initialRouteName
- `src/services/prompts.ts` — CRITICAL_THINKING_* export
- `src/services/claude.ts` — start/continueCriticalChat

**불변**
- harness.ts, Today/Write/Calendar, supabase 저널 흐름, Alarm

---

## 4. 함수 시그니처 (claude.ts)

```ts
export async function startCriticalChat(
  userName: string,
  topic: string
): Promise<{ text: string; isCrisis: boolean }>;

export async function continueCriticalChat(
  userName: string,
  topic: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ text: string; isCrisis: boolean }>;
```

- system: `CRITICAL_THINKING_SYSTEM_PROMPT`
- start: 첫 질문만 (대화 이력 없음)
- continue: 이력을 Gemini contents로 전달 + 위기 필터는 최신 user 메시지에만

---

## 5. 화면 명세

### StartChatScreen
- TextInput: 이름, 주제 (둘 다 필수 trim)
- 주제 칸 Enter(`onSubmitEditing`) 또는 시작 버튼 → `navigation.navigate('Chat', { userName, topic })`
- 빈 값이면 내비 금지

### ChatScreen
- 마운트 시 `startCriticalChat` → 첫 assistant 메시지
- 사용자 전송 → `continueCriticalChat` → 다음 질문
- 헤더에 주제·이름 표시, 뒤로가기 → StartChat

---

## 6. 담당 분리

### ▶ prompt-engineer
- `CRITICAL_THINKING_SYSTEM_PROMPT`: 소크라테스식, 정답·결론·훈계 금지, 질문으로 끝내기, 사고력·비판적 사고 목적 명시, 번역체/평가어 금지
- `CRITICAL_THINKING_OPENING_USER`: `{{userName}}`, `{{topic}}` 자리 (claude에서 치환하거나 템플릿 문자열)

### ▶ builder
1. types + App.tsx
2. MessageBubble, TypingIndicator
3. StartChatScreen, ChatScreen
4. claude.ts 함수 (prompts export 소비)

---

## 7. reviewer 검증 포인트
- RootStackParamList ↔ App.tsx Screen 일치, initialRouteName=`StartChat`
- Chat params ↔ route.params 사용 일치
- prompts 변수 ↔ claude 주입 1:1
- 위기 경로 API 미호출
- 기존 저널 탭 회귀 없음(등록만 유지)
