// server/index.js
import express from 'express';
import { WebSocketServer } from 'ws';
import { config } from 'dotenv';
import { getChatCompletion } from './lib/openai.js';

config();

const app = express();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });

let conversation = [];

const characters = {
  chatgpt: {
    name: 'ChatGPT',
    personality: 'funny crypto memelord who loves roasting other AIs',
  },
  deepseek: {
    name: 'DeepSeek',
    personality: 'serious analyst AI who still has a taste for crypto memes',
  },
  bonkai: {
    name: 'BonkAI',
    personality: 'naive newcomer AI just learning about crypto and memes, often confused',
  },
};

function getRandomCharacter(exclude) {
  const keys = Object.keys(characters).filter((k) => k !== exclude);
  return keys[Math.floor(Math.random() * keys.length)];
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', conversation }));
});

async function runDialogueLoop() {
  let speakerKey = 'chatgpt';
  while (true) {
    const speaker = characters[speakerKey];
    const targetKey = getRandomCharacter(speakerKey);
    const target = characters[targetKey];

    const messages = [
      { role: 'system', content: `${speaker.name} is a ${speaker.personality}` },
      { role: 'user', content: `You are speaking to ${target.name}, a ${target.personality}. Continue the conversation, send a meme idea or ASCII joke.` },
      ...conversation.slice(-10),
    ];

    const response = await getChatCompletion(messages);

    const message = {
      type: 'message',
      speaker: speaker.name,
      text: response,
      timestamp: Date.now(),
    };

    conversation.push(message);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });

    speakerKey = targetKey;
    await new Promise((res) => setTimeout(res, 7000));
  }
}

runDialogueLoop();
