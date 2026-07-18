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
  FontSelect: undefined;
};

// 하단 탭 (각 탭은 위 스택을 하나씩 품는다)
export type MainTabParamList = {
  TodayTab: undefined;
  CalendarTab: undefined;
};

// 루트 스택 — Main(저널: 오늘/캘린더 탭)이 주 진입점. Home은 도달 불가능한 레거시.
export type RootStackParamList = {
  Main: undefined;
  Home: undefined;
  Alarm: undefined;
};
