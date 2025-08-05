import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import { generateMemeCoin } from './memeGenerator.js';
import fs from 'fs';
import path from 'path';

let history = [];
let lastSpeaker = null;
let dialogCount = 0;
const MAX_MESSAGES = 50; // Maximum 50 messages per dialog

const userQueue = [];
const listeners = [];

export function addUserMessage(sender, content) {
  const message = { name: sender, content };
  history.push(message);
  broadcast(`[${sender}]: ${content}`);
  userQueue.push(message);
}

export function subscribeToMessages(send) {
  listeners.push(send);
}

export function getCurrentHistory() {
  return history.map(m => `[${m.name}]: ${m.content}`);
}

function broadcast(msg) {
  listeners.forEach(f => f(msg));
}

function pickNextSpeaker() {
  const candidates = agents.filter(a => a.name !== lastSpeaker);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildContext() {
  return history.slice(-8).map(m => {
    const isAI = agents.some(a => a.name === m.name);

    if (isAI) {
      return { role: 'assistant', content: m.content };
    } else {
      return { role: 'user', content: `@${m.name}: ${m.content}` };
    }
  });
}

async function handleAIReply() {
  const speaker = pickNextSpeaker();
  lastSpeaker = speaker.name;
  const promptMsg = history.length === 0
    ? "Start with a witty crypto meme or joke."
    : `Reply to ${history[history.length - 1].name}: "${history[history.length - 1].content}"`;

  const messages = [
    { role: "system", content: speaker.role },
    ...buildContext(),
    { role: "user", content: promptMsg }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages, history);
    const content = reply.trim();
    history.push({ name: speaker.name, content });
    broadcast(`[${speaker.name}]: ${content}`);

    if (shouldEndDialog()) {
      await endDialog();
    }
  } catch (err) {
    console.error(`⚠️ OpenRouter error: ${err.message}`);
  }
}

async function handleUserQueue() {
  if (userQueue.length > 0) {
    userQueue.shift();
  }
}

function shouldEndDialog() {
  return history.length >= MAX_MESSAGES || 
         history.some(m => m.content.toLowerCase().includes("meme coin created"));
}

async function endDialog() {
  const now = new Date();
  const dateStr = now.toISOString().replace(/:/g, '-').slice(0, 19);
  const dialogId = String(dialogCount++).padStart(3, '0');
  let fileName = `dialog_${dialogId}_${dateStr}.txt`;
  let memeCoin = null;

  if (history.some(m => m.content.toLowerCase().includes("meme coin created"))) {
    memeCoin = await generateMemeCoin(history);
    if (memeCoin) {
      fileName = `dialog_${dialogId}_${dateStr}_${memeCoin.ticker}.txt`;
      broadcast(`🎉 [FINAL MEME COIN]:\n${formatMemeCoin(memeCoin)}`);
    }
  } else {
    broadcast(`
+-------------------------------------------+
|          [DIALOG ENDED]                   |
|          Dialog ended                     |
|          New dialog starting soon         |
|          ${now.toLocaleString()}          |
+-------------------------------------------+
    `);
  }

  const dialogContent = history.map(m => `[${m.name}]: ${m.content}`).join('\n');
  fs.mkdirSync(path.join(__dirname, 'dialogs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'dialogs', fileName), dialogContent);

  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 секунд задержка
  broadcast('[CLEAR]');

  history = [];
  lastSpeaker = null;
}

function progressBar(percentage) {
  const totalBars = 20;
  const filled = Math.round((percentage / 100) * totalBars);
  const empty = totalBars - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

function formatRatingLine(label, value) {
  const bar = progressBar(value);
  const labelFormatted = label.padEnd(14);
  const valueFormatted = String(value).padStart(3);
  return `| ${labelFormatted}${bar} ${valueFormatted}% |`;
}

function formatMemeCoin(memeCoin) {
  const ratings = memeCoin.ratings || {
    funniness: 50,
    popularity: 50,
    relevance: 50,
    stupidity: 50,
    cringe: 50,
    cuteness: 50,
    athMarketCap: 50,
  };

  return `
+-------------------------------------------+
|                MEME COIN                  |
+-------------------------------------------+
| TICKER: ${memeCoin.ticker.padEnd(35)}|
| NAME: ${memeCoin.name.padEnd(37)}|
| DESCRIPTION: ${memeCoin.description.padEnd(29)}|
| ASCII ART:                                |
| ${memeCoin.asciiArt.padEnd(41)}|
+-------------------------------------------+
| RATINGS:                                  |
${formatRatingLine('Funniness:', ratings.funniness)}
${formatRatingLine('Popularity:', ratings.popularity)}
${formatRatingLine('Relevance:', ratings.relevance)}
${formatRatingLine('Stupidity:', ratings.stupidity)}
${formatRatingLine('Cringe:', ratings.cringe)}
${formatRatingLine('Cuteness:', ratings.cuteness)}
${formatRatingLine('ATH M.Cap:', ratings.athMarketCap)}
+-------------------------------------------+
| Ended: ${new Date().toLocaleString().padEnd(29)}|
+-------------------------------------------+
  `;
}

export async function runEngine() {
  while (true) {
    await handleUserQueue();
    await handleAIReply();
    await new Promise(r => setTimeout(r, 20000));
  }
}