export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // 통신 실패 안내 등 실제 대화가 아닌 메시지 — AI 요청 이력에서 제외됨
  isError?: boolean;
}

export interface DailyScenario {
  date: string;
  content: string;
}

export interface StreakData {
  count: number;
  lastDate: string;
}

export interface Perspective {
  character: string;
  opinion: string;
}

export type RootStackParamList = {
  Home: undefined;
  Alarm: undefined;
  Scenario: undefined;
  ScenarioDetail: { scenario: string };
  Perspective: { scenario: string };
  Chat: { scenario?: string; perspectives?: Perspective[] } | undefined;
  Ending: { scenario: string; messages: Message[] };
};
