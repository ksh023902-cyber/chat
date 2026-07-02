---
name: prompt-lab
description: >
  AI 프롬프트 설계·개선·테스트 전용 스킬. "프롬프트 개선", "캐릭터 말투 수정", "퓨샷 추가",
  "TEMPLATES 수정", "위기 키워드", "MODE_RULES", "시나리오 품질", "결말 프롬프트",
  "응답이 너무 길어", "인용이 안 나와" 등 AI 출력 품질 관련 작업이면 이 스킬을 사용할 것.
  harness.ts의 validateOutput 기준, claude.ts의 시스템 프롬프트 둘 다 포함.
---

# Prompt Lab — AI 프롬프트 설계·검증

## 두 가지 프롬프트 시스템

이 앱에는 두 가지 AI 시스템이 공존한다. 작업 전 어느 쪽인지 먼저 파악한다.

| 시스템 | 파일 | 용도 | 제약 |
|--------|------|------|------|
| **harness** | `src/services/prompts.ts` | 입장 반응·비율 반응 | validateOutput: ≤4문장 + 인용 필수 |
| **claude** | `src/services/claude.ts` | 시나리오·캐릭터채팅·결말 | 자가 점검 체크리스트 내장 |

---

## harness 프롬프트 작업

### 변수 치환 규칙
`fill()` 함수가 `{{변수명}}` 형식으로 치환한다. 템플릿에서 사용 가능한 변수:

```
reaction 타입: character_name, character_style, mode_rule, situation, user_choice
ratio 타입:    위 모두 + percent, group
```

누락된 변수가 있으면 런타임 에러가 발생한다. 템플릿 수정 시 변수 목록을 반드시 확인한다.

### validateOutput 통과 조건
```typescript
sentences.length <= 4  // [.!?…]\s|\n 으로 분리
hasQuote               // " ' ' ' 「 중 하나 존재
```

퓨샷의 `assistant` 응답은 모두 이 조건을 충족해야 한다.

### 퓨샷 작성 가이드
- `user`: 실제 사용자가 입력할 법한 짧고 자연스러운 한국어 (1-2문장)
- `assistant`: 캐릭터 이모지로 시작, 3문장 이내, 반드시 인용(`"..."`) 포함
- 각 캐릭터별 1-3개가 적절 (너무 많으면 컨텍스트 낭비)

### 위기 키워드 관리
`CRISIS_KEYWORDS`에 추가할 때 오탐 위험을 검토한다.
- 너무 짧은 단어는 일반 문장에 포함될 수 있음 (예: "죽을" 단독 → 오탐 위험)
- 2어절 이상의 구체적 표현 권장 (예: "죽고 싶", "극단적 선택")

### CharacterId·ModeId 확장
새 캐릭터/모드 추가 시:
1. `prompts.ts`의 `CHARACTERS` / `MODE_RULES`에 추가
2. `harness.ts`의 `CharacterId` / `ModeId` 타입에 추가
3. `claude.ts`의 `CharacterId`·`CHARACTERS`와 일관성 확인 (`child` vs `kid` 키 차이 주의)

---

## claude.ts 프롬프트 작업

### 시스템 프롬프트 수정 시 주의사항
- `SCENARIO_SYSTEM_PROMPT`: 씬 구성·자극 요소·커뮤니티 감성 유지
- `buildPersonaSystemPrompt()`: 캐릭터 이모지·말투·문장 수 제한 일관성 유지
- `ENDING_SYSTEM_PROMPT`: Show Don't Tell 원칙·섹션 구조 유지

### 품질 테스트 방법
1. 수정 전 기존 프롬프트 출력 샘플 저장 (`_workspace/prompt_before.md`)
2. 수정 후 동일 입력으로 출력 비교 (`_workspace/prompt_after.md`)
3. 개선된 항목·회귀한 항목 모두 기록

---

## 작업 흐름

1. 어느 시스템인지 파악
2. 현재 프롬프트 읽기
3. 문제 진단 (출력 길이? 인용 누락? 말투 이탈? 반복?)
4. 수정 초안 작성
5. validateOutput·자가 점검 기준 대조
6. 사용자에게 변경 전/후 비교 제시
