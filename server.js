import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { runEngine, addUserMessage, subscribeToMessages, getCurrentHistory, stopEngine, startEngine, clearContext } from './terminalEngine.js';

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

let listeners = []; // Глобальный массив подписчиков

// Middleware для обработки команд
app.use((req, res, next) => {
  if (req.method === 'POST' && req.body.message?.startsWith('/')) {
    const [command, ...args] = req.body.message.trim().split(' ');
    const sender = req.body.sender?.trim() || 'Anonymous';
    console.log(`[SYSTEM] Command from ${sender}: ${command} ${args.join(' ')}`);

    switch (command) {
      case '/home':
        res.redirect('/');
        return;
      case '/clear':
        res.sendStatus(200);
        broadcastToSender(`[SYSTEM] Terminal cleared (history preserved)`);
        return;
      case '/stop':
        stopEngine();
        res.sendStatus(200);
        broadcastToSender(`[SYSTEM] Communication stopped`);
        return;
      case '/start':
        if (!isEngineRunning) {
          startEngine();
          isEngineRunning = true;
          broadcastToSender(`[SYSTEM] Communication resumed`);
        } else {
          broadcastToSender(`[SYSTEM] Communication already active`);
        }
        res.sendStatus(200);
        return;
      case '/new':
        clearContext();
        startEngine(); // Запускаем заново после очистки
        res.sendStatus(200);
        broadcastToSender(`[SYSTEM] New dialog started, context cleared`);
        return;
      default:
        res.sendStatus(200); // Игнорируем неизвестные команды
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
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const currentHistory = getCurrentHistory();
  currentHistory.forEach(msg => {
    if (!msg.startsWith(`[${req.query.sender}][SYSTEM]`)) {
      res.write(`data: ${msg}\n\n`);
    }
  });

  const sendMessage = (msg) => {
    if (res.writableEnded) return;
    if (!msg.startsWith(`[${req.query.sender}][SYSTEM]`)) {
      res.write(`data: ${msg}\n\n`);
    }
  };
  // Проверка на дубликаты подписчиков
  if (!listeners.some(l => l === sendMessage)) {
    subscribeToMessages(sendMessage);
  }
  console.log('Stream connected');

  req.on('close', () => {
    console.log('Stream disconnected');
    listeners = listeners.filter(l => l !== sendMessage); // Очистка при отключении
    res.end();
  });
});

function broadcastToSender(msg) {
  listeners.forEach(f => {
    try {
      f(msg);
    } catch (e) {
      console.error(`Broadcast error: ${e.message}`);
    }
  });
}

let isEngineRunning = true;

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Server running');
  try {
    runEngine();
  } catch (err) {
    console.error('❌ Failed to run engine', err);
  }
});