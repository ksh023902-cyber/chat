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
