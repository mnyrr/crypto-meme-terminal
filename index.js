/// index.js
import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import dotenv from 'dotenv';
dotenv.config();

let history = [];

async function runDialogueLoop() {
  const speaker = agents[Math.floor(Math.random() * agents.length)];
  const others = agents.filter(a => a.name !== speaker.name);
  const receiver = others[Math.floor(Math.random() * others.length)];

  const context = history.slice(-6);
  const messages = [
    { role: "system", content: `You are ${speaker.name}. ${speaker.role}` },
    ...context.map(m => ({ role: "assistant", content: `${m.name}: ${m.content}` })),
    { role: "user", content: `Say something to ${receiver.name}. Make it witty, about crypto and memes.` }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages);
    const output = { name: speaker.name, content: reply };

    history.push(output);
    console.log(`\n[${speaker.name} ➡️ ${receiver.name}]:\n${reply}\n`);
  } catch (err) {
    console.error("Error:", err.message);
  }

  setTimeout(runDialogueLoop, 8000);
}

console.log("Server running. Starting dialogue loop...");
runDialogueLoop();