import fetch from 'node-fetch';

export async function getChatCompletion(modelId, messages, history) {
  // Динамическое определение max_tokens
  let maxTokens = 150; // Базовый лимит для коротких ответов
  if (history.some(m => m.content.toLowerCase().includes("ascii art"))) {
    maxTokens = 500; // Увеличиваем для ASCII-арта
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.9,
      max_tokens: maxTokens
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data.error?.message || res.statusText}`);
  return data.choices[0].message.content;
}