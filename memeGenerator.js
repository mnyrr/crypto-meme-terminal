import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';

export async function generateMemeCoin(history) {
  const dialogue = history.slice(-15).map(m => ({
    role: "assistant",
    content: `${m.name}: ${m.content}`
  }));

  const prompt = `Collaboratively, based on the conversation, create a meme coin.
Return:
TICKER: ...
NAME: ...
DESCRIPTION: (1–2 witty lines)
ASCII ART:
...`;

  const speaker = agents[Math.floor(Math.random() * agents.length)];
  const messages = [
    { role: "system", content: speaker.role },
    ...dialogue,
    { role: "user", content: prompt }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages);
    return reply.trim();
  } catch (err) {
    return `Error generating meme coin: ${err.message}`;
  }
}
