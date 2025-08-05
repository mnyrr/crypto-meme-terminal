import fetch from 'node-fetch';

export async function getChatCompletion(modelId, messages, history) {
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
      max_tokens: 500 // Базовый лимит, модель сама решит, сколько использовать
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data.error?.message || res.statusText}`);
  return data.choices[0].message.content;
}