import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { runEngine, addUserMessage, subscribeToMessages, getCurrentHistory, stopEngine, startEngine, clearContext, broadcast } from './terminalEngine.js';

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

// Обработка команд
app.use((req, res, next) => {
  if (req.method === 'POST' && req.body.message?.startsWith('/')) {
    const [command, ...args] = req.body.message.trim().split(' ');
    const sender = req.body.sender?.trim() || 'Anonymous';
    console.log(`[SYSTEM] Command from ${sender}: ${command} ${args.join(' ')}`);

    switch (command) {
      case '/home':
        res.sendStatus(200);
        broadcast('[GO_HOME]', sender);
        broadcast(`[SYSTEM]: Redirecting to home`, sender);
        return;
      case '/clear':
        res.sendStatus(200);
        broadcast('[CLEAR_TERMINAL]', sender);
        broadcast(`[SYSTEM]: Terminal cleared (history preserved)`, sender);
        return;
      case '/stop':
        stopEngine();
        res.sendStatus(200);
        broadcast(`[SYSTEM]: Communication stopped`, sender);
        return;
      case '/start':
        if (!isEngineRunning) {
          startEngine();
          isEngineRunning = true;
          broadcast(`[SYSTEM]: Communication resumed`, sender);
        } else {
          broadcast(`[SYSTEM]: Communication already active`, sender);
        }
        res.sendStatus(200);
        return;
      case '/new':
        clearContext();
        startEngine();
        res.sendStatus(200);
        broadcast('[NEW_DIALOG]', sender);
        broadcast(`[SYSTEM]: New dialog started, context cleared`, sender);
        return;
      default:
        res.sendStatus(200);
    }
  }
  next();
});

app.post('/user', (req, res) => {
  const text = req.body.message?.trim();
  const sender = req.body.sender?.trim() || 'Anonymous';

  if (text && !text.startsWith('/')) {
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
  const userId = req.query.sender;
  if (!userId) {
    res.sendStatus(400);
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendMessage = (msg) => {
    if (res.writableEnded) return;
    res.write(`data: ${msg}\n\n`);
  };
  subscribeToMessages(userId, sendMessage);

  const currentHistory = getCurrentHistory();
  currentHistory.forEach(msg => {
    if (!msg.startsWith(`[${userId}][SYSTEM]`)) {
      res.write(`data: ${msg}\n\n`);
    }
  });

  req.on('close', () => {
    console.log(`Stream disconnected for ${userId}`);
    listeners = listeners.filter(l => l.send !== sendMessage);
    res.end();
  });
});

let isEngineRunning = true;

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Server running');
  try {
    runEngine();
  } catch (err) {
    console.error('❌ Failed to run engine', err);
  }
});