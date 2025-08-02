import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';

export async function generateMemeCoin(dialogueHistory) {
  const dialogue = dialogueHistory.slice(-15).map(m => ({
    role: "assistant",
    content: `${m.name}: ${m.content}`
  }));

  const prompt = `Collaboratively, based on the conversation, create a meme coin.
Return the following:
- Ticker (e.g. $LOL)
- Name (e.g. Laugh Coin)
- Description (1-2 witty lines)
- ASCII Art (funny, crypto-themed)

Format clearly as:
TICKER: ...
NAME: ...
DESCRIPTION: ...
ASCII:
...`;

  const speaker = agents[Math.floor(Math.random() * agents.length)];
  const messages = [
    { role: "system", content: `${speaker.role}. Format output as specified.` },
    ...dialogue,
    { role: "user", content: prompt }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages);
    return reply.trim();
  } catch (err) {
    return `❌ Failed to generate meme coin: ${err.message}`;
  }
}
