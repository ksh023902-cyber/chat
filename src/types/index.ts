export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  Perspective: { scenario: string };
  Chat: { scenario: string; perspectives: Perspective[] };
};
