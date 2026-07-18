# 02 — prompt-engineer 완료 보고

## 추가한 export (src/services/prompts.ts)

```ts
export type ChatCharacterId = 'uncle' | 'child' | 'detective' | 'teacher' | 'friend';

export const CHARACTER_NAMES: Record<ChatCharacterId, string[]>;
export const CHARACTER_TITLES: Partial<Record<ChatCharacterId, string[]>>;
```

- `ChatCharacterId`는 claude.ts의 `CharacterId`와 리터럴 동일. **순환 import 회피용 로컬 타입**이다
  (claude.ts가 prompts.ts를 import하므로 반대 방향 import는 만들지 않았다). builder는 claude.ts의
  `CharacterId`를 그대로 키로 써도 타입 호환된다.
- `CHARACTER_TITLES`는 후보가 있는 유형만 등록(`uncle`, `teacher`). `detective`/`child`/`friend`는
  **키 생략 = 호칭 없음(이름만)**. 조회 시 `CHARACTER_TITLES[id] ?? []`로 방어.

## 유형별 이름 개수

| id | 개수 | 톤 |
|----|------|-----|
| uncle | 18 | 중년 남성, 성+옛세대 이름 (박영식·김종배…) |
| child | 18 | 현대 아이, 외자/받침 적은 이름 (하율·은우·시우…) |
| detective | 18 | 진중·스마트, 또렷한 남성계 (정우진·서지훈…) |
| teacher | 18 | 다정·신뢰, 따뜻한 여성계 (김서연·이지원…) |
| friend | 18 | 또래, 성 없는 캐주얼 (하늘·다현·준호…) |

- 계획의 예시 이름(하윤·지호·강태준·이수진·지우 등)은 톤 기준일 뿐이라 **전부 다른 이름으로 새로 작성**.

## 호칭 규칙 (결정론적 부착)

```ts
CHARACTER_TITLES = {
  uncle:   ['아저씨', '부장', '선배'],
  teacher: ['선생님', '쌤'],
  // detective / child / friend: 이름만
}
```

권장 로직(builder가 claude.ts에서 시드 기반 구현):
1. 시나리오 해시로 "부착 여부" 판정(예: `hash % 2 === 0`).
2. 부착 시 `titles[hash % titles.length]`로 후보 하나 선택.
3. 이름+호칭 결합 규칙은 유형 톤에 맞게(예: uncle "박영식 부장" / "영식이 아저씨", teacher "김서연 선생님").
   후보 없는 유형은 이름만 반환.

## builder 사용 예시 (claude.ts)

```ts
import { CHARACTER_NAMES, CHARACTER_TITLES } from './prompts';

function pickCharacterName(id: CharacterId, scenario: string): string {
  const pool = CHARACTER_NAMES[id];
  const base = pool[hashString(scenario) % pool.length];
  const titles = CHARACTER_TITLES[id] ?? [];
  if (titles.length === 0) return base;
  const attach = hashString(scenario + '#title') % 2 === 0;
  if (!attach) return base;
  const title = titles[hashString(scenario + '#pick') % titles.length];
  return `${base} ${title}`;
}
```

## openCharacterSession 프롬프트 보강 (claude.ts, 시그니처 미변경)

user 프롬프트 첫마디 지시에 아래 항목을 추가:
- "너는 배정된 캐릭터 본인이다. 자기 이름과 말투로, 실제 인물이 옆에서 말을 거는 것처럼 인사하며
  시작해 (예: \"나 OOO인데,\" 처럼 스스로를 이름/호칭으로 지칭하며 운을 떼)"
- "정답·교훈·요약 금지. 오직 말을 걸어 끌어들이기만." (기존 제약 유지·강화)
- 기존 규칙(1문장, 캐릭터 이모지로 시작, 사건 인물 이름으로 훅)은 그대로 둠.

**builder 주입 포인트:** openCharacterSession에 displayName을 넘기게 되면, 위 "OOO" 자리를
실제 displayName으로 치환(문장 삽입 or 파라미터화)하면 됨. 현재는 signature 변경 없이
컴파일 안전하게 예시 플레이스홀더로만 넣어둠.

## 완료 파일
- 수정: `/Users/mang/book/src/services/prompts.ts`
- 수정: `/Users/mang/book/src/services/claude.ts` (openCharacterSession user 프롬프트 문구만)
- dead path(CRISIS_*, TEMPLATES.reaction/ratio, harness.ts) 미변경 확인. tsc 대상 파일 에러 0.

---

# 02b — prompt-engineer 후속 (§11 ratio 톤 분기, 2026-07-11)

## 변경 내역
`src/services/prompts.ts`의 `ratio` 템플릿, `{{minority_flag}}` 입력 데이터 줄 아래에 톤 분기 지침 2줄 추가:
- 값에 구체적 숫자(퍼센트·인원)가 실리면 "실제로 오늘 이 사건을 본 사람들 사이에서" 실측 톤으로 인용.
- 값이 비거나 두루뭉술하면 "대체로", "아마 이쯤은" 추정 톤으로 눙치고 단정 금지.
- 괄호로 "문장 수·인용 규칙은 그대로" 명시 → validateOutput 회귀 방지.

**새 `{{변수}}` 도입 없음.** 기존 `{{minority_flag}}` 안내 문구만 확장.

## {{minority_flag}} 값 확인 (harness.ts)
- harness.ts:80 `minority_flag: params.minorityFlag ?? ''` — 미지정 시 빈 문자열.
- harness.ts:24 주석: `"소수파 (7%)" / "다수파 (81%)"` 형식으로 서버가 전달.
- 실데이터일 때 퍼센트·집단 문자열이 실리고 없으면 `''` → 지침의 실측/추정 분기가 이 값 유무와 정확히 매칭.

## validateOutput 충돌 없음
- harness.ts:54-57 `sentences.length <= 4 && hasQuote`. 추가한 것은 **시스템 프롬프트(입력)** 이지 출력이 아니라 검증 텍스트를 늘리지 않음.
- 기존 [절대 규칙] "3문장 초과 금지" 유지, 추가 문구에서 재확인.
- 지침이 큰따옴표 인용을 예시로 권장 → hasQuote 충족에 오히려 유리.
- fill(): 새 플레이스홀더 없어 미치환 throw 위험 0.

## 손대지 않은 것
CRISIS_KEYWORDS, CRISIS_MESSAGE, TEMPLATES.reaction, 다른 캐릭터 템플릿, harness.ts 전체.
