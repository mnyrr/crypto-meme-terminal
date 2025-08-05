const output = document.getElementById('output');

let userId = localStorage.getItem('terminalUserId');
if (!userId) {
  userId = 'User' + Math.floor(Math.random() * 1000000000);
  localStorage.setItem('terminalUserId', userId);
}

const inputLine = document.createElement('div');
inputLine.className = 'input-line';
inputLine.innerHTML = `<span class="prompt">[${userId}]: </span><span class="input-text"><span class="cursor">▋</span></span>`;
output.appendChild(inputLine);

const hiddenInput = document.createElement('input');
hiddenInput.id = 'user-input';
hiddenInput.type = 'text';
hiddenInput.className = 'hidden-input';
document.body.appendChild(hiddenInput);

function updateInputDisplay() {
  const inputText = document.querySelector('.input-text');
  const cursor = inputText.querySelector('.cursor');
  inputText.innerHTML = '';
  inputText.appendChild(document.createTextNode(hiddenInput.value));
  inputText.appendChild(cursor);
}

function isSelectingText() {
  const sel = window.getSelection();
  return sel && sel.type === 'Range';
}

function moveInputToEnd() {
  output.appendChild(inputLine);
  scrollToBottomIfEnabled();
}

window.onload = async () => {
  if (!isSelectingText()) hiddenInput.focus();
  await loadInitialHistory();
  moveInputToEnd();
};

window.addEventListener('focus', () => {
  setTimeout(() => {
    if (!isSelectingText()) hiddenInput.focus();
  }, 50);
});

document.querySelector('.output-container').addEventListener('click', () => {
  if (!isSelectingText()) hiddenInput.focus();
});

let isAutoScrollEnabled = true;

function checkAutoScroll() {
  const container = document.querySelector('.output-container');
  const containerBottom = container.scrollTop + container.clientHeight;
  const contentBottom = container.scrollHeight;
  isAutoScrollEnabled = Math.abs(contentBottom - containerBottom) < 5; // Включается только внизу
}

function scrollToBottomIfEnabled() {
  const container = document.querySelector('.output-container');
  if (isAutoScrollEnabled) {
    container.scrollTop = container.scrollHeight;
    scrollInputIntoView();
  }
}

function scrollInputIntoView() {
  inputLine.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

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
  moveInputToEnd();
}

hiddenInput.addEventListener('input', () => {
  updateInputDisplay();
  scrollToBottomIfEnabled(); // Перемещаем вниз при начале набора
  checkAutoScroll(); // Проверяем позицию скролла
});

hiddenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function typewriterEffect(data) {
  const line = document.createElement('div');
  output.insertBefore(line, inputLine);
  inputLine.style.display = 'none';

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
      const char = message[i];
      line.insertBefore(document.createTextNode(char), cursor);
      if (char === '\n' || i === message.length - 1) {
        checkAutoScroll(); // Проверяем скролл после каждой строки или конца
        scrollToBottomIfEnabled(); // Динамический скролл
      }
      i++;
    } else {
      clearInterval(interval);
      cursor.remove();
      inputLine.style.display = 'flex';
      moveInputToEnd();
    }
  }, 20);
}

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
    moveInputToEnd();
  }
}

const es = new EventSource('/stream');
es.onmessage = (e) => {
  if (e.data === '[CLEAR]') {
    output.innerHTML = '';
    output.appendChild(inputLine);
  } else if (!e.data.startsWith(`[${userId}]`)) {
    typewriterEffect(e.data);
  }
};

document.querySelector('.output-container').addEventListener('scroll', () => {
  checkAutoScroll();
});