# Builder 완료 보고 — 비판적 사고 AI 채팅

## 수정·신규 파일
1. `src/types/index.ts` — `Message`, `StartChat`, `Chat` params
2. `App.tsx` — `initialRouteName="StartChat"`, StartChat·Chat Screen 등록
3. `src/screens/StartChatScreen.tsx` — 이름·주제 입력, Enter/버튼으로 시작
4. `src/screens/ChatScreen.tsx` — 전면 재작성 (start/continueCriticalChat)
5. `src/components/MessageBubble.tsx` — 신규
6. `src/components/TypingIndicator.tsx` — 신규
7. `src/services/claude.ts` — `startCriticalChat`, `continueCriticalChat` 추가

## 동작
- StartChat: 이름+주제 trim 후 `navigate('Chat', { userName, topic })`
- Chat 마운트: `startCriticalChat` → 첫 AI 질문
- 전송: `continueCriticalChat` → 다음 질문
- 위기 키워드: API 미호출, CRISIS_MESSAGE

## 검증
- `npx tsc --noEmit` → EXIT=0

## 불변
- harness.ts, Today/Write/Calendar, supabase 저널 흐름
