# 03 — Reviewer 검토 결과

## 종합: **PASS** (FAIL 항목 없음)

`npx tsc --noEmit` → EXIT=0 (타입 에러 없음).

## 경계면별 검증

1. **타입 일치 PASS** — `prompts.ts:234` `ChatCharacterId`와 `claude.ts:83` `CharacterId` 모두 `'uncle'|'child'|'detective'|'teacher'|'friend'`로 리터럴 정확히 동일. `CHARACTER_NAMES[id]`/`CHARACTER_TITLES[id]` 인덱싱 호환. (harness.ts·prompts.ts `CHARACTERS`는 `kid` 키를 쓰지만 이 경로와 무관, 미변경.)

2. **함수 존재/컴파일 PASS** — `hashString`(claude.ts:276, 순수 djb2+Math.abs), `pickCharacterName`(287), `getScenarioCharacter`(307, export) 모두 존재. tsc 통과.

3. **openCharacterSession 시그니처 PASS** — `(scenario: string) => Promise<string>` 불변. diff상 유일 변경은 user 프롬프트 문자열(허용 경계). `displayName`은 프롬프트 문자열 안(claude.ts:633,640)에만 주입, 반환 형식·타입 변화 없음.

4. **ChatScreen PASS**
   - 오프닝 자동발송이 `mountedRef` 가드(88-136) 안, 정확히 1회.
   - `recordStreak()`는 `sendMessage`(178)에서만 호출. 오프닝 effect엔 없음 — 스트릭 회귀 없음.
   - `userMsgCount = messages.filter(m => m.role === 'user')`(235) — 오프닝 assistant는 미포함, `canShowEnding` 무영향.
   - 헤더 `"알 수 없음"` → `character?.displayName ?? '알 수 없음'`(271), 아바타에 이모지(268) 표시.

5. **MessageBubble PASS** — `characterName?`/`characterEmoji?` prop 추가(8-9). assistant 라벨만 `aiLabel`로 교체, user 측 `userName`("나") 로직(39) 그대로.

6. **회귀 경계 PASS** — `git diff --name-only`상 기능 관련 변경은 claude.ts·prompts.ts·ChatScreen·MessageBubble 4개뿐. AlarmScreen/notifications/PerspectiveScreen/types(RootStackParamList)/harness.ts **미변경**. prompts.ts는 **삭제 라인 0**(추가만) → CRISIS_KEYWORDS/CRISIS_MESSAGE/TEMPLATES.reaction/ratio 무손상. `cached_scenario {key,content}` 스키마 미변경.
   - (참고: app.json·package.json·apiConfig.ts·settings.local.json은 이번 작업 시작 전부터 M 상태였던 무관한 선행 변경.)

7. **해시 결정론 PASS** — `pickCharacterName`/`hashString`은 `scenario` 문자열이 입력인 순수 함수. displayName은 (date-파생 id, scenario)로 결정. 시나리오가 일 단위 캐시라 재진입/스크롤 시 동일. "한 사건 내 이름 고정" 충족.

## 비차단 관찰(수정 불요)
- MessageBubble `sender` 스타일 `textTransform:'uppercase'` 잔존 — 한글/이모지 무영향(builder도 기록).
- 오프닝 실패 시 무메시지 폴백 정책 — 계획 122번 라인 허용 범위.
- 런타임 실기기 검증은 미수행(정적 검증만).
