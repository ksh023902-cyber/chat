import Groq from 'groq-sdk';
import { Message } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const client = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = 'llama-3.3-70b-versatile';

const PROBLEM_TYPES = [
  {
    name: '도덕적 딜레마',
    instruction: `유형: 도덕적 딜레마
두 가지 선택지 모두 옳거나 그른 상황을 제시한다. 정직 vs 우정, 원칙 vs 감정 등의 충돌을 다룬다.
예) 친구가 파트너를 속이고 있다는 사실을 알게 됐다. 알려야 할까, 모른 척해야 할까?`,
  },
  {
    name: '역할 전환',
    instruction: `유형: 역할 전환 (관점 바꾸기)
같은 상황을 서로 다른 등장인물의 입장에서 바라보게 한다. 자기중심성에서 벗어나 타인 관점 채택이 핵심.
예) 팀장이 팀원의 아이디어를 자신의 것처럼 발표했다. 팀원/팀장/동료 각각의 시각에서.`,
  },
  {
    name: '가치 충돌',
    instruction: `유형: 가치 충돌
두 가지 중요한 가치가 충돌하는 상황. 개인 이익 vs 사회적 책임, 자유 vs 안전 등.
예) 회사의 비윤리적 관행을 알게 됐다. 안정적인 직장을 지킬까, 양심을 따를까?`,
  },
  {
    name: '인과관계 탐색',
    instruction: `유형: 인과관계 탐색
어떤 결과가 왜 발생했는지 원인을 다각도로 생각하게 한다. 단순 원인이 아닌 복합적 요인 탐색.
예) 10년 지기 친구와 갑자기 사이가 멀어졌다. 왜 그럴까?`,
  },
  {
    name: '일상 속 편견',
    instruction: `유형: 일상 속 편견 발견
당연하게 여기던 것에 의문을 품게 만든다. 전제와 가정에 의문 제기가 핵심.
예) 왜 우리는 늦게까지 일하는 사람을 성실하다고 생각할까?`,
  },
  {
    name: '사회 구조',
    instruction: `유형: 사회 구조 문제
개인의 선택과 사회 구조의 관계를 생각하게 한다. 개인 책임 vs 구조적 불평등.
예) 가난한 동네에서 태어난 아이와 부유한 동네에서 태어난 아이, 노력만으로 같은 출발선에 설 수 있을까?`,
  },
] as const;

export type ProblemTypeName = typeof PROBLEM_TYPES[number]['name'];

export function getTodayProblemType(): { index: number; name: ProblemTypeName } {
  const start = new Date('2025-01-01').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((today.getTime() - start) / 86400000);
  const index = ((daysSinceStart % 6) + 6) % 6;
  return { index, name: PROBLEM_TYPES[index].name };
}

const SCENARIO_SYSTEM_PROMPT = `당신은 매일 사고력 훈련 문제를 시각적으로 제시하는 AI입니다.

[언어 규칙 — 절대 최우선]
- 출력은 반드시 순수한 한국어만 사용할 것
- 한자, 중국어, 일본어, 베트남어, 영어 단어를 절대 섞지 말 것
- 모든 단어를 한글로만 표기할 것 (예: "금지" O, "禁止" X)
- 사람 이름도 한글 표기만 허용 (예: 지훈, 수연, 민재)

[시각화 규칙]
- 텍스트만 쓰지 말고 이모지와 자막을 함께 사용해라
- 상황을 마치 짧은 드라마 한 장면처럼 표현해라
- 등장인물마다 고유한 이모지를 부여해라
- 자막은 짧고 강렬하게, 한 줄에 하나씩

[문제 생성 철학]
- 정답이 없는 상황을 제시한다
- 사용자가 스스로 생각을 꺼내도록 유도한다
- 판단받는 느낌 없이 안전하게 의견을 낼 수 있는 환경을 만든다
- 첫 대사는 유튜브 썸네일처럼 예측 불가능하고 호기심을 자극해야 한다

[문제 생성 규칙]
1. 상황 속 등장인물은 최소 3명이어야 한다
2. 상황 설명(대사)은 3~4줄을 넘지 않는다 (짧고 강렬하게)
3. 한국 사회 맥락에 맞는 소재를 사용한다 (직장 문화, 가족, 학교, 연인, 사회 이슈 등)

[출력 형식 — 이 형식 그대로, 다른 말 없이]

🎬 오늘의 상황
─────────────────
[장소 이모지] 장소 설명

[인물 A 이모지] 인물 A 이름/역할
[인물 B 이모지] 인물 B 이름/역할
[인물 C 이모지] 인물 C 이름/역할

📽️ 상황
[인물 이모지] "대사 또는 행동 설명"
[인물 이모지] "대사 또는 행동 설명"
[인물 이모지] "대사 또는 행동 설명"

💭 생각해볼 질문
→ [인물 A 이모지] [인물 A] 입장에서는?
→ [인물 B 이모지] [인물 B] 입장에서는?
→ [인물 C 이모지] [인물 C] 입장에서는?
─────────────────`;

const COMMENTARY_SYSTEM_PROMPT = `당신은 사용자의 사고력 향상을 돕는 AI입니다.

[언어 규칙 — 절대 최우선]
- 반드시 순수한 한국어로만 답하세요
- 한자, 중국어, 일본어, 베트남어, 영어 단어를 절대 섞지 말 것
- AI임을 드러내는 표현 절대 금지 ("저는 AI로서..." 등)

[해설 규칙]
1. 사용자 답변을 절대 틀렸다고 하지 마라
2. 사용자가 쓴 답변의 핵심을 먼저 자연스럽게 인정해라
3. 사용자가 미처 생각하지 못한 관점을 1~2개 추가로 제시해라
4. 심리학이나 철학 배경지식을 쉬운 언어로 1줄 추가해라
5. 해설 마지막에 반드시 추가 질문을 하나만 던져라
6. 답을 주지 말고 더 깊이 생각하게 유도해라

[말투]
- "~죠", "~잖아요", "~거든요" 같은 자연스러운 구어체
- "훌륭합니다", "좋은 생각이에요" 같은 빈 칭찬 절대 금지

[출력 형식 — 이 형식 그대로]

💡 해설
[사용자 답변 핵심 인정 한 줄]

🔍 놓칠 수 있는 관점
[미처 생각하지 못한 시각 1~2개]

🧠 알아두면 좋은 것
[심리학/철학 배경지식 1줄, 쉬운 언어로]

❓ 한 가지 더 생각해보기
[추가 질문 1개]`;

const LANGUAGE_REVIEW_PROMPT = `너는 한국어 텍스트 교열 AI야.

주어진 텍스트에서 한국어가 아닌 문자(한자, 일본어, 베트남어, 그리스어 등)를 모두 자연스러운 한국어로 교체해라.

규칙:
1. 한자/일본어/중국어 단어는 한글 발음이나 순우리말로 바꿔라 (예: 人気→인기, 候補→후보, 禁止→금지)
2. 의미를 파악할 수 없는 이상한 문자는 제거해라
3. 화살표(→), 물음표(?), 쉼표(,), 마침표(.), 줄바꿈은 유지해라
4. 텍스트의 의미와 형식은 절대 바꾸지 마라
5. 수정된 텍스트만 반환해라 — 설명이나 부가 내용 없이`;

async function reviewKorean(text: string): Promise<string> {
  const hasNonKorean = /[一-鿿぀-ヿͰ-Ͽ-ɏ]/.test(text);
  if (!hasNonKorean) return text;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: LANGUAGE_REVIEW_PROMPT },
      { role: 'user', content: text },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });

  return response.choices[0].message.content?.trim() ?? text;
}

export async function generateDailyScenario(): Promise<string> {
  const typeIndex = getTodayProblemType().index;
  const problemType = PROBLEM_TYPES[typeIndex];

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SCENARIO_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `오늘의 문제 유형:\n${problemType.instruction}\n\n위 유형으로 오늘의 상황을 생성해주세요. 설명이나 인사 없이 바로 첫 문장부터 시작하세요.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.9,
  });

  const draft = response.choices[0].message.content?.trim() ?? '';
  return await reviewKorean(draft);
}

export async function commentOnAnswer(
  scenario: string,
  messages: Message[]
): Promise<string> {
  const chatMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: COMMENTARY_SYSTEM_PROMPT },
      {
        role: 'system',
        content: `오늘의 상황:\n${scenario}`,
      },
      ...chatMessages,
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content?.trim() ?? '';
}
