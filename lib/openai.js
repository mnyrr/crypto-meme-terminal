/// lib/openai.js
import fetch from 'node-fetch';

export async function getChatCompletion(modelId, messages) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://railway.app",
      "X-Title": "crypto-terminal"
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages,
      temperature: 0.9
    })
  });

  const data = await res.json();

  if (!res.ok) throw new Error(`${res.status} ${data.error?.message || res.statusText}`);

  return data.choices[0].message.content;
}