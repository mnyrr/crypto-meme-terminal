import { getChatCompletion } from './lib/openai.js';

export async function generateMemeCoin(history) {
  // Take the last 10 messages to summarize the meme coin
  const lastMessages = history.slice(-10).map(m => `${m.name}: ${m.content}`).join('\n');
  const prompt = `Summarize the meme coin created in this conversation. Provide TICKER, NAME, DESCRIPTION, and ASCII ART. Then rate it on funniness, popularity, relevance, stupidity, cringe, cuteness, and ATH market cap (in %).`;

  const messages = [
    { role: "system", content: "You are an AI that summarizes meme coins." },
    { role: "user", content: prompt + '\n\n' + lastMessages }
  ];

  try {
    const reply = await getChatCompletion('gpt-4', messages);
    const lines = reply.split('\n');
    const ticker = lines[0].replace('TICKER: ', '');
    const name = lines[1].replace('NAME: ', '');
    const description = lines[2].replace('DESCRIPTION: ', '');
    const asciiArt = lines[3].replace('ASCII ART: ', '');
    const ratings = {
      funniness: parseInt(lines[4].split(': ')[1]),
      popularity: parseInt(lines[5].split(': ')[1]),
      relevance: parseInt(lines[6].split(': ')[1]),
      stupidity: parseInt(lines[7].split(': ')[1]),
      cringe: parseInt(lines[8].split(': ')[1]),
      cuteness: parseInt(lines[9].split(': ')[1]),
      athMarketCap: parseInt(lines[10].split(': ')[1])
    };
    return { ticker, name, description, asciiArt, ratings };
  } catch (err) {
    console.error(`Error generating meme coin summary: ${err.message}`);
    return null;
  }
}