import { OpenAI } from 'openai';
import { config } from 'dotenv';
config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getChatCompletion(messages) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.9,
  });
  return response.choices[0].message.content;
}
