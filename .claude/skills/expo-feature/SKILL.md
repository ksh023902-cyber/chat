---
name: expo-feature
description: >
  Expo React Native 앱의 새 기능 개발, 화면 추가, 버그 수정, 컴포넌트 구현, harness 연동을
  오케스트레이션하는 메인 스킬. "새 화면", "기능 추가", "버그 수정", "컴포넌트", "harness 연동",
  "다시 구현", "수정해줘" 등 이 앱의 개발 작업이 포함되면 반드시 이 스킬을 사용할 것.
---

# Expo Feature — 개발 오케스트레이터

## 실행 모드: 에이전트 팀 (파이프라인)

planner → builder / prompt-engineer → reviewer 순서로 팀이 협업한다.

---

## Phase 0: 컨텍스트 확인

`_workspace/` 존재 여부로 실행 모드를 결정한다.

| 상태 | 실행 모드 |
|------|----------|
| `_workspace/` 없음 | 초기 실행 |
| `_workspace/` 있음 + 부분 수정 요청 | 부분 재실행 (해당 에이전트만) |
| `_workspace/` 있음 + 새 요청 | `_workspace/` → `_workspace_prev/` 이동 후 새 실행 |

---

## Phase 1: 계획 (planner)

planner 에이전트를 호출한다. `model: "opus"` 필수.

**planner가 수행할 작업:**
1. 관련 파일 읽기 (`src/screens/`, `src/services/`, `src/types/index.ts`, `App.tsx`)
2. 구현 계획 작성 → `_workspace/01_plan.md` 저장
3. AI 기능 포함 여부 판단 → 포함이면 prompt-engineer 작업 분리
4. builder / prompt-engineer에게 SendMessage로 계획 전달

---

## Phase 2: 구현 (builder + prompt-engineer, 병렬)

두 에이전트를 동시에 실행한다. `model: "opus"` 필수.

**builder:** 스크린·컴포넌트·서비스 파일 구현
- Expo 문서: https://docs.expo.dev/versions/v56.0.0/ 참조
- 결과 → `_workspace/02_builder_done.md`

**prompt-engineer:** (AI 기능이 있을 때만)
- `prompts.ts` TEMPLATES·FEWSHOTS·MODE_RULES 작성/수정
- `validateOutput` 통과 근거 포함
- 결과 → `_workspace/02_prompt_done.md`

---

## Phase 3: 검토 (reviewer)

reviewer 에이전트를 호출한다. `model: "opus"` 필수.

**reviewer가 교차 비교할 경계면:**
- `RootStackParamList` ↔ `App.tsx` Stack.Screen 일치
- `prompts.ts` 변수 ↔ `harness.ts` vars 객체 1:1 매핑
- `CharacterId`·`ModeId` 타입 ↔ CHARACTERS·MODE_RULES 키 일치
- validateOutput 기준 ↔ 퓨샷 응답 길이·인용 포함

FAIL 시 builder/prompt-engineer에게 수정 요청 → Phase 2 부분 재실행.
PASS 시 오케스트레이터에게 최종 보고.

---

## 데이터 전달

| 단계 | 파일 |
|------|------|
| planner 산출물 | `_workspace/01_plan.md` |
| builder 완료 | `_workspace/02_builder_done.md` |
| prompt 완료 | `_workspace/02_prompt_done.md` |
| reviewer 결과 | `_workspace/03_review.md` |

중간 파일은 `_workspace/`에 보존한다 (감사 추적용).

---

## 에러 핸들링

- Phase 2 실패 → 1회 재시도. 재실패 시 해당 파일 없이 Phase 3 진행, 결과에 누락 명시
- reviewer FAIL 2회 연속 → 사용자에게 수동 판단 요청

---

## 테스트 시나리오

**정상 흐름:**
> "PerspectiveScreen에서 사용자가 답변을 제출하면 harness로 캐릭터 반응을 보여주는 기능 추가해줘"

→ planner: 계획 수립 → builder: UI 구현 + harness 연동 → prompt-engineer: reaction 템플릿 퓨샷 추가 → reviewer: 타입·harness 정합성 확인

**에러 흐름:**
> builder가 `RootStackParamList` 수정 없이 새 스크린을 추가

→ reviewer FAIL → builder에게 `src/types/index.ts` 수정 요청
