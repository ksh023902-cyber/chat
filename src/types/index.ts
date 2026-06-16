export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationState {
  userName: string;
  topic: string;
  messages: Message[];
}

export type Category = '독서' | '정치' | '경제' | '인간관계';

export type RootStackParamList = {
  Home: undefined;
  Setup: { category: Category };
  Chat: {
    userName: string;
    topic: string;
    category: Category;
  };
};
