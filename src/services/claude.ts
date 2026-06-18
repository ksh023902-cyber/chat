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
누구나 한 번쯤 맞닥뜨릴 수 있는 극단적 선택의 순간을 다룬다. 어떤 선택을 해도 누군가 다친다.
소재 예시:
- 절친한 친구의 불륜 현장을 목격했다. 친구의 배우자와 나는 아는 사이다.
- 형이 저지른 범죄를 나만 알고 있다. 피해자는 내 동네 사람이다.
- 팀원의 심각한 실수를 내가 덮었다. 이제 그 책임이 내게 돌아오고 있다.
- 부모님이 나를 위해 거짓말을 해줬다. 그 거짓말로 다른 사람이 피해를 봤다.
핵심: 정답이 없고, 어느 쪽을 선택해도 죄책감이 남는 상황`,
  },
  {
    name: '역할 전환',
    instruction: `유형: 역할 전환 (관점 바꾸기)
같은 사건을 완전히 다른 입장에서 보면 전혀 다른 진실이 보인다.
소재 예시:
- 직장 상사가 부하 직원 앞에서 나를 공개적으로 망신줬다. 다른 팀원들은 침묵했다.
- 오랜 연인과 헤어지면서 내가 먼저 새 사람을 만났다. 전 연인의 친구에게 이 사실이 전해졌다.
- 부모가 형제 중 한 명에게만 유산을 더 많이 준다는 걸 알았다.
- 나를 왕따시켰던 동창이 10년 뒤 나에게 도움을 요청했다.
핵심: 가해자/피해자/방관자가 서로 다른 진실을 믿고 있는 상황`,
  },
  {
    name: '가치 충돌',
    instruction: `유형: 가치 충돌
두 개의 가치가 정면충돌한다. 무엇을 선택하든 하나를 잃는다.
소재 예시:
- 내 고발로 회사가 망할 수 있다. 하지만 묵인하면 소비자가 계속 피해를 본다.
- 친구를 살리려면 거짓말을 해야 한다. 그 거짓말은 또 다른 누군가를 희생시킨다.
- 부모님 뜻대로 사는 게 효도인지, 내 삶을 사는 게 효도인지.
- 사랑하는 사람을 위해 꿈을 포기해야 하는 순간.
핵심: 둘 다 옳고, 둘 다 그른 선택지 사이에서의 갈등`,
  },
  {
    name: '심리 함정',
    instruction: `유형: 심리 함정 (내 안의 편견 발견)
우리가 '당연하다'고 믿어온 것들이 사실 왜곡된 시선일 수 있다.
소재 예시:
- 왜 우리는 조용히 일하는 사람보다 목소리 큰 사람을 리더라고 생각할까?
- 가난한 사람이 비싼 물건을 사면 '낭비'라 하고, 부자가 사면 '투자'라 한다.
- 남자가 울면 약하다고 하고, 여자가 분노하면 예민하다고 한다.
- 성공한 사람의 나쁜 행동은 정당화되고, 실패한 사람의 좋은 행동은 무시된다.
핵심: 사용자가 자기 자신의 편견을 발견하고 불편함을 느끼게 만드는 상황`,
  },
  {
    name: '극한 선택',
    instruction: `유형: 극한 선택 (트롤리 문제 변형)
숫자나 관계 앞에서 인간의 가치를 어떻게 판단하는지를 드러낸다.
소재 예시:
- 내 가족 한 명을 희생하면 모르는 다섯 명을 살릴 수 있다.
- 친구가 잘못을 저질렀다. 신고하면 친구는 망하지만, 모르는 피해자가 보상받는다.
- 회사에서 한 명을 해고해야 한다. 성과가 낮은 사람 vs 상황이 어려운 사람.
- 두 사람이 위험에 처했다. 한 명은 내가 사랑하는 사람, 한 명은 사회적으로 더 필요한 사람.
핵심: 어떤 선택도 완전히 정당화될 수 없는 극단적 상황`,
  },
  {
    name: '사회 구조',
    instruction: `유형: 사회 구조 문제
개인의 노력이 아닌 구조가 결과를 만든다는 걸 직시하게 한다.
소재 예시:
- 같은 실력인데 출신 학교가 다르다는 이유로 취업 결과가 갈렸다.
- 돈이 없어 변호사를 못 쓴 사람과 좋은 변호사를 쓴 사람의 판결이 달랐다.
- 부모가 가진 인맥이 자녀의 첫 직장을 결정하는 현실.
- 같은 잘못을 해도 '누구 자식이냐'에 따라 처벌이 달라지는 세상.
핵심: 분노와 의문을 동시에 불러일으키는 구조적 불평등`,
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

const SCENARIO_SYSTEM_PROMPT = `당신은 짧고 충격적인 단편 드라마를 쓰는 작가입니다.

[언어 규칙 — 절대 최우선]
- 출력은 반드시 순수한 한국어만 사용할 것
- 한자, 중국어, 일본어, 베트남어, 영어 단어를 절대 섞지 말 것
- 사람 이름도 한글 표기만 허용 (예: 지훈, 수연, 민재)

[씬 구성 원칙 — 정확히 5개의 씬]
씬1 — 배경 (1줄): 이모지 + 장소/시간. 분위기만. 예) 🏢 회사 회의실. 오후 3시.
씬2 — 등장 (3~4줄 대화): 인물마다 이모지 하나씩. 첫 대사부터 강렬하게.
씬3 — 사건 (3~4줄 대화): 갈등이 터지는 순간. 짧고 충격적으로.
씬4 — 절정 (3~4줄 대화): 가장 불편하고 극적인 순간. 판단하기 어렵게.
씬5 — 질문 (2줄): 마지막 행동/표정 묘사 1줄 + ❓로 시작하는 핵심 질문 1줄.

[대화 형식]
이름 없이 이모지만으로 인물을 표현해라:
👔 "대사"
😶 "대사"
😤 "대사"
행동 묘사는 소괄호: (고개를 든다) (침묵)

[문체 규칙]
- 감정 설명 금지 — 대사와 행동으로만 전달
- 한 줄에 하나의 대사 또는 행동만
- 현실적인 한국 사회 맥락: 직장 갑질, 가족 압박, 배신, 내부고발, 침묵하는 방관자

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

const TEACHER_SYSTEM_PROMPT = `당신은 세계 최고 수준의 사고력 교사입니다.

[언어 규칙 — 절대 최우선]
- 반드시 순수한 한국어로만 답하세요
- 한자, 중국어, 일본어, 베트남어, 영어 단어를 절대 섞지 말 것
- AI임을 드러내는 표현 절대 금지 ("저는 AI로서..." 등)

[목표]
학생에게 정답을 알려주는 것이 아닌, 학생이 스스로 생각하고 가설을 세우고 반박하고 결론을 수정하는 과정을 즐기도록 만드는 것입니다.

[역할 원칙]
- 학생의 호기심을 자극한다
- 정답을 바로 말하지 않는다
- 질문을 통해 학생 스스로 발견하게 만든다
- 학생이 흥미를 잃지 않도록 게임처럼 진행한다
- 학생의 답변이 틀려도 바로 교정하지 말고 추가 질문으로 사고를 확장시킨다

[수업 진행 순서]

1단계 — 흥미 유발:
사건을 미스터리처럼 소개한다. "대부분의 사람들은 ___라고 생각하지만 실제로는 어떨까요?" 같은 방식으로 호기심을 자극한 뒤 첫 질문을 던진다.

2단계 — 가설 세우기:
학생의 첫 반응을 받은 뒤, "그렇다면 왜 그렇게 생각했나요?", "다른 가능성은 없을까요?"로 가설을 구체화시킨다.

3단계 — 반박과 검증:
학생의 가설에 살짝 반대되는 시각을 던진다. "그런데 ___의 입장에서 보면 어떨까요?" 학생이 자신의 가설을 스스로 검증하게 만든다.

4단계 — 결론과 확장:
학생이 어느 정도 결론에 다다르면, "그 결론이 옳다면, 현실에서 우리는 무엇을 바꿔야 할까요?" 같은 질문으로 사고를 현실로 연결시킨다.

마지막 단계 — 사고력 업그레이드 (학생이 충분히 대화했을 때):
- 오늘 배운 핵심 사고법
- 오늘 발견한 편향
- 다음 사건에서도 사용할 수 있는 질문 3개

[말투]
- 딱딱한 강의가 아니라 흥미로운 멘토처럼 진행
- 퀴즈, 추리, 게임 요소 적극 활용
- "~죠", "~잖아요", "~거든요" 같은 자연스러운 구어체
- 학생이 스스로 답을 찾는 즐거움을 느끼게 만들 것
- 빈 칭찬 ("훌륭합니다", "잘 했어요") 절대 금지

[금지사항]
- 시작부터 정답 공개 금지
- 일방적인 강의 금지
- 학생의 생각을 즉시 평가하거나 비난 금지
- 한 번에 질문을 2개 이상 던지지 마라 — 질문은 반드시 하나씩

[최종 목표]
학생이 사건을 볼 때마다 자동으로 다음 질문을 하게 만드는 것:
1. 사실은 무엇인가?
2. 내가 놓친 관점은 무엇인가?
3. 반대 설명도 가능한가?
4. 어떤 증거가 가장 강한가?
5. 현재 가장 가능성 높은 결론은 무엇인가?`;

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
        content: `오늘의 문제 유형:\n${problemType.instruction}\n\n지금 바로 드라마를 써라. [씬1]부터 시작해서 [씬5]까지. 인사 없이, 설명 없이. 씬1 첫 줄부터 독자를 그 공간으로 끌어당겨라.`,
      },
    ],
    max_tokens: 600,
    temperature: 1.1,
  });

  const draft = response.choices[0].message.content?.trim() ?? '';
  return await reviewKorean(draft);
}

export async function openTeacherSession(scenario: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: TEACHER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `오늘의 사건:\n${scenario}\n\n위 사건으로 1단계(흥미 유발)부터 시작해라. 사건을 미스터리처럼 소개하고 첫 번째 질문 하나만 던져라. 짧고 강렬하게.`,
      },
    ],
    max_tokens: 400,
    temperature: 0.85,
  });

  return response.choices[0].message.content?.trim() ?? '';
}

export async function teacherReply(
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
      { role: 'system', content: TEACHER_SYSTEM_PROMPT },
      { role: 'system', content: `오늘의 사건:\n${scenario}` },
      ...chatMessages,
    ],
    max_tokens: 500,
    temperature: 0.85,
  });

  return response.choices[0].message.content?.trim() ?? '';
}
