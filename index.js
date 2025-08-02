import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import { generateMemeCoin } from './memeGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

let history = [];
let conversationStartTime = Date.now();
let lastSpeaker = null;

const MAX_DIALOG_DURATION = 15 * 60 * 1000;
const DELAY_BETWEEN_MESSAGES_MS = 10000;
const MAX_TOKENS = 50;

function pickNextSpeaker() {
  const candidates = agents.filter(agent => agent.name !== lastSpeaker);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildDialogueHistory() {
  return history.slice(-10).map(m => ({
    role: "assistant",
    content: `${m.name}: ${m.content}`
  }));
}

async function runDialogueLoop() {
  const currentTime = Date.now();
  const isTimeout = currentTime - conversationStartTime >= MAX_DIALOG_DURATION;

  if (isTimeout) {
    console.log(`\n🕒 [Conversation timeout reached. Generating meme coin...]\n`);
    const memeCoin = await generateMemeCoin(history);
    console.log(`\n🎉 [FINAL MEME COIN]:\n${memeCoin}\n`);
    history = [];
    conversationStartTime = Date.now();
    lastSpeaker = null;
    return setTimeout(runDialogueLoop, DELAY_BETWEEN_MESSAGES_MS);
  }

  const speaker = pickNextSpeaker();
  lastSpeaker = speaker.name;

  const isNew = history.length === 0;
  const dialogueHistory = buildDialogueHistory();

  const prompt = isNew
    ? `Start the conversation with a witty crypto meme, joke, or roast. Max ${MAX_TOKENS} tokens.`
    : `Respond to ${history[history.length - 1].name}'s message: "${history[history.length - 1].content}". Be witty, sarcastic or funny. Max ${MAX_TOKENS} tokens.`;

  const messages = [
    { role: "system", content: `${speaker.role}. Keep replies witty and short, max ${MAX_TOKENS} tokens.` },
    ...dialogueHistory,
    { role: "user", content: prompt }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages);
    const output = { name: speaker.name, content: reply.trim() };
    history.push(output);

    console.log(`\n[${speaker.name}]:\n${reply.trim()}\n`);
  } catch (err) {
    console.error(`❌ [${speaker.name}]`, err.message);
  }

  setTimeout(runDialogueLoop, DELAY_BETWEEN_MESSAGES_MS);
}

console.log("🚀 Dialogue loop starting...");
runDialogueLoop();
