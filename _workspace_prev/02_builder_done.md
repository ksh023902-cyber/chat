# Builder 완료 보고 — 캐릭터 사람 이름 + AI 오프닝 자동발송 + 이름표 UI

## 수정한 파일
1. `src/services/claude.ts`
2. `src/screens/ChatScreen.tsx`
3. `src/components/MessageBubble.tsx`

(prompts.ts는 prompt-engineer가 소유. `CHARACTER_NAMES`/`CHARACTER_TITLES`/`ChatCharacterId` export 및 openCharacterSession 프롬프트 문구를 이미 반영해 두었고, builder는 그 실제 export를 소비만 함.)

---

## 1) src/services/claude.ts

### 추가 import
```ts
import { CHARACTER_NAMES, CHARACTER_TITLES } from './prompts';
```
- 실제 prompts.ts export 확인: `CHARACTER_NAMES: Record<ChatCharacterId, string[]>`, `CHARACTER_TITLES: Partial<Record<ChatCharacterId, string[]>>` (uncle·teacher만 후보 보유). `ChatCharacterId` 유니온은 claude.ts의 `CharacterId`와 동일 값이라 인덱싱 호환.

### 추가 함수
```ts
function hashString(s: string): number
```
- djb2 변형 32bit 해시(`hash*33 + c`, `|0`), `Math.abs`로 항상 양수.

```ts
function pickCharacterName(id: CharacterId, scenario: string): string
```
- `CHARACTER_NAMES[id]` 풀에서 `hashString(scenario) % pool.length`로 이름 선택.
- 풀이 비면 `CHARACTERS[id].name`(유형 라벨)로 안전 폴백.
- `CHARACTER_TITLES[id]`가 있으면 서로 다른 시드(`scenario+'#title-attach'`, `scenario+'#title-pick'`)로 (1) 부착 여부(절반 확률) (2) 후보 선택을 각각 결정론적으로 판정 → `"이름 호칭"` 형태 반환.

```ts
export function getScenarioCharacter(scenario: string):
  { id: CharacterId; emoji: string; displayName: string }
```
- 내부에서 기존 `resolveCharacter(scenario)`로 유형·이모지 획득 → `pickCharacterName`으로 displayName 결정.

### openCharacterSession 보강 (시그니처·반환타입 불변: `(scenario: string) => Promise<string>`)
- `const displayName = pickCharacterName(character.id, scenario);` 계산 후 user 프롬프트에 `[너의 이름] ... "${displayName}"` 주입 + 예시의 "OOO"를 실제 `${displayName}`로 치환. (prompt-engineer가 넣은 "자기 이름으로 인사" 문구에 실제 이름 공급.)

### 불변 확인
- `resolveCharacter`, `generateDailyScenario`, `characterReply`, `generateEnding` 시그니처·반환타입 그대로. 캐시 스키마(`cached_scenario {key,content}`) 미변경(이름은 시나리오 파생값).

---

## 2) src/screens/ChatScreen.tsx

- import에 `openCharacterSession`, `getScenarioCharacter` 추가.
- 상태 추가: `const [character, setCharacter] = useState<{ emoji: string; displayName: string } | null>(null);`
- 마운트 effect 확장 (`mountedRef` 이중실행 가드 유지):
  1. 캐시 로드 → 없으면 `generateDailyScenario()` lazy 생성 → `setScenario`.
  2. `getScenarioCharacter(activeScenario)`로 `setCharacter`.
  3. `setIsTyping(true)` → `openCharacterSession(activeScenario)` → 결과가 비지 않으면 첫 assistant 메시지로 `setMessages([...])` → `finally setIsTyping(false)`.
  4. 실패 시 조용한 폴백: 오프닝 없이 넘어가고 입력창 계속 사용 가능(로그만). `isError` 마킹은 오프닝 경로에서 사용 안 함(기존 오염 패턴 로직과 무충돌).
- 헤더: `"알 수 없음"` → `character?.displayName ?? '알 수 없음'`, `avatarDot` 안에 `character?.emoji` 표시(`avatarEmoji` 스타일 신규, center 정렬 추가). "온라인" 유지.
- `renderItem`: `MessageBubble`에 `characterName={character?.displayName}` `characterEmoji={character?.emoji}` 전달.
- 기존 로직 미변경: `recordStreak`, `canShowEnding(userMsgCount>=3)`, `parseChoices`, KeyboardAvoidingView, sendMessage 내 lazy 생성 등.

---

## 3) src/components/MessageBubble.tsx

- Props에 `characterName?: string`, `characterEmoji?: string` 추가.
- assistant 라벨: `aiLabel = characterEmoji ? `${emoji} ${name}`.trim() : (characterName ?? 'AI')`. 하드코딩 `'AI'` → `aiLabel`. user 측(`userName` "나") 유지. 기존 `sender`/`aiSender` 스타일 재사용, 신규 스타일 없음.

---

## 스트릭 미영향 확인 방법
- `grep`으로 `recordStreak` 호출부 전수 확인: 유일 호출은 `sendMessage`(라인 178). 오프닝 자동발송 effect는 `recordStreak()`·`AsyncStorage 'streak'` 를 일절 호출하지 않음.
- `userMsgCount = messages.filter(m => m.role === 'user').length` — 오프닝은 `role:'assistant'`라 카운트에 미포함 → `canShowEnding` 조건에도 무영향.

## 검증
- `npx tsc --noEmit` → EXIT=0 (타입 에러 없음).

## 남은 이슈 / reviewer 확인 요청
- 런타임 실기기/시뮬레이터 미검증(정적 타입체크만 수행). 진입 즉시 오프닝 1문장 표시 여부, 재진입/스크롤 시 이름 고정(해시 결정론) 여부는 실행 확인 필요.
- `MessageBubble`의 `sender` 스타일에 `textTransform: 'uppercase'`가 남아 있음 — 한글 이름/이모지에는 무효과라 표시상 문제 없음(변경하지 않음).
- 오프닝 실패 시 완전 무메시지(폴백 인사 미출력) 정책을 택함. "유형별 기본 인사 1줄"을 원하면 reviewer 판단으로 추가 가능.
