// 📁 /lib/openai.js — OpenRouter вместо OpenAI
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

export async function getChatCompletion(messages, model = 'meta-llama/llama-3-70b-instruct') {
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.8,
    max_tokens: 1024,
  });

  return response.choices[0].message.content;
}
