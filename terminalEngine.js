import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import { generateMemeCoin } from './memeGenerator.js';

let history = [];
let lastSpeaker = null;
const DURATION = 15 * 60 * 1000;
let conversationStart = Date.now();

const userQueue = [];

export function addUserMessage(sender, content) {
  userQueue.push({ name: sender, content });
}

export function subscribeToMessages(send) {
  listeners.push(send);
}
const listeners = [];

function broadcast(msg) {
  listeners.forEach(f => f(msg));
}

function pickNextSpeaker() {
  const c = agents.filter(a => a.name !== lastSpeaker);
  return c[Math.floor(Math.random() * c.length)];
}

function buildContext() {
  return history.slice(-8).map(m => ({
    role: "assistant",
    content: `${m.name}: ${m.content}`
  }));
}

async function handleAIReply() {
  const speaker = pickNextSpeaker();
  lastSpeaker = speaker.name;
  const promptMsg = history.length === 0
    ? "Start with a witty crypto meme or joke."
    : `Reply to ${history[history.length-1].name}: "${history[history.length-1].content}" short & witty (max 50 tokens).`;

  const messages = [
    { role: "system", content: `${speaker.role}. Short, max 50 tokens.` },
    ...buildContext(),
    { role: "user", content: promptMsg }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages);
    const content = reply.trim();
    history.push({ name: speaker.name, content });
    broadcast(`[${speaker.name}]: ${content}`);
  } catch (err) {
    console.error(`⚠️ OpenRouter error: ${err.message}`);
    // просто пропускаем шаг
  }
}

async function handleUserQueue() {
  if (userQueue.length > 0) {
    const msg = userQueue.shift();
    history.push(msg); // Сохраняем в истории, но не отправляем через broadcast
  }
}

export async function runEngine() {
  while (true) {
    const now = Date.now();
    if (now - conversationStart >= DURATION) {
      const result = await generateMemeCoin(history);
      broadcast(`🎉 [FINAL MEME COIN]:\n${result}`);
      history = [];
      lastSpeaker = null;
      conversationStart = Date.now();
    }
    await handleUserQueue();
    await handleAIReply();
    await new Promise(r => setTimeout(r, 20000)); // ⏱ 20 сек
  }
}