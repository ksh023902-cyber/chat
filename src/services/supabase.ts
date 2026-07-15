import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;
}

const client: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

if (__DEV__ && !client) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL/ANON_KEY 미설정 — 관음 기능은 폴백 모드로 동작함');
}

const DEVICE_ID_KEY = 'anon_device_id';

// RFC4122 v4 형태의 익명 식별자. 네이티브 난수 모듈 없이 Math.random으로 생성한다 —
// 보안 민감값이 아니라(단순 익명 집계용) 재빌드 리스크를 감수할 필요가 없다.
function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 익명 device_id — AsyncStorage 캐싱. Supabase 미설정이어도 동작한다.
// ★ 다른 욕구 기반 기능(인정욕구 반응 등)에서도 그대로 재사용할 것 — 독립적으로 유지.
export async function getDeviceId(): Promise<string> {
  try {
    const cached = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (cached) return cached;
  } catch {
    // AsyncStorage 실패 시에도 진행 — 아래에서 새로 발급
  }
  const id = generateUuidV4();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // 저장 실패해도 이번 세션 동안은 이 id를 그대로 쓴다
  }
  return id;
}

export interface AnswerRecord {
  answer_id: string;
  scenario_id: string;
  device_id: string;
  perspective_tag: string;
  content: string;
  created_at: string;
  reaction_count?: number; // answers_ranked 뷰에서만 채워짐
}

// Supabase 미설정이거나 실패해도 절대 throw하지 않는다 — 화면이 죽으면 안 된다.
export async function submitAnswer(input: {
  scenarioId: string;
  perspectiveTag: string;
  content: string;
}): Promise<void> {
  if (!client) return;
  try {
    const deviceId = await getDeviceId();
    await client.from('answers').insert({
      scenario_id: input.scenarioId,
      device_id: deviceId,
      perspective_tag: input.perspectiveTag,
      content: input.content,
    });
  } catch (e) {
    if (__DEV__) console.warn('[supabase] submitAnswer 실패(무시, 폴백)', e);
  }
}

export async function fetchAnswersForScenario(scenarioId: string): Promise<AnswerRecord[]> {
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('answers')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as AnswerRecord[];
  } catch (e) {
    if (__DEV__) console.warn('[supabase] fetchAnswersForScenario 실패(무시, 폴백)', e);
    return [];
  }
}

// answers_ranked 뷰(reaction_count desc, created_at desc) 기준. 뷰가 없거나 실패하면
// answers 테이블 최신순으로 자연 폴백한다 — reactions가 비어 있어도(기능1 미구현) 정상 동작.
export async function fetchBestAnswers(scenarioId: string, limit: number = 3): Promise<AnswerRecord[]> {
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('answers_ranked')
      .select('*')
      .eq('scenario_id', scenarioId)
      .limit(limit);
    if (!error && data) return data as AnswerRecord[];
  } catch (e) {
    if (__DEV__) console.warn('[supabase] fetchBestAnswers(뷰) 실패, 최신순 폴백', e);
  }
  try {
    const { data, error } = await client
      .from('answers')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as AnswerRecord[];
  } catch (e) {
    if (__DEV__) console.warn('[supabase] fetchBestAnswers(폴백) 실패(무시)', e);
    return [];
  }
}

// 내 관점(myTag)과 다른 perspective_tag를 가진 답변 하나를 골라 반환한다. 없으면 null.
export async function fetchOppositePerspectiveAnswer(
  scenarioId: string,
  myTag: string
): Promise<AnswerRecord | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('answers')
      .select('*')
      .eq('scenario_id', scenarioId)
      .neq('perspective_tag', myTag)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error || !data || data.length === 0) return null;
    const pick = data[Math.floor(Math.random() * data.length)];
    return pick as AnswerRecord;
  } catch (e) {
    if (__DEV__) console.warn('[supabase] fetchOppositePerspectiveAnswer 실패(무시)', e);
    return null;
  }
}

// ─────────────────────────────────────────────
// 기록 앱 전환 — 오늘의 질문 (questions 테이블, 아직 스키마 미생성)
// ─────────────────────────────────────────────

export interface QuestionRecord {
  id: string;
  day_number: number;
  category: string;
  title: string;
  situation: string;
  question: string;
  tone: 'light' | 'normal' | 'deep';
}

// 서비스 시작일 기준 day_number 앵커. 나중에 questions 테이블 생성 시점에 맞춰 조정.
const SERVICE_START_DATE = '2026-07-15';

export function getTodayDayNumber(): number {
  const start = new Date(SERVICE_START_DATE + 'T00:00:00Z').getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.floor((today - start) / 86400000) + 1;
}

// questions 테이블이 아직 없거나 Supabase 미설정이면 조용히 null — 화면은 하드코딩 폴백 질문을 쓴다.
export async function fetchTodayQuestion(dayNumber: number): Promise<QuestionRecord | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('day_number', dayNumber)
      .maybeSingle();
    if (error || !data) return null;
    return data as QuestionRecord;
  } catch (e) {
    if (__DEV__) console.warn('[supabase] fetchTodayQuestion 실패(무시, 하드코딩 폴백 사용)', e);
    return null;
  }
}

export interface EntryRecord {
  id: string;
  user_id: string;
  question_id: string;
  situation: string;
  question: string;
  content: string;
  ai_response?: string | null;
  created_at: string;
}

// entries 테이블에 오늘의 기록을 저장한다. 아직 auth 연동이 없어 user_id 자리에
// 익명 device_id를 대신 쓴다(향후 실제 계정 시스템 도입 시 교체). situation/question을
// question_id와 함께 그대로 저장해둬 캘린더 화면이 join 없이 바로 렌더링할 수 있게 한다.
// 미설정/실패 시 조용히 null 반환 — 로컬 스트릭·완료 UI는 이 저장 성공 여부와 무관하게 진행된다.
// 생성된 행의 id를 반환한다 — STEP4의 "반응 받기"가 나중에 같은 행에 ai_response를 붙이려면 필요.
export async function submitEntry(input: {
  questionId: string;
  situation: string;
  question: string;
  content: string;
}): Promise<string | null> {
  if (!client) return null;
  try {
    const deviceId = await getDeviceId();
    const { data, error } = await client
      .from('entries')
      .insert({
        user_id: deviceId,
        question_id: input.questionId,
        situation: input.situation,
        question: input.question,
        content: input.content,
      })
      .select('id')
      .single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch (e) {
    if (__DEV__) console.warn('[supabase] submitEntry 실패(무시, 폴백)', e);
    return null;
  }
}

// 기록에 대한 선택적 AI 반응을 같은 행에 채워 넣는다. 미설정/실패해도 화면은 죽지 않는다
// (반응은 화면에 이미 표시된 뒤 저장을 시도하는 것뿐이라, 실패해도 사용자 경험엔 영향 없음).
export async function updateEntryAiResponse(entryId: string, aiResponse: string): Promise<void> {
  if (!client) return;
  try {
    await client.from('entries').update({ ai_response: aiResponse }).eq('id', entryId);
  } catch (e) {
    if (__DEV__) console.warn('[supabase] updateEntryAiResponse 실패(무시)', e);
  }
}

// 내 기록을 최신순으로 조회한다. 미설정/실패/테이블 없음이면 빈 배열 —
// 화면은 "아직 기록이 없어요" 안내로 자연 폴백한다.
export async function fetchEntries(): Promise<EntryRecord[]> {
  if (!client) return [];
  try {
    const deviceId = await getDeviceId();
    const { data, error } = await client
      .from('entries')
      .select('*')
      .eq('user_id', deviceId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as EntryRecord[];
  } catch (e) {
    if (__DEV__) console.warn('[supabase] fetchEntries 실패(무시, 폴백)', e);
    return [];
  }
}
