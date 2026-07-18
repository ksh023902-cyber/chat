import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontChoice = 'default' | 'serif' | 'hand';

const STORAGE_KEY = 'record_font_choice';

// Pretendard(기본) 폰트 파일은 아직 없어 시스템 폰트로 대체한다(undefined = fontFamily 미지정).
export const FONT_FAMILIES: Record<FontChoice, string | undefined> = {
  default: undefined,
  serif: 'NotoSerifKR_400Regular',
  hand: 'Gaegu_400Regular',
};

export const FONT_LABELS: Record<FontChoice, string> = {
  default: '기본',
  serif: '명조',
  hand: '손글씨',
};

export async function getFontChoice(): Promise<FontChoice> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'serif' || raw === 'hand' || raw === 'default') return raw;
  } catch {
    // 읽기 실패 시 기본값으로 폴백
  }
  return 'default';
}

export async function setFontChoice(choice: FontChoice): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // 저장 실패해도 화면은 계속 진행(이번 세션 동안은 선택값이 상태로 유지됨)
  }
}
