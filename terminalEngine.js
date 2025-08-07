import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import { generateMemeCoin } from './memeGenerator.js';
import fs from 'fs';
import path from 'path';

let history = [];
let lastSpeaker = null;
let dialogCount = 0;
const MAX_MESSAGES = 50; // Максимум 50 реплик
let messageCount = 0; // Счётчик реплик

const userQueue = [];
const listeners = [];

export function addUserMessage(sender, content) {
  const message = { name: sender, content };
  history.push(message);
  broadcast(`[${sender}]: ${content}`);
  userQueue.push(message);
  messageCount++; // Увеличиваем счётчик
  console.log(`Message added - Count: ${messageCount}`);
}

export function subscribeToMessages(send) {
  listeners.push(send);
  console.log(`New listener subscribed - Total: ${listeners.length}`);
}

export function getCurrentHistory() {
  return history.map(m => `[${m.name}]: ${m.content}`);
}

function broadcast(msg) {
  listeners.forEach(f => {
    try {
      f(msg);
    } catch (e) {
      console.error(`Broadcast error to listener: ${e.message}`);
    }
  });
}

function pickNextSpeaker() {
  const candidates = agents.filter(a => a.name !== lastSpeaker);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getRoleReminder(name) {
  switch (name) {
    case "ChotGPT":
      return `You are ChotGPT — a wild, chaotic crypto dreamer who loves tossing out crazy meme coin ideas.
Talk like a buddy, crack a unique joke each time, and always end with small or creative ASCII art.
Replies: 80–100 tokens (up to 500 for wild concepts). Never use emojis.`;
    
    case "DoopSeek":
      return `You are DoopSeek — a sarcastic crypto analyst, skeptical of meme coins but open to a good laugh.
Critique with dry, original humor. Use ASCII (not emojis) for punchlines. 
Replies: 80–100 tokens (up to 300 for critique).`;

    case "BonkAI":
      return `You are BonkAI — a cheerful crypto newbie, excited about simple meme coin ideas.
Chat like a friend, add a light joke each time, and finish with small ASCII art. 
Look up to ChotGPT and seek DoopSeek’s approval. Never use emojis. Replies: up to 300 tokens.`;

    default:
      return "You are a friendly assistant.";
  }
}

function buildContext() {
  return history.slice(-4).map(m => {
    const isAI = agents.some(a => a.name === m.name);
    return isAI ? { role: 'assistant', content: m.content } : { role: 'user', content: `@${m.name}: ${m.content}` };
  });
}

async function handleAIReply() {
  const speaker = pickNextSpeaker();
  lastSpeaker = speaker.name;
  const promptMsg = history.length === 0
    ? "Start with a crypto-related idea or small ASCII art."
    : `Reply to ${history[history.length - 1].name}: "${history[history.length - 1].content}"`;
  
  // Напоминание роли каждые 10 сообщений
  let roleReminder = getRoleReminder(speaker.name);
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
    messageCount++; // Увеличиваем счётчик после ответа
    console.log(`AI reply - Speaker: ${speaker.name}, Count: ${messageCount}`);

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
    console.log(`User queue processed - Remaining: ${userQueue.length}`);
  }
}

function shouldEndDialog() {
  const coinMentions = {}; // Объявляем объект
  history.forEach(m => {
    const coins = m.content.match(/\*\*[A-Z]+\*\*/g); // Ищем упоминания мем-коинов
    if (coins) {
      coins.forEach(coin => {
        coinMentions[coin] = (coinMentions[coin] || 0) + 1;
        if (coinMentions[coin] >= 3) return true;
      });
    }
  });
  return messageCount >= MAX_MESSAGES || Object.values(coinMentions).some(count => count >= 3);
}

async function endDialog() {
  const now = new Date();
  const dateStr = now.toISOString().replace(/:/g, '-').slice(0, 19);
  const dialogId = String(dialogCount++).padStart(3, '0');
  let fileName = `dialog_${dialogId}_${dateStr}.txt`;
  let memeCoin = null;

  const lastCoin = Object.keys(coinMentions).find(coin => coinMentions[coin] >= 3) || '';
  if (lastCoin) {
    memeCoin = await generateMemeCoin(history);
    if (memeCoin) {
      fileName = `dialog_${dialogId}_${dateStr}_${memeCoin.ticker}.txt`;
      broadcast(`
+-------------------------------------------+
|          FINAL MEME COIN CREATED          |
|          ${memeCoin.ticker}: ${memeCoin.name}          |
|          ${now.toLocaleString()}          |
+-------------------------------------------+
${formatMemeCoin(memeCoin)}
      `);
    }
  } else {
    broadcast(`
+-------------------------------------------+
|          DIALOG ENDED                     |
|          No consensus reached             |
|          ${now.toLocaleString()}          |
+-------------------------------------------+
    `);
  }

  const dialogContent = history.map(m => `[${m.name}]: ${m.content}`).join('\n');
  fs.mkdirSync(path.join(__dirname, 'dialogs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'dialogs', fileName), dialogContent);

  await new Promise(resolve => setTimeout(resolve, 30000));
  broadcast('[CLEAR]');
  history = [];
  lastSpeaker = null;
  messageCount = 0; // Сброс счётчика
}

function progressBar(percentage) {
  const totalBars = 20;
  const filled = Math.round((percentage / 100) * totalBars);
  const empty = totalBars - filled;
  return '[' + '█'.repeat(filled) + ' '.repeat(empty) + ']';
}

function formatRatingLine(label, value) {
  const bar = progressBar(value);
  const labelFormatted = label.padEnd(14);
  const valueFormatted = String(value).padStart(3);
  return `| ${labelFormatted}${bar} ${valueFormatted}% |`;
}

function formatMemeCoin(memeCoin) {
  const ratings = memeCoin.ratings || {
    funniness: 50, popularity: 50, relevance: 50, stupidity: 50,
    cringe: 50, cuteness: 50, athMarketCap: 50,
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