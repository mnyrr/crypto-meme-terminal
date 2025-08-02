import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import { generateMemeCoin } from './memeGenerator.js';

let history = [];
let lastSpeaker = null;
const MAX_TOKENS = 50;
const DURATION = 15 * 60 * 1000;
const START = Date.now();

const userQueue = [];

export function addUserMessage(text) {
  userQueue.push({ name: 'You', content: text });
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
    : `Reply to ${history[history.length-1].name}: "${history[history.length-1].content}" wit & short (max 50 tokens).`;

  const messages = [
    { role: "system", content: speaker.role + `. Short, max ${MAX_TOKENS} tokens.` },
    ...buildContext(),
    { role: "user", content: promptMsg }
  ];

  const reply = await getChatCompletion(speaker.model, messages);
  const content = reply.trim();
  history.push({ name: speaker.name, content });
  broadcast(`[${speaker.name}]: ${content}`);
}

async function handleUserQueue() {
  if (userQueue.length > 0) {
    const msg = userQueue.shift();
    history.push(msg);
    broadcast(`> You: ${msg.content}`);
  }
}

export async function runEngine() {
  while (true) {
    const now = Date.now();
    if (now - START >= DURATION) {
      const result = await generateMemeCoin(history);
      broadcast(`🎉 [FINAL MEME COIN]:\n${result}`);
      history = [];
      lastSpeaker = null;
      break;
    }
    await handleUserQueue();
    await handleAIReply();
    await new Promise(r => setTimeout(r, 10000));
  }
}
