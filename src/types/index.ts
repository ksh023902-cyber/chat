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

export type RootStackParamList = {
  Setup: undefined;
  Chat: {
    userName: string;
    topic: string;
  };
};
