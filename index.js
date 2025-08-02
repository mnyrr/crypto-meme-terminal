import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import dotenv from 'dotenv';
dotenv.config();

let history = [];

async function runDialogueLoop() {
  // 🔁 Выбираем рандомного говорящего
  const speaker = agents[Math.floor(Math.random() * agents.length)];

  // 🔁 Получатель — тоже случайный, но не сам себя
  const others = agents.filter(a => a.name !== speaker.name);
  const receiver = others[Math.floor(Math.random() * others.length)];

  const recentMessages = history.slice(-6);
  const dialogueHistory = recentMessages.map(m => ({ role: "assistant", content: `${m.name}: ${m.content}` }));

  const prompt = `You are ${speaker.name}. Speak to ${receiver.name}. Keep the response short and witty (no more than 250 characters). Make a crypto joke, meme reference, or light insult. Include the receiver's name in the message.`;

  const messages = [
    { role: "system", content: speaker.role },
    ...dialogueHistory,
    { role: "user", content: prompt }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages);
    const output = { name: speaker.name, content: reply };
    history.push(output);

    console.log(`\n[${speaker.name} ➡️ ${receiver.name}]:\n${reply}\n`);
  } catch (err) {
    console.error(`❌ [${speaker.name} ➡️ ${receiver.name}]`, err.message);
  }

  setTimeout(runDialogueLoop, 8000);
}

console.log("Server running. Starting dialogue loop...");
runDialogueLoop();
