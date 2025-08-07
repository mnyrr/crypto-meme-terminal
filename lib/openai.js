import fetch from 'node-fetch';

let cachedTokenLimit = null;
let lastTokenFetchTime = 0;

function estimateTokenCount(messages) {
  return messages.reduce((total, msg) => {
    const contentLength = msg.content.length;
    return total + Math.ceil(contentLength / 4);
  }, 0);
}

async function fetchTokenLimit() {
  const now = Date.now();
  if (cachedTokenLimit && now - lastTokenFetchTime < 60000) {
    return cachedTokenLimit;
  }

  const res = await fetch('https://openrouter.ai/api/v1/account', {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch OpenRouter account info: ${res.status}`);
  }

  const data = await res.json();
  const tokensAvailable = data?.rate_limits?.token?.remaining || 1500;

  cachedTokenLimit = Math.max(500, tokensAvailable);
  lastTokenFetchTime = now;

  return cachedTokenLimit;
}

export async function getChatCompletion(model, messages, history) {
  const inputTokens = estimateTokenCount(messages);
  const tokenLimit = await fetchTokenLimit();
  const maxTokens = Math.max(100, tokenLimit - inputTokens);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
