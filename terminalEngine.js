import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import { generateMemeCoin } from './memeGenerator.js';
import fs from 'fs';
import path from 'path';

let history = [];
let lastSpeaker = null;
let dialogCount = 0;
const MAX_MESSAGES = 50;
let messageCount = 0;
let isEngineRunning = true;
let isProcessing = false;

const userQueue = [];
let listeners = [];

export function addUserMessage(sender, content) {
  const message = { name: sender, content };
  history.push(message);
  broadcast(`[${sender}]: ${content}`);
  userQueue.push(message);
  messageCount++;
  console.log(`Message added - Count: ${messageCount}`);
}

export function subscribeToMessages(userId, send) {
  listeners.push({ userId, send });
  console.log(`New listener subscribed for ${userId} - Total: ${listeners.filter(l => l.userId === userId).length}`);
}

export function getCurrentHistory() {
  return history.map(m => `[${m.name}]: ${m.content}`);
}

export function broadcast(msg, targetUserId = null) {
  listeners.forEach(l => {
    if (targetUserId === null || l.userId === targetUserId) {
      try {
        l.send(msg);
      } catch (e) {
        console.error(`Broadcast error to ${l.userId}: ${e.message}`);
      }
    }
  });
}

function pickNextSpeaker() {
  const candidates = agents.filter(a => a.name !== lastSpeaker);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildContext() {
  return history.slice(-4).map(m => {
    const isAI = agents.some(a => a.name === m.name);
    return isAI ? { role: 'assistant', content: m.content } : { role: 'user', content: `@${m.name}: ${m.content}` };
  });
}

async function handleAIReply() {
  if (!isEngineRunning || isProcessing) return;
  isProcessing = true;
  console.log('Starting handleAIReply');

  const speaker = pickNextSpeaker();
  lastSpeaker = speaker.name;
  const promptMsg = history.length === 0
    ? "Start with a crypto-related idea or small ASCII art."
    : `Reply to ${history[history.length - 1].name}: "${history[history.length - 1].content}"`;
  
  let roleReminder = speaker.role;
  if (messageCount > 0 && messageCount % 10 === 0) {
    roleReminder += "\n[REMINDER] Stick to your role and focus on the task. Avoid emojis, use ASCII art.";
  }

  const messages = [
    { role: "system", content: roleReminder },
    ...buildContext(),
    { role: "user", content: promptMsg }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages, history);
    const content = reply.trim();
    history.push({ name: speaker.name, content });
    broadcast(`[${speaker.name}]: ${content}`);
    messageCount++;
    console.log(`AI reply - Speaker: ${speaker.name}, Count: ${messageCount}`);
  } catch (err) {
    console.error(`⚠️ OpenRouter error: ${err.message}`);
  } finally {
    isProcessing = false;
    console.log('Finished handleAIReply');
  }
}

async function handleUserQueue() {
  if (userQueue.length > 0 && isEngineRunning) {
    userQueue.shift();
    console.log(`User queue processed - Remaining: ${userQueue.length}`);
  }
}

export function stopEngine() {
  isEngineRunning = false;
  console.log('[SYSTEM] Engine stopped');
}

export function startEngine() {
  isEngineRunning = true;
  console.log('[SYSTEM] Engine started');
}

export function clearContext() {
  history = [];
  lastSpeaker = null;
  messageCount = 0;
  console.log('[SYSTEM] Context cleared');
}

export async function runEngine() {
  while (true) {
    await handleUserQueue();
    if (isEngineRunning && !isProcessing) {
      await handleAIReply();
      await new Promise(r => setTimeout(r, 5000)); // Задержка для предотвращения одновременных ответов
    }
    await new Promise(r => setTimeout(r, 1000)); // Общая задержка цикла
  }
}