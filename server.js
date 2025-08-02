import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { runEngine, addUserMessage, subscribeToMessages } from './terminalEngine.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const listeners = [];

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/user', (req, res) => {
  addUserMessage(req.body.message);
  res.sendStatus(200);
});

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  subscribeToMessages(msg => res.write(`data: ${msg}\n\n`));
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
  runEngine();
});
