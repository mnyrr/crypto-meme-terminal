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

function moveInputToEnd() {
  output.appendChild(inputLine);
  scrollToBottomIfEnabled();
}

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
  }).then(() => {
    scrollToBottomIfEnabled();
    moveInputToEnd();
  });
}

hiddenInput.addEventListener('input', () => {
  updateInputDisplay();
  scrollToBottomIfEnabled();
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
      scrollToBottomIfEnabled(); // Прокрутка после каждого символа
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
  const response = await fetch('/initial-history?sender=' + userId);
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

const es = new EventSource('/stream?sender=' + userId);
es.onmessage = (e) => {
  const data = e.data;
  if (data === '[CLEAR_TERMINAL]') {
    output.innerHTML = '';
    output.appendChild(inputLine);
    scrollToBottomIfEnabled();
  } else if (data === '[NEW_DIALOG]') {
    output.innerHTML = '';
    output.appendChild(inputLine);
    loadInitialHistory();
  } else if (data === '[GO_HOME]') {
    window.location.href = '/';
  } else if (data.startsWith(`[SYSTEM]:`)) {
    const line = document.createElement('div');
    line.textContent = data;
    output.insertBefore(line, inputLine);
    scrollToBottomIfEnabled();
  } else if (!data.startsWith(`[${userId}]`)) {
    typewriterEffect(data);
  }
};

document.querySelector('.output-container').addEventListener('scroll', () => {
  checkAutoScroll();
});