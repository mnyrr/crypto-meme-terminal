import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getChatCompletion(modelId, messages, history) {
  console.log(`Requesting completion - Model: ${modelId}, Messages length: ${messages.length}`);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.9,
      max_tokens: 800
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data.error?.message || res.statusText}`);

  const usage = data.usage;
  if (usage) {
    const logMessage = `Tokens used - Model: ${modelId}, Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`;
    console.log(logMessage);
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    const logFile = path.join(logDir, 'token_log.txt');
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${logMessage}\n`);
  }

  return data.choices[0].message.content;
}