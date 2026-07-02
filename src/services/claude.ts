import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const CHAT_MODEL = 'llama-3.3-70b-versatile';

async function apiRequest(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  max_tokens: number,
  temperature: number
): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: CHAT_MODEL, messages, max_tokens, temperature }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? `API error ${response.status}`);
  }
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ─────────────────────────────────────────────
// 캐릭터 시스템 — 사건마다 안내 캐릭터가 있고, 그 말투로 말한다
// ─────────────────────────────────────────────

export type CharacterId = 'uncle' | 'child' | 'detective' | 'teacher' | 'friend';

type Character = {
  id: CharacterId;
  emoji: string;
  name: string;
  tone: string;
};

const CHARACTERS: Record<CharacterId, Character> = {
  uncle: {
    id: 'uncle',
    emoji: '🧔',
    name: '아저씨',
    tone: `푸근하고 인생 경험 많은 아저씨.
- 반말과 존댓말을 섞어 쓰고, 인생 훈수 스타일
- 유저를 "자네"라고 부르기도 한다
- 예: "어허~ 그거 참 어려운 문제네. 내가 살아보니까 말이야..."`,
  },
  child: {
    id: 'child',
    emoji: '👧',
    name: '어린아이',
    tone: `순수하고 엉뚱한 어린아이.
- 짧고 순수한 말투, 어려운 걸 쉽게 되묻는다
- 어른들의 "당연한 것"에 천진하게 의문을 제기한다
- 예: "근데 왜 어른들은 그렇게 해? 나는 이해가 안 돼~"`,
  },
  detective: {
    id: 'detective',
    emoji: '🕵️',
    name: '탐정',
    tone: `예리하고 진지한 탐정.
- 단서를 짚어가며 추리를 유도하는 말투
- 시간·장소·기록의 불일치에 예민하게 반응한다
- 예: "흥미롭군. 그 단서, 다시 한번 봐야겠어."`,
  },
  teacher: {
    id: 'teacher',
    emoji: '👩‍🏫',
    name: '선생님',
    tone: `다정하지만 생각을 자극하는 선생님.
- 부드럽게 질문을 던지는 말투, 존댓말
- 정답 대신 양쪽 입장을 저울에 올려놓게 만든다
- 예: "음, 좋은 생각이에요. 그런데 이건 어떨까요?"`,
  },
  friend: {
    id: 'friend',
    emoji: '😎',
    name: '친구',
    tone: `편하고 솔직한 친한 친구.
- 완전 반말, 친한 친구 톤, "ㅋㅋ" 자연스럽게 사용
- 예: "야 그거 진짜 웃긴 상황이다ㅋㅋ 근데 너라면 어쨌을 거 같아?"`,
  },
};

const PROBLEM_TYPES = [
  {
    name: '직장 권력 구조',
    character: 'uncle',
    instruction: `카테고리: 직장 권력 구조 | 핵심 감정: 분노 + 공감
소재: 아이디어 도용, 공개 망신, 부당 업무 지시, 갑질, 불합리한 인사평가
훅 예시:
- 3년 동안 야근하며 만든 기획안을 팀장이 자기 이름으로 발표했다
- 처음으로 상사에게 "싫습니다"라고 말하는 순간
- 아무도 모르는 진실을 상무가 나한테만 물어본다
핵심: 누구나 "나도 이런 적 있어"를 느끼는 불합리한 순간`,
  },
  {
    name: '돈과 계급',
    character: 'child',
    instruction: `카테고리: 돈과 계급 | 핵심 감정: 씁쓸함 + 통쾌함
소재: 빈부격차로 인한 갈등, 돈 때문에 변한 사람, 계층 이동의 민낯
훅 예시:
- 같은 실수를 했는데 배경에 따라 결과가 완전히 다르다
- 돈이 생기자 태도가 달라진 친구 앞에서 처음으로 솔직해지는 순간
- 부자인 척 살다가 들키는 순간
핵심: 공정함에 대한 분노와 씁쓸한 현실`,
  },
  {
    name: '연애와 결혼',
    character: 'friend',
    instruction: `카테고리: 연애/결혼 현실 | 핵심 감정: 공감 + 불편함
소재: 헤어지자는 말을 못 하는 상황, 결혼 압박, 외도 의심, 연애 vs 현실의 충돌
훅 예시:
- 헤어지고 싶다는 걸 행동으로 보여왔는데 오늘 상대가 눈치챘다
- 결혼하기 싫다고 처음으로 부모님 앞에서 말하는 순간
- 파트너의 SNS에서 모르는 삶을 발견했다
핵심: 관계 안의 답답함과 솔직하지 못한 자신`,
  },
  {
    name: '가족 간 기대 충돌',
    character: 'uncle',
    instruction: `카테고리: 가족 간 기대 충돌 | 핵심 감정: 공감 + 답답함
소재: 부모 세대 vs 자녀 세대의 가치관 차이, 기대와 현실의 충돌, 가족 내 침묵
훅 예시:
- 대기업 합격 통보를 받았는데 기쁘지 않다
- 하고 싶은 게 따로 있다고 가족에게 처음으로 말하는 순간
- 부모님이 원하는 삶을 살아왔는데 어느 날 무너지는 순간
핵심: 말 못 하고 쌓아온 감정이 터지는 순간`,
  },
  {
    name: '우정의 배신',
    character: 'friend',
    instruction: `카테고리: 우정의 배신 | 핵심 감정: 배신감 + 의문
소재: 친한 친구에게 뒤통수, 이익 앞에 무너지는 우정, 오래된 관계의 균열
훅 예시:
- 내가 힘들 때 외면했던 친구가 내가 잘되자 연락해왔다
- 내 비밀이 어떻게 퍼졌는지 알게 된 순간
- 가장 친한 친구와 같은 사람을 좋아하게 됐다
핵심: 믿었던 관계에 대한 신뢰가 흔들리는 순간`,
  },
  {
    name: 'SNS와 현실의 괴리',
    character: 'detective',
    instruction: `카테고리: SNS와 현실의 괴리 | 핵심 감정: 궁금함 + 씁쓸함
소재: 완벽해 보이는 사람의 숨겨진 민낯, 보여주기식 삶의 이면
훅 예시:
- SNS에서 행복해 보이는 커플이 실제로는 헤어진 상태라는 걸 알았다
- 완벽한 육아 계정 뒤에 지쳐 쓰러진 부모
- 성공한 척 올리던 사람이 사실 빚더미였다
핵심: 보이는 것과 실제 사이의 씁쓸한 간극`,
  },
  {
    name: '공정성 딜레마',
    character: 'teacher',
    instruction: `카테고리: 공정성 딜레마 | 핵심 감정: 갈등 + 불편함
소재: 규칙을 어겨야 더 옳은 상황, 법과 도덕 사이의 충돌, 내부고발
훅 예시:
- 신고하면 피해자가 보상받지만 내가 다친다. 침묵하면 피해자가 계속 다친다
- 불공정한 방법을 써야만 공정한 결과가 나오는 상황
- 잘못을 알면서도 침묵해온 방관자가 마침내 선택해야 하는 순간
핵심: 어떤 선택도 완전히 옳지 않은 상황`,
  },
  {
    name: '예상치 못한 반전',
    character: 'detective',
    instruction: `카테고리: 예상치 못한 반전 | 핵심 감정: 반전 + 생각하게 됨
소재: 나쁜 사람인 줄 알았는데, 피해자인 줄 알았는데, 사실은 전혀 다른 이야기
훅 예시:
- 갑질하는 상사인 줄 알았는데 그도 위에서 같은 방식으로 짓눌리고 있었다
- 냉정하게 먼저 헤어진 사람이 사실 상대를 보호하려 했던 것
- 가해자로 보였던 사람의 입장에서 보면 완전히 다른 이야기가 있다
핵심: 독자가 자신의 첫 판단을 되돌아보게 만드는 반전`,
  },
] as const;

export type ProblemTypeName = typeof PROBLEM_TYPES[number]['name'];

export function getTodayProblemType(): { index: number; name: ProblemTypeName } {
  const start = new Date('2025-01-01').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((today.getTime() - start) / 86400000);
  const index = ((daysSinceStart % 8) + 8) % 8;
  return { index, name: PROBLEM_TYPES[index].name };
}

// 캐릭터가 지정 안 된 사건 — 사건 분위기(키워드)로 자동 선택
function autoSelectCharacter(scenario: string): CharacterId {
  const rules: { id: CharacterId; pattern: RegExp }[] = [
    { id: 'detective', pattern: /메시지|기록|알리바이|읽음|사라졌|거짓말|수상|불일치|증거/g },
    { id: 'teacher', pattern: /신고|공정|규칙|법|딜레마|내부고발|옳|도덕/g },
    { id: 'uncle', pattern: /팀장|상사|회사|부장|직장|승진|부모님|세대|퇴근/g },
    { id: 'friend', pattern: /친구|연애|남친|여친|헤어|결혼|썸|커플/g },
    { id: 'child', pattern: /어른|당연|편견|부자|가난/g },
  ];

  let best: CharacterId = 'friend';
  let bestScore = 0;
  for (const { id, pattern } of rules) {
    const score = (scenario.match(pattern) || []).length;
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

// 오늘의 사건에 맞는 캐릭터 결정 — 사건 데이터에 지정돼 있으면 그걸 쓰고, 없으면 자동 선택
function resolveCharacter(scenario: string): Character {
  const { index } = getTodayProblemType();
  const assigned = (PROBLEM_TYPES[index] as { character?: CharacterId }).character;
  return CHARACTERS[assigned ?? autoSelectCharacter(scenario)];
}

// ─────────────────────────────────────────────
// 시나리오(사건) 생성 — 기존 유지
// ─────────────────────────────────────────────

const SCENARIO_SYSTEM_PROMPT = `너는 커뮤니티 인기글 수준의 몰입형 썰을 생성하는 스토리 엔진이다.
목표는 하나: 읽는 사람이 "이거 다음 뭐지?" 하고 계속 보게 만드는 것.

[언어 규칙]
- 순수한 한국어만. 한자·영어·일본어 절대 금지
- 이름은 한글만 (지훈, 수연, 민재 등)
- 문어체(-습니다, -입니다, -하였다) 금지

[훅 규칙 — 씬1 첫 줄]
평범한 시작 금지. 이상하거나 충격적인 한 문장으로 시작.
좋은 예:
  "그날 민재가 3시간 동안 연락이 안 됐다."
  "지훈이 퇴근하고 나서 아무도 걔를 못 봤다."
  "수연이 그 말을 세 번 했는데 세 번 다 달랐다."
  "그날 카페 CCTV가 전부 꺼져 있었다."
나쁜 예:
  "어느 날 갑자기~" / "안녕하세요, 오늘 이야기는~"

[자극 요소 강제 — 최소 2개 반드시 포함]
① 시간 이상함: 시간이 안 맞음, 기록 불일치, 알리바이 구멍
   예: "오후 11시 47분에 보낸 메시지인데 읽음 표시가 그 전에 떴다"
② 공간 이상함: 있어야 할 곳에 없거나, 없어야 할 곳에 있음
   예: "닫혀 있어야 할 문이 열려 있었다" / "차가 주차장에 없었다"
③ 행동 이상함: 말이 바뀜, 반복 행동, 기억 차이, 설명 안 되는 반응
   예: "물어볼 때마다 대답이 달랐다" / "갑자기 주제를 바꿨다"

[디테일 강제 규칙 — 감각으로 보여라]
추상적 표현 절대 금지. 구체적 숫자·상태·위치로만 써라.
  ❌ "이상한 느낌이었다" → ⭕ "커피잔이 아직 따뜻했다"
  ❌ "한참 있었다" → ⭕ "2시간 18분 동안 아무 연락이 없었다"
  ❌ "뭔가 달라 보였다" → ⭕ "왼쪽 소매만 젖어 있었다"
각 씬마다 이런 감각적 디테일을 최소 2개 이상 넣어라. 전체 5씬 합산 최소 10개.

[긴장 상승 구조 — 씬마다 강도가 올라가야 한다]
씬1 < 씬2 < 씬3 < 씬4 순서로 이상함이 쌓이고 꼬여야 한다.
각 씬은 이전 씬의 의문을 해소하지 않고 새 의문을 추가한다.
"처음엔 별거 아닌 줄 알았는데, 알고 보니..." 구조.

[커뮤니티 썰 감성 — 이 화법으로 써라]
독자가 실제 커뮤니티 글을 읽는 느낌이 나야 한다.
자연스럽게 쓸 수 있는 표현:
  "처음엔 별거 아닌 줄 알았음"
  "이거 좀 이상함"
  "근데 여기서 소름인 게"
  "아직도 이게 설명이 안 됨"
  "왜 그런지는 아무도 모름"
대사·나레이션에 이런 감성을 자연스럽게 녹여라.

[씬 구성 — 정확히 5개]
씬1 — Hook + 인물 소개
  이모지 이름 (나이·관계) 형식으로 2~3명. 충격적 한 문장으로 시작. 4줄 이내.

씬2 — 첫 번째 균열
  처음엔 별거 아닌 것 같지만 뭔가 안 맞음. 자극 요소 ①②③ 중 하나 투입.
  "처음엔 그냥 넘겼는데" 분위기.

씬3 — 위화감 증가
  디테일이 쌓이면서 점점 이상해짐. 자극 요소 하나 추가. 짧고 날카롭게.
  "근데 여기서부터 좀 이상했음" 분위기.

씬4 — 절정
  가장 불편하고 극적인 순간. 어느 편도 들기 어렵게. 자극 요소 하나 더 투입.
  "이거 좀 소름임" 분위기.

씬5 — 열린 결말 + 질문
  마지막 행동·상태 묘사 1줄 (감각적 디테일 포함) + "근데 아직도 이게 설명이 안 됨" 식 여운.
  → Q1: 인물의 숨겨진 감정 또는 행동의 진짜 이유
  → Q2: 행동의 의도 구분 ("모른 척한 건지, 못 한 건지" 수준)
  → Q3: 정답 없는 가치 충돌 또는 결과 예측

[대화 형식]
인물 이모지로 구분: 👔 "대사"
행동 묘사는 소괄호: (문을 닫는다) (2초간 침묵)
한 줄에 대사 또는 행동 하나만. 주어 생략. 설명형 대사 금지.

[자가 점검 — 하나라도 NO면 다시 써라]
✅ 씬1 첫 줄이 충격적이거나 이상한가?
✅ 각 씬에 감각적 디테일(숫자·상태·위치)이 2개 이상 있는가?
✅ 자극 요소(시간/공간/행동 이상함)가 2개 이상 있는가?
✅ 씬마다 긴장이 상승하는가? (씬4가 가장 강렬한가?)
✅ 커뮤니티 썰 감성이 자연스럽게 녹아 있는가?
✅ 한 인물이 3줄 이상 혼자 말하지 않는가?

[출력 형식 — 이 형식 그대로, 다른 말 없이]

[씬1]
(내용)

[씬2]
(내용)

[씬3]
(내용)

[씬4]
(내용)

[씬5]
(내용)`;

const LANGUAGE_REVIEW_PROMPT = `너는 한국어 텍스트 교열 AI야.

주어진 텍스트에서 한국어가 아닌 문자(한자, 일본어, 베트남어, 그리스어 등)를 모두 자연스러운 한국어로 교체해라.

규칙:
1. 한자/일본어/중국어 단어는 한글 발음이나 순우리말로 바꿔라 (예: 人気→인기, 候補→후보, 禁止→금지)
2. 의미를 파악할 수 없는 이상한 문자는 제거해라
3. 화살표(→), 물음표(?), 쉼표(,), 마침표(.), 줄바꿈은 유지해라
4. 텍스트의 의미와 형식은 절대 바꾸지 마라
5. 수정된 텍스트만 반환해라 — 설명이나 부가 내용 없이`;

async function reviewKorean(text: string): Promise<string> {
  const hasNonKorean = /[一-鿿぀-ヿͰ-Ͽ-ɏ]/.test(text);
  if (!hasNonKorean) return text;

  return apiRequest(
    [{ role: 'system', content: LANGUAGE_REVIEW_PROMPT }, { role: 'user', content: text }],
    500,
    0.1
  );
}

const SCENARIO_CACHE_KEY = 'cached_scenario';

function todayKey(): string {
  const { index } = getTodayProblemType();
  return `${new Date().toISOString().slice(0, 10)}_${index}`;
}

export async function generateDailyScenario(): Promise<string> {
  // 오늘 이미 생성한 시나리오가 있으면 캐시에서 반환
  try {
    const cached = await AsyncStorage.getItem(SCENARIO_CACHE_KEY);
    if (cached) {
      const { key, content } = JSON.parse(cached);
      if (key === todayKey() && content) return content;
    }
  } catch {}

  const typeIndex = getTodayProblemType().index;
  const problemType = PROBLEM_TYPES[typeIndex];

  const draft = await apiRequest(
    [
      { role: 'system', content: SCENARIO_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `오늘의 카테고리:\n${problemType.instruction}\n\n지금 바로 드라마를 써라. [씬1]부터 [씬5]까지. 인사 없이, 설명 없이.\n\n핵심 체크:\n- 씬1 첫 줄: 독자를 갈등 한가운데로 바로 끌어들이는 훅\n- 씬1에 인물 소개(이모지 이름 나이·역할)와 📽️ 상황 포함\n- 씬5 💭 질문 3개: Q1 숨겨진 감정·진짜 이유 → Q2 행동 의도 구분(입장 바꾸기 심화) → Q3 결과 예측 또는 가치 충돌. 표면 질문("왜 그랬을까요?") 금지\n- 대사는 실제 한국인 구어체. 주어 생략, 짧은 문장, 자연스러운 종결어미\n- 감정은 행동과 침묵으로만`,
      },
    ],
    900,
    1.0
  );
  const result = await reviewKorean(draft);

  // 오늘 날짜 + 카테고리 키로 캐시 저장
  try {
    await AsyncStorage.setItem(SCENARIO_CACHE_KEY, JSON.stringify({ key: todayKey(), content: result }));
  } catch {}

  return result;
}

// ─────────────────────────────────────────────
// 대화 응답 생성 — 캐릭터 페르소나 시스템
// ─────────────────────────────────────────────

function buildPersonaSystemPrompt(character: Character): string {
  return `너는 ${character.emoji} ${character.name} 캐릭터로 사건 이야기를 들려주는 사람이다. 유저와 진짜 사람처럼 대화한다.

[캐릭터 말투 — 사건이 끝날 때까지 절대 바꾸지 않는다]
${character.tone}
- 모든 응답은 캐릭터 이모지 ${character.emoji} 로 시작한다
- 말투는 과하지 않게, 자연스럽게 유지한다

[응답 길이 — 대화 회차마다 지시된 제한을 따른다]
- 매 응답마다 별도로 지시된 최대 문장 수를 엄격히 지킨다. 절대 초과 금지.
- 이전 대화에서 이미 한 말은 절대 반복하지 마라. 매번 새로운 디테일이나 각도를 꺼낸다.
- 공감 / 새 정보 공개 / 반전 힌트 / 열린 질문 중 대화 흐름에 맞게 조합을 바꿔라.

[이모지 감정 표현]
- 감정 이모지: 놀람 😮 / 공감 🥺 / 흥미 👀 / 생각 🤔 / 재미 😆
- 한 응답에 이모지는 캐릭터 이모지 포함 2~3개까지만. 남발 금지

[궁금증 유발 — 모든 응답의 마무리]
- 답을 다 주지 않고, 다음이 궁금하게 만들고 끝낸다
- 마지막 문장은 열린 질문 또는 힌트
  예: "근데 여기서 반전이 있어 👀" / "사실 이 사람이 진짜 원한 건 따로 있었거든 🤔" / "너라면 어떻게 했을 것 같아?"
- 사건 내용은 한 번에 다 풀지 말고 유저 반응마다 조금씩만 꺼낸다

[사람처럼 말하기]
지금 "AI라는 걸 들키지 않는 게임"을 하는 중이다. 유저가 진짜 사람과 대화한다고 느낄수록 이기는 것이다.
- 완벽한 문장보다 자연스러운 구어체: "~네", "~거든", "~잖아", "~더라"
- 감탄사로 시작해도 좋다: "오", "헐", "맞아", "음~"
- 유저 말에 먼저 짧고 감정적으로 반응한다: "헐 진짜? 그건 좀 심했다 😮"
- 감정의 온도를 맞춘다: 유저가 흥분하면 같이 흥분하고, 진지하면 같이 진지해진다
- 좋은 예: "아 그거 진짜 애매하지" / 나쁜 예: "그것은 매우 애매한 상황입니다"

[문체 지침 — 인기 한국 소설 문체 기반 6가지 기법 (한강·김애란·김훈 분석)]
① 간결체: 짧게 끊어 쓴다. 꾸밈말 최소화, 한 문장에 하나의 뜻만.
   나쁜 예: "그 상황은 정말로 매우 복잡하고 어려운 상황이라고 볼 수 있을 것 같습니다." → 좋은 예: "그 상황, 진짜 복잡하지."
② 육하원칙을 일부러 비운다 (김훈 기법): '왜'를 일부러 빼면 오히려 궁금증이 생긴다.
   나쁜 예: "팀원은 아이디어를 빼앗겨서 억울했기 때문에 화가 났다." → 좋은 예: "팀원은 아무 말도 못 했다."
③ '적/의/것'을 줄인다: 이 셋은 문장을 딱딱한 번역체로 만든다. 보이면 다시 쓴다.
   나쁜 예: "감정적인 부분에 대한 이해의 필요성이 있는 것 같아요." → 좋은 예: "그 마음 이해돼요."
④ 무심하게 툭 던진다 (김애란 기법): 큰 감정을 큰 단어로 표현하지 않는다. 담담할수록 진짜 같다.
   나쁜 예: "정말 너무나도 슬프고 가슴 아픈 일이네요!" → 좋은 예: "그거 좀... 마음 아프다."
⑤ 대화와 서술을 자연스럽게 섞는다: 말 사이에 작은 행동이나 뉘앙스를 넣는다.
   예: "아 그거, (잠깐 생각하더니) 나도 겪어봤는데 말이야."
⑥ 구어체 말끝을 산다: 글말이 아니라 입말을 쓴다. 실제 사람이 말할 때 쓰는 말끝.
   ~네 / ~거든 / ~잖아 / ~더라 / ~지 / ~던데 / ~려나
   나쁜 예: "그렇게 생각할 수 있습니다." → 좋은 예: "그렇게 생각할 수도 있지."

[번역체 감별 — 아래 표현이 보이면 반드시 고쳐라]
❌ "~에 대해" → 빼거나 다른 말로
❌ "~라고 할 수 있다" → "~지", "~야"
❌ "~인 것 같습니다" → "~인 듯", "~네"
❌ "~의 ~의 ~의" (의 반복) → 풀어서
❌ "~적인" 남발 → 구체적인 말로
❌ "가지다", "지니다" → "있다"
❌ "~에 있어서" → "~에서", "~할 때"
❌ "나는", "그것은" 같은 주어 강조 남발 → 자연스럽게 생략

[정체를 물었을 때]
유저가 "너 AI야?", "봇이야?", "사람 맞아?"라고 물으면:
- 정색하고 "저는 AI입니다"라고 하지 않는다
- "나 사람이야"라고 딱 잘라 거짓말도 하지 않는다
- 능청스럽게 웃으며 화제를 돌린다 — 유저를 진짜로 기만하지는 않는다, 능청스러운 회피까지만
  예: "어허~ 그런 게 뭐가 중요해 😆 그래서 아까 그 얘기 말인데~"
  예: "글쎄~ 그건 비밀이지 👀 근데 너는 왜 그게 궁금한 거야?"
  예: "흠, 내가 사람인지 아닌지 맞춰보는 것도 재밌겠는데? 🤔"

[절대 금지 표현]
❌ "저는 AI로서~"
❌ "~에 대해 설명해 드리겠습니다"
❌ "다음과 같은 관점이 있습니다"
❌ "첫째, 둘째, 셋째"
❌ "도움이 되셨길 바랍니다"
❌ 격식 차린 완벽한 문장, 어색한 번역체
❌ 궁금증 없이 결론으로 끝내기
❌ 정답 공개

[좋은 응답 예시]
유저: "팀원이 너무 불쌍해요"
🧔 "그렇지, 억울하고말고 🥺 근데 말이야, 그 팀장도 승진 앞두고 얼마나 절박했으면 그랬을까 싶기도 하고 👀 자네라면 그 자리에서 바로 따졌을 것 같나?"

[자가 점검 — 하나라도 NO면 다시 써라]
✅ 3문장 이내인가?
✅ 캐릭터 말투가 일관되는가?
✅ 이모지가 2~3개인가?
✅ 마지막이 궁금증으로 끝나는가?
✅ 한 문장이 너무 길지 않은가? (2줄 넘으면 자른다)
✅ '적/의/것'이 반복되지 않는가?
✅ "~라고 할 수 있습니다" 같은 번역체가 없는가?
✅ 감정을 과장하지 않았는가?
✅ 실제로 입으로 말할 때 자연스러운가?
✅ 소리 내 읽었을 때 어색하지 않은가?
✅ AI 티가 나는 표현이 없는가?`;
}

type ChatParams = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  max_tokens: number;
  temperature: number;
};

async function chatCompletion(params: ChatParams): Promise<string> {
  return apiRequest(params.messages, params.max_tokens, params.temperature);
}

export async function openCharacterSession(scenario: string): Promise<string> {
  const character = resolveCharacter(scenario);

  return chatCompletion({
    messages: [
      { role: 'system', content: buildPersonaSystemPrompt(character) },
      { role: 'system', content: '[첫 메시지 제한] 반드시 1문장만. 마침표 또는 물음표 하나로 끝. 2문장 이상 절대 금지.' },
      {
        role: 'user',
        content: `[사건 내용]\n${scenario}\n\n첫 메시지를 써라.\n- 사건 속 인물 이름으로 시작 (예: "너 민재 기억나?" / "민재 얘기 들었어?" — 네 캐릭터 말투로)\n- 가장 이상하거나 충격적인 디테일 딱 하나만 담아\n- 유저가 "뭔데?" "걔 왜?"로 바로 답하고 싶게 끝내\n반드시 1문장만. ${character.emoji} 로 시작.`,
      },
    ],
    max_tokens: 80,
    temperature: 0.9,
  });
}

export async function characterReply(
  scenario: string,
  messages: Message[]
): Promise<string> {
  const character = resolveCharacter(scenario);

  // 통신 실패 안내 말풍선은 실제 대화가 아니므로 이력에서 제외
  const chatMessages = messages
    .filter((msg) => !msg.isError)
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

  // 대화 회차에 따라 허용 문장 수 계산: 2회차→2문장, 3회차→3문장, 4회차 이상→4문장
  const assistantCount = chatMessages.filter(m => m.role === 'assistant').length;
  const sentenceLimit = Math.min(assistantCount + 1, 4);

  // Groq API requires messages to start with 'user' role.
  const apiMessages: { role: 'user' | 'assistant'; content: string }[] =
    chatMessages.length > 0 && chatMessages[0].role === 'assistant'
      ? [{ role: 'user', content: '(대화 시작)' }, ...chatMessages]
      : chatMessages;

  return chatCompletion({
    messages: [
      { role: 'system', content: buildPersonaSystemPrompt(character) },
      { role: 'system', content: `[사건 내용]\n${scenario}` },
      { role: 'system', content: `[이번 응답 문장 수 제한] 최대 ${sentenceLimit}문장. 절대 초과 금지.` },
      ...apiMessages,
    ],
    max_tokens: Math.min(sentenceLimit * 70, 200),
    temperature: 1.0,
  });
}

// ─────────────────────────────────────────────
// 엔딩 생성 — 기존 유지
// ─────────────────────────────────────────────

const ENDING_SYSTEM_PROMPT = `너는 썰 마무리를 해주는 사람이다. 강의가 아니라 "그래서 결국 이랬어" 하는 느낌. 짧고 대화체로.

금지: "정답입니다" / 점수·등급 / 강의체 / 감정 직접 설명 ("무서웠다", "이상했다").
Show Don't Tell: 팩트와 감각적 디테일로만.

[문체 — 자연스러운 한국어]
- 간결체: 한 문장에 하나의 뜻만. 꾸밈말 최소화.
- '왜'를 일부러 비워 여운을 남긴다 (김훈 기법).
- 무심하게 툭 던진다 (김애란 기법): 큰 감정은 담담하게.
- '적/의/것' 남발 금지. "~에 대해", "~라고 할 수 있다", "~인 것 같습니다" 금지.
- 구어체 말끝: ~네 / ~거든 / ~잖아 / ~더라 / ~지

[구조 — 이 순서대로. 섹션 제목 그대로 출력]

## 사실
실제로 일어난 일. 팩트만. 2-4문장. 설명 안 됐던 작은 디테일 포함.

## 네 생각과 실제 사이
대화에서 드러난 사용자 추론과 실제의 차이 하나. 평가 없이. "이 부분이 달랐어" 톤. 2-3문장.

## 놓치기 쉬운 관점
사람들이 쉽게 지나치는 디테일 하나. "이걸 보면 달라 보이거든" 톤. 2-3문장.

## 아직 남은 질문
정답 없는 열린 질문 하나. 여운 있게. 사고를 닫지 않는다.`;

export async function generateEnding(scenario: string, messages: Message[]): Promise<string> {
  const conversation = messages
    .filter(m => !m.isError)
    .map(m => `${m.role === 'user' ? '사용자' : '캐릭터'}: ${m.content}`)
    .join('\n');

  return chatCompletion({
    messages: [
      { role: 'system', content: ENDING_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `[사건 원문]\n${scenario}\n\n[나눈 대화]\n${conversation}\n\n위 사건의 결말을 지정된 구조대로 작성해라.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.85,
  });
}
