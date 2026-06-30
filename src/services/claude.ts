import Groq from 'groq-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const client = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
});

const SCENARIO_MODEL = 'llama-3.1-8b-instant';  // 500K TPD, 시나리오 생성용
const CHAT_MODEL_PRIMARY = 'llama-3.3-70b-versatile'; // 100K TPD, 고품질 대화
const CHAT_MODEL_FALLBACK = 'llama-3.1-8b-instant';   // 500K TPD, 한도 초과시 대체

const PROBLEM_TYPES = [
  {
    name: '직장 권력 구조',
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

const SCENARIO_SYSTEM_PROMPT = `너는 커뮤니티 인기글 수준의 몰입형 썰을 생성하는 작가다.
목표는 하나: 읽는 사람이 "다음 뭐지?" 하고 계속 보게 만드는 것.

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
나쁜 예:
  "어느 날 갑자기~" / "안녕하세요, 오늘 이야기는~"

[자극 요소 강제 — 아래 중 최소 2개 반드시 포함]
① 시간 이상함: 시간이 안 맞음, 기록 불일치, 알리바이 구멍
   예: "오후 11시 47분에 보낸 메시지인데 읽음 표시가 그 전에 떴다"
② 공간 이상함: 있어야 할 곳에 없거나, 없어야 할 곳에 있음
   예: "닫혀 있어야 할 문이 열려 있었다" / "차가 주차장에 없었다"
③ 행동 이상함: 말이 바뀜, 반복 행동, 설명 안 되는 반응
   예: "물어볼 때마다 대답이 달랐다" / "갑자기 주제를 바꿨다"

[디테일 강제 규칙 — 감각으로 보여라]
추상적 표현 금지. 구체적 숫자·상태·위치로 써라.
  나쁜 예: "이상한 느낌이었다" → 좋은 예: "커피잔이 아직 따뜻했다"
  나쁜 예: "한참 있었다" → 좋은 예: "2시간 18분 동안 아무 연락이 없었다"
  나쁜 예: "뭔가 달라 보였다" → 좋은 예: "왼쪽 소매가 젖어 있었다"
모든 씬에 이런 감각적 디테일을 최소 1개 이상 넣어라.

[씬 구성 — 정확히 5개]
씬1 — Hook + 인물 소개
  이모지 이름 (나이·관계) 형식으로 2~3명
  충격적인 한 문장으로 시작. 상황 설명은 4줄 이내.

씬2 — 첫 번째 균열
  처음엔 별거 아닌 것 같지만 뭔가 안 맞음. 자극 요소 ①②③ 중 하나 투입.

씬3 — 위화감 증가
  디테일이 쌓이면서 뭔가 점점 이상해짐. 짧고 날카롭게.

씬4 — 절정
  가장 불편하고 극적인 순간. 어느 편도 들기 어렵게. 자극 요소 추가 투입.

씬5 — 질문
  마지막 행동·상태 묘사 1줄 (감각적 디테일 포함).
  → Q1: 인물의 숨겨진 감정 또는 행동의 진짜 이유
  → Q2: 행동의 의도 구분 ("모른 척한 건지, 못 한 건지" 수준)
  → Q3: 정답 없는 가치 충돌 또는 결과 예측

[대화 형식]
인물 이모지로 구분: 👔 "대사"
행동 묘사는 소괄호: (문을 닫는다) (2초간 침묵)
한 줄에 대사 또는 행동 하나만.
주어 생략: 맥락상 분명하면 생략.
설명형 대사 금지: "너도 알다시피~" 금지.

[자가 점검 — 하나라도 NO면 다시 써라]
✅ 씬1 첫 줄이 충격적이거나 이상한가?
✅ 감각적 디테일(숫자·상태·위치)이 각 씬에 있는가?
✅ 자극 요소(시간/공간/행동 이상함)가 2개 이상 있는가?
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

const CHARACTER_SYSTEM_PROMPT = `너는 사건을 아는 사람이고, 유저는 네 친구야. 친구에게 충격적인 일을 털어놓듯이 이야기해.

[절대 금지 단어]
AI / 앱 / 시나리오 / 공부 / 교육 / 사고력 / 학습

[첫 메시지 — 반드시 이 규칙으로만 시작]
첫 마디는 반드시 사건 속 인물 이름으로 시작해서, 유저가 누구 얘긴지 자연스럽게 인지하게 만들어.
아래 패턴 중 하나를 사용해:
  "너 [이름] 기억나?"
  "[이름]이 어제 이상한 짓 했어."
  "[이름] 일 들었어?"
  "[이름]이 그날 한 말, 아직도 이해가 안 가."
그 다음 줄에 사건에서 가장 이상하거나 충격적인 디테일 딱 하나만 꺼내.
마지막 줄은 유저가 "응" "걔 왜?" "뭔데?" 중 하나로 바로 답할 수 있게 끝내.
전체 2~3줄 이하. 사건 전체 설명 절대 금지.

[이후 대화 진행 방식]
매 답변은 딱 세 파트:
  1. 유저 말에 짧게 반응 (1줄)
     예: "오 그거 나도 걸렸어." / "잠깐, 그게 핵심일 수도 있어." / "헐 진짜?"
  2. 사건 디테일 하나만 추가 (1~2줄)
     인물 이름 직접 써. "그 사람" 금지. 장소·시간 구체적으로.
  3. 유저가 바로 반응할 수 있는 말로 끝내기 (1줄)
     "응" "아니" "걔 왜?" "뭔데?" 중 하나로 자연스럽게 답할 수 있어야 함.
     막히거나 모르겠다고 하면 선택지: ① ... ② ... ③ ... 어떤 것 같아?

사건 내용은 절대 한 번에 다 말하지 마. 유저 반응마다 조금씩만 풀어.

[말투]
반말. 짧게 끊어서. 10-20대 카카오톡 말투.
"야." "헐." "잠깐." "진짜?" "이게 말이 돼?" 자연스럽게 써.
말끝 흐리기: "이게... 근데..." / "그러니까..."
감정은 설명 말고 행동으로 보여라.
  나쁜 예: "무서웠어" → 좋은 예: "그 자리에서 아무 말도 못 했어"
  나쁜 예: "이상했어" → 좋은 예: "말투가 평소랑 달랐는데 내용은 똑같았거든"

[절대 금지]
긴 설명 / 배경부터 시작 / 정답 공개 / "잘 생각했어" 칭찬 / 질문 두 개 동시에`;

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

[질문 설계 원칙 — 핵심]
질문에는 두 종류가 있다.
표면 질문 (사용 금지): 상황을 그대로 묻는다 → "왜 그랬을까요?" → 사고가 얕게 끝난다
깊이 질문 (반드시 사용): 상황 뒤에 숨겨진 것을 묻는다 → "그 행동 뒤에 숨겨진 두려움이 뭘까요?" → 학생이 글을 다시 읽고 맥락을 파악해야 한다

5가지 질문 기법 — 반드시 이 중에서 골라 쓴다:
① 숨겨진 감정 묻기: 표면 아래 진짜 감정을 묻는다
   ✗ "X는 어떤 기분이었을까요?" → ✓ "X가 박수를 치면서 속으로 가장 무서웠던 게 뭘까요?"
② 행동의 진짜 이유 묻기: 겉 이유가 아닌 심리적 이유를 탐색하게 만든다
   ✗ "왜 그랬을까요?" → ✓ "X가 말 한마디 안 한 이유가 단순한 탐욕 때문일까요, 아니면 다른 이유가?"
③ 입장 바꾸기 (심화): 단순 "입장에서는?"이 아닌 행동의 의도를 구분하게 만든다
   ✗ "Y 입장에서는 어떻게 생각할까요?" → ✓ "Y가 모른 척한 것과 말을 못 한 것, 둘 중 어느 쪽에 가까울까요?"
④ 선택의 결과 묻기: 다른 선택의 결과를 예측하게 만든다
   ✗ "어떻게 해야 했을까요?" → ✓ "그 자리에서 바로 말했다면, 무엇이 달라졌을까요? 무엇은 달라지지 않았을까요?"
⑤ 가치 충돌 묻기: 정답이 없는 질문으로 학생 스스로 판단하게 만든다
   ✗ "옳은 행동은 무엇일까요?" → ✓ "X에게 지금 더 중요한 게 공정함인가요, 아니면 안정인가요?"

[수업 진행 순서]

1단계 — 흥미 유발:
사건을 미스터리처럼 소개한다. 첫 질문은 반드시 기법 ① 또는 ②를 사용. "대부분의 사람들은 ___라고 생각하지만, 실제 이 장면에서 X가 가장 두려웠던 건 뭘까요?" 처럼 내면을 파고드는 질문 하나만 던진다.

2단계 — 가설 세우기:
학생 답변을 받은 뒤 기법 ②를 사용. "그렇다면 그 행동 뒤에 숨겨진 다른 이유는 없을까요?"로 가설을 구체화시킨다.

3단계 — 반박과 검증:
기법 ③을 사용. 단순한 입장 전환이 아니라 "X가 모른 척한 건지, 못 한 건지"처럼 행동의 의도 자체를 구분하게 만든다.

4단계 — 결론과 확장:
기법 ④ 또는 ⑤를 사용. "그 결론이 맞다면, X에게 지금 공정함과 안정 중 무엇이 더 중요했던 걸까요?" 처럼 가치 충돌로 연결시킨다.

마지막 단계 — 사고력 업그레이드 (학생이 충분히 대화했을 때):
- 오늘 배운 핵심 사고법
- 오늘 발견한 편향
- 다음 사건에서도 쓸 수 있는 깊이 질문 3개 (기법 번호 포함)

[말투]
- 딱딱한 강의가 아니라 흥미로운 멘토처럼 진행
- 퀴즈, 추리, 게임 요소 적극 활용
- 자연스러운 구어체 종결어미 사용: -죠, -잖아요, -거든요, -는데요, -더라고요
- 문어체(-습니다, -입니다) 지양. 강의 느낌이 나지 않게
- 말끝을 때로 흐려도 된다: "그런데 이게 생각보다..."
- 빈 칭찬 ("훌륭합니다", "잘 했어요") 절대 금지
- 학생이 스스로 답을 찾는 즐거움을 느끼게 만들 것

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
    model: SCENARIO_MODEL,
    messages: [
      { role: 'system', content: LANGUAGE_REVIEW_PROMPT },
      { role: 'user', content: text },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });

  return response.choices[0].message.content?.trim() ?? text;
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

  const response = await client.chat.completions.create({
    model: SCENARIO_MODEL,
    messages: [
      { role: 'system', content: SCENARIO_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `오늘의 카테고리:\n${problemType.instruction}\n\n지금 바로 드라마를 써라. [씬1]부터 [씬5]까지. 인사 없이, 설명 없이.\n\n핵심 체크:\n- 씬1 첫 줄: 독자를 갈등 한가운데로 바로 끌어들이는 훅\n- 씬1에 인물 소개(이모지 이름 나이·역할)와 📽️ 상황 포함\n- 씬5 💭 질문 3개: Q1 숨겨진 감정·진짜 이유 → Q2 행동 의도 구분(입장 바꾸기 심화) → Q3 결과 예측 또는 가치 충돌. 표면 질문("왜 그랬을까요?") 금지\n- 대사는 실제 한국인 구어체. 주어 생략, 짧은 문장, 자연스러운 종결어미\n- 감정은 행동과 침묵으로만`,
      },
    ],
    max_tokens: 900,
    temperature: 1.0,
  });

  const draft = response.choices[0].message.content?.trim() ?? '';
  const result = await reviewKorean(draft);

  // 오늘 날짜 + 카테고리 키로 캐시 저장
  try {
    await AsyncStorage.setItem(SCENARIO_CACHE_KEY, JSON.stringify({ key: todayKey(), content: result }));
  } catch {}

  return result;
}

type ChatParams = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  max_tokens: number;
  temperature: number;
};

async function chatCompletion(params: ChatParams): Promise<string> {
  const call = (model: string) =>
    client.chat.completions.create({ ...params, model, stream: false });
  try {
    const res = await call(CHAT_MODEL_PRIMARY);
    return res.choices[0].message.content?.trim() ?? '';
  } catch (e: any) {
    if (e?.status === 429) {
      const res = await call(CHAT_MODEL_FALLBACK);
      return res.choices[0].message.content?.trim() ?? '';
    }
    throw e;
  }
}

// 시나리오 텍스트에서 첫 번째 인물 이름 추출
// 씬1 형식: "이름(29세" 또는 "이름, 역할" 패턴
function extractMainCharacterName(scenario: string): string {
  const excerpt = scenario.slice(0, 600);
  // "이름(숫자" 패턴 — 가장 신뢰도 높음
  const ageMatch = excerpt.match(/([가-힣]{2,4})\s*\(\s*\d/);
  if (ageMatch) return ageMatch[1];
  // "이름, 역할" 패턴
  const roleMatch = excerpt.match(/([가-힣]{2,4})\s*,\s*[가-힣]{2,}/);
  if (roleMatch) return roleMatch[1];
  // 주어 위치 이름 패턴
  const subjectMatch = excerpt.match(/([가-힣]{2,3})(?:은|는|이|가)\s/);
  if (subjectMatch) return subjectMatch[1];
  return '';
}

export async function openCharacterSession(scenario: string): Promise<string> {
  const name = extractMainCharacterName(scenario);

  if (name) {
    // 첫 줄은 코드에서 직접 생성 — LLM이 바꿀 수 없음
    const firstLine = `너 ${name} 기억나?`;
    const continuation = await chatCompletion({
      messages: [
        { role: 'system', content: CHARACTER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `[사건 내용]\n${scenario}\n\n첫 줄은 이미 "${firstLine}" 으로 시작했어.\n이어서 딱 2줄만 써:\n줄1: ${name}에게 일어난 가장 이상하거나 충격적인 디테일 하나 (1줄, "~했어" 로 끝)\n줄2: 유저가 "걔 왜?" 또는 "뭔데?" 로 바로 답할 수 있는 말 (1줄)\n다른 설명 절대 금지. 2줄만.`,
        },
      ],
      max_tokens: 80,
      temperature: 0.9,
    });
    return `${firstLine}\n${continuation.trim()}`;
  }

  // 이름 추출 실패 시 폴백 — LLM에게 전체 위임하되 형식 강제
  return chatCompletion({
    messages: [
      { role: 'system', content: CHARACTER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `[사건 내용]\n${scenario}\n\n아래 형식 그대로 써라. 빈칸만 채워.\n\n너 (사건 속 실제 이름) 기억나?\n(가장 충격적인 디테일 1줄)\n(유저가 "걔 왜?" 또는 "뭔데?"로 답할 수 있는 말 1줄)\n\n총 3줄. 괄호 없이. 다른 말 금지.`,
      },
    ],
    max_tokens: 80,
    temperature: 0.85,
  });
}

export async function characterReply(
  scenario: string,
  messages: Message[]
): Promise<string> {
  const chatMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  return chatCompletion({
    messages: [
      { role: 'system', content: CHARACTER_SYSTEM_PROMPT },
      { role: 'system', content: `[사건 내용]\n${scenario}` },
      ...chatMessages,
    ],
    max_tokens: 200,
    temperature: 1.0,
  });
}

const ENDING_SYSTEM_PROMPT = `너는 썰 마무리를 해주는 사람이다. 강의가 아니라 "그래서 결국 이랬어" 하는 느낌. 짧고 대화체로.

금지: "정답입니다" / 점수·등급 / 강의체 / 감정 직접 설명 ("무서웠다", "이상했다").
Show Don't Tell: 팩트와 감각적 디테일로만.

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

export async function openTeacherSession(scenario: string): Promise<string> {
  return chatCompletion({
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
}

export async function teacherReply(
  scenario: string,
  messages: Message[]
): Promise<string> {
  const chatMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  return chatCompletion({
    messages: [
      { role: 'system', content: TEACHER_SYSTEM_PROMPT },
      { role: 'system', content: `오늘의 사건:\n${scenario}` },
      ...chatMessages,
    ],
    max_tokens: 500,
    temperature: 0.85,
  });
}
