const input = document.getElementById('user-input');
const output = document.getElementById('output');
const outputContainer = document.querySelector('.output-container');

let shouldAutoScroll = true;

let userId = localStorage.getItem('terminalUserId');
if (!userId) {
  userId = 'User' + Math.floor(Math.random() * 1000000000);
  localStorage.setItem('terminalUserId', userId);
}

// Создаем поле ввода внутри output
const inputLine = document.createElement('div');
inputLine.className = 'input-line';
inputLine.innerHTML = `
  <span class="prompt">[${userId}]: </span>
  <span class="input-text"></span>
  <span class="cursor">▋</span>
`;
output.appendChild(inputLine);

// Скрытое поле ввода
const hiddenInput = document.createElement('input');
hiddenInput.id = 'user-input';
hiddenInput.type = 'text';
hiddenInput.className = 'hidden-input';
document.body.appendChild(hiddenInput);

// Прокрутка вниз при необходимости
function maybeScrollToBottom() {
  if (shouldAutoScroll) {
    outputContainer.scrollTop = outputContainer.scrollHeight;
  }
}

// Отслеживаем ручную прокрутку
outputContainer.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = outputContainer;
  shouldAutoScroll = scrollHeight - scrollTop <= clientHeight + 5;
});

hiddenInput.addEventListener('input', updateInputDisplay);
hiddenInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function updateInputDisplay() {
  const inputText = document.querySelector('.input-text');
  inputText.textContent = hiddenInput.value;
}

function sendMessage() {
  const msg = hiddenInput.value.trim();
  if (!msg) return;
  
  const line = document.createElement('div');
  line.textContent = `[${userId}]: ${msg}`;
  output.insertBefore(line, inputLine);
  
  hiddenInput.value = '';
  updateInputDisplay();
  maybeScrollToBottom();

  fetch('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, sender: userId })
  });
}

function typewriterEffect(data) {
  const line = document.createElement('div');
  output.insertBefore(line, inputLine);
  
  const [namePart, ...messageParts] = data.split("]: ");
  const name = namePart + "]"; 
  const message = messageParts.join("]: ");

  line.textContent = name + ": ";
  const cursor = document.createElement("span");
  cursor.className = "typing-cursor";
  cursor.innerText = "▋";
  line.appendChild(cursor);

  let i = 0;
  const interval = setInterval(() => {
    if (i < message.length) {
      line.insertBefore(document.createTextNode(message[i]), cursor);
      maybeScrollToBottom();
      i++;
    } else {
      clearInterval(interval);
      cursor.remove();
    }
  }, 30);
}

const es = new EventSource('/stream');
es.onmessage = e => {
  if (!e.data.startsWith(`[${userId}]`)) {
    typewriterEffect(e.data);
  }
};

window.onload = () => hiddenInput.focus();
