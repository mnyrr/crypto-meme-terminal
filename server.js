import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { runEngine, addUserMessage, subscribeToMessages, getCurrentHistory } from './terminalEngine.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/terminal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terminal.html'));
});

app.use(express.json());

app.post('/user', (req, res) => {
  const text = req.body.message?.trim();
  const sender = req.body.sender?.trim() || 'Anonymous';

  if (text) {
    addUserMessage(sender, text);
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

app.get('/initial-history', (req, res) => {
  const currentHistory = getCurrentHistory();
  res.json(currentHistory);
});

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const currentHistory = getCurrentHistory();
  currentHistory.forEach(msg => {
    res.write(`data: ${msg}\n\n`);
  });

  const sendMessage = (msg) => {
    res.write(`data: ${msg}\n\n`);
  };
  subscribeToMessages(sendMessage);

  req.on('close', () => {
    res.end();
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Server running');
  try {
    runEngine();
  } catch (err) {
    console.error('❌ Failed to run engine', err);
  }
});