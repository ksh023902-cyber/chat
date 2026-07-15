import { EntryRecord } from '../services/supabase';

export interface StreakData {
  count: number;
  lastDate: string;
}

// "오늘" 탭 내부 스택
export type TodayStackParamList = {
  Today: undefined;
  Write: { questionId: string; situation: string; question: string };
};

// "캘린더" 탭 내부 스택
export type CalendarStackParamList = {
  Calendar: undefined;
  EntryDetail: { entry: EntryRecord };
};

// 하단 탭 (각 탭은 위 스택을 하나씩 품는다)
export type MainTabParamList = {
  TodayTab: undefined;
  CalendarTab: undefined;
};

// 루트 스택 — 탭 네비게이터(Main) + 레거시 화면(Home: 도달 불가지만 STEP 6 목록에 없어 보존,
// Alarm: 살아있는 독립 기능)
export type RootStackParamList = {
  Main: undefined;
  Home: undefined;
  Alarm: undefined;
};
