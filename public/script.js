const output = document.getElementById('output');

// Создание уникального userId
let userId = localStorage.getItem('terminalUserId');
if (!userId) {
  userId = 'User' + Math.floor(Math.random() * 1000000000);
  localStorage.setItem('terminalUserId', userId);
}

// Создание inputLine
const inputLine = document.createElement('div');
inputLine.className = 'input-line';
inputLine.innerHTML = `
  <span class="prompt">[${userId}]: </span>
  <span class="input-text"><span class="cursor">▋</span></span>
`;
output.appendChild(inputLine);

// Скрытый input
const hiddenInput = document.createElement('input');
hiddenInput.id = 'user-input';
hiddenInput.type = 'text';
hiddenInput.className = 'hidden-input';
document.body.appendChild(hiddenInput);

// Обновление текста в inputLine
function updateInputDisplay() {
  const inputText = document.querySelector('.input-text');
  const cursor = inputText.querySelector('.cursor');

  inputText.innerHTML = '';
  inputText.appendChild(document.createTextNode(hiddenInput.value));
  inputText.appendChild(cursor);
}

// Проверка: выделяет ли пользователь текст
function isSelectingText() {
  const sel = window.getSelection();
  return sel && sel.type === 'Range';
}

// Автофокус
window.onload = async () => {
  if (!isSelectingText()) hiddenInput.focus();
  await loadInitialHistory();
};

window.addEventListener('focus', () => {
  setTimeout(() => {
    if (!isSelectingText()) hiddenInput.focus();
  }, 50);
});

document.querySelector('.output-container').addEventListener('click', () => {
  if (!isSelectingText()) hiddenInput.focus();
});

// Управление автоскроллом
let isAutoScrollEnabled = true;

function checkAutoScroll() {
  const container = document.querySelector('.output-container');
  const containerBottom = container.scrollTop + container.clientHeight;
  const contentBottom = container.scrollHeight;

  isAutoScrollEnabled = Math.abs(contentBottom - containerBottom) < 5;
}

function scrollToBottomIfEnabled() {
  const container = document.querySelector('.output-container');
  if (isAutoScrollEnabled) {
    container.scrollTop = container.scrollHeight;
  }
}

function scrollInputIntoView() {
  inputLine.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Отправка сообщения
function sendMessage() {
  const msg = hiddenInput.value.trim();
  if (!msg) return;

  const line = document.createElement('div');
  line.textContent = `[${userId}]: ${msg}`;
  output.insertBefore(line, inputLine);

  hiddenInput.value = '';
  updateInputDisplay();

  fetch('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, sender: userId })
  });

  scrollToBottomIfEnabled();
}

// Обработка ввода
hiddenInput.addEventListener('input', () => {
  updateInputDisplay();
  scrollToBottomIfEnabled();
});

hiddenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Typewriter-эффект для входящих сообщений
function typewriterEffect(data) {
  const line = document.createElement('div');
  output.insertBefore(line, inputLine);

  const [namePart, ...messageParts] = data.split("]: ");
  const name = namePart + "]";
  const message = messageParts.join("]: ");

  inputLine.style.display = 'none';

  line.textContent = name + ": ";

  const cursor = document.createElement("span");
  cursor.className = "typing-cursor";
  cursor.innerText = "▋";
  line.appendChild(cursor);

  let i = 0;
  const interval = setInterval(() => {
    if (i < message.length) {
      line.insertBefore(document.createTextNode(message[i]), cursor);
      checkAutoScroll();
      scrollToBottomIfEnabled();
      i++;
    } else {
      clearInterval(interval);
      cursor.remove();
      inputLine.style.display = 'flex';
      scrollInputIntoView();
    }
  }, 30);
}

// Моментальная загрузка начальной истории
async function loadInitialHistory() {
  const response = await fetch('/initial-history');
  if (response.ok) {
    const history = await response.json();
    history.forEach(msg => {
      const line = document.createElement('div');
      line.textContent = msg;
      output.appendChild(line);
    });
    scrollToBottomIfEnabled();
  }
}

// Подключение к EventSource
const es = new EventSource('/stream');
es.onmessage = (e) => {
  if (e.data === '[CLEAR]') {
    output.innerHTML = '';
    output.appendChild(inputLine);
  } else if (!e.data.startsWith(`[${userId}]`)) {
    typewriterEffect(e.data);
  }
};

// Обработка прокрутки пользователем
document.querySelector('.output-container').addEventListener('scroll', () => {
  checkAutoScroll();
});