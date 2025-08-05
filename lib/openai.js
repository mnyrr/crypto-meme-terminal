import fetch from 'node-fetch';

export async function getChatCompletion(modelId, messages, history) {
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
      max_tokens: 500 // Базовый лимит, как в предыдущем обновлении
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data.error?.message || res.statusText}`);

  // Логирование токенов
  const usage = data.usage;
  if (usage) {
    const logMessage = `Tokens used - Model: ${modelId}, Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`;
    console.log(logMessage); // Логи в консоль сервера
    // (Опционально) Сохранение в файл, если нужно
    // const logFile = path.join(__dirname, 'logs', 'token_log.txt');
    // fs.appendFileSync(logFile, `${new Date().toISOString()} - ${logMessage}\n`);
  }

  return data.choices[0].message.content;
}