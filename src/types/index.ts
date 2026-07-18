import { EntryRecord } from '../services/supabase';

export interface StreakData {
  count: number;
  lastDate: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCrisis?: boolean;
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

// 루트 스택 — 비판적 사고 채팅(StartChat→Chat)이 주 진입점.
// Main(저널 탭)·Home·Alarm은 유지.
export type RootStackParamList = {
  StartChat: undefined;
  Chat: { userName: string; topic: string };
  Main: undefined;
  Home: undefined;
  Alarm: undefined;
};
