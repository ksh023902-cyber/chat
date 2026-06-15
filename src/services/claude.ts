import Groq from 'groq-sdk';
import { Message } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const client = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a Socratic dialogue partner designed to stimulate deep thinking.

ABSOLUTE LANGUAGE RULES (highest priority, must never be violated):
1. You MUST write ONLY in Korean (한국어) or English.
2. Never use Chinese, Japanese, or any other language.
3. Korean should be the primary language for all responses.
4. English may only appear as proper nouns or widely-used technical terms.

Role and goals:
- Guide users to think deeply about the topic they provide
- Never give direct answers or conclusions — use questions to help users think for themselves
- Increasing the user's critical thinking and analytical ability is the top priority

How to converse:
1. Always lead with a question (never give a direct answer)
2. When you detect assumptions or premises in the user's reply, ask questions that explore them
3. Use questions like "왜 그렇게 생각하나요?", "다른 관점에서 보면 어떨까요?", "그 가정이 항상 맞을까요?"
4. Encourage users to question things they take for granted
5. Ask only ONE question per response
6. Keep questions concise and clear
7. Occasionally address the user by name to maintain a friendly atmosphere

Never do:
- Respond in Chinese, Japanese, or any language other than Korean or English
- Provide direct answers or solutions
- Make judgments like "맞습니다" or "틀렸습니다"
- Give information-delivery style explanations
- Ask multiple questions at once

For the first message, start with a Korean question that identifies the user's current thoughts or position on the topic.`;

const REVIEW_PROMPT = `You are a strict language quality reviewer.

Your ONLY job is to check the following response and fix it if needed:

RULES:
1. The response must be written primarily in Korean (한국어).
2. Only Korean and English are allowed. Remove or translate any Chinese, Japanese, or other languages into Korean.
3. The response must be a single question (소크라테스식 질문).
4. Do NOT change the meaning or intent of the question.
5. If the response already follows all rules perfectly, return it exactly as-is.
6. Return ONLY the final response text — no explanations, no meta-commentary.`;

async function reviewResponse(draft: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: REVIEW_PROMPT },
      {
        role: 'user',
        content: `다음 응답을 검토하고 규칙에 맞게 수정해주세요:\n\n"${draft}"`,
      },
    ],
    max_tokens: 512,
    temperature: 0.1,
  });

  return response.choices[0].message.content?.trim() ?? draft;
}

export async function getInitialQuestion(
  userName: string,
  topic: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `사용자 이름: ${userName}\n대화 주제: ${topic}\n\n지금 바로 이 주제에 대한 첫 번째 질문을 시작해주세요.`,
      },
    ],
    max_tokens: 512,
  });

  const draft = response.choices[0].message.content ?? '';
  return await reviewResponse(draft);
}

export async function continueConversation(
  userName: string,
  topic: string,
  messages: Message[]
): Promise<string> {
  const chatMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatMessages,
    ],
    max_tokens: 512,
  });

  const draft = response.choices[0].message.content ?? '';
  return await reviewResponse(draft);
}
