import { agents } from './config/agents.js';
import { getChatCompletion } from './lib/openai.js';
import dotenv from 'dotenv';
dotenv.config();

let history = [];
let currentSpeakerIndex = 0;
let isNewConversation = true;
let conversationStartTime = Date.now();

const memeCoinKeywords = ["create a meme coin", "let's make a coin", "how about a coin", "meme coin idea"];

async function runDialogueLoop() {
  const speaker = agents[currentSpeakerIndex];
  const recentMessages = history.slice(-6);
  const dialogueHistory = recentMessages.map(m => ({ role: "assistant", content: `${m.name}: ${m.content}` }));

  let prompt;
  if (isNewConversation) {
    prompt = `Start a new conversation with a joke, tease, or comment about crypto or memes. Keep it short and witty (max 250 chars).`;
    isNewConversation = false;
  } else {
    const previousMessage = history[history.length - 1];
    prompt = `Respond to ${previousMessage.name}'s message: "${previousMessage.content}". Keep it short and witty (max 250 chars).`;
  }

  const messages = [
    { role: "system", content: `${speaker.role} Keep responses short and witty, max 250 characters.` },
    ...dialogueHistory,
    { role: "user", content: prompt }
  ];

  try {
    const reply = await getChatCompletion(speaker.model, messages);
    const output = { name: speaker.name, content: reply };
    history.push(output);

    console.log(`\n[${speaker.name}]:\n${reply}\n`);

    const lowerCaseMessage = reply.toLowerCase();
    if (memeCoinKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
      const memeCoinPrompt = `Based on the conversation, create a meme coin. Give ticker, name, description, and ASCII art. Keep it short and witty.`;
      const memeCoinDetails = await getChatCompletion(speaker.model, [
        { role: "system", content: speaker.role },
        ...dialogueHistory,
        { role: "user", content: memeCoinPrompt }
      ]);
      console.log(`\n[Meme Coin by ${speaker.name}]:\n${memeCoinDetails}\n`);
      history = [];
      isNewConversation = true;
      conversationStartTime = Date.now();
    }

    const currentTime = Date.now();
    if (currentTime - conversationStartTime >= 15 * 60 * 1000) {
      console.log("\n[Timeout: New conversation starting]\n");
      history = [];
      isNewConversation = true;
      conversationStartTime = Date.now();
    }
  } catch (err) {
    console.error(`❌ [${speaker.name}]`, err.message);
  }

  currentSpeakerIndex = (currentSpeakerIndex + 1) % agents.length;
  setTimeout(runDialogueLoop, 10000);
}

console.log("Server running. Starting dialogue loop...");
runDialogueLoop();