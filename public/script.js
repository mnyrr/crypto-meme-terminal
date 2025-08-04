const input = document.getElementById('user-input');
const output = document.getElementById('output');

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

// Скрытое поле ввода для реального ввода
const hiddenInput = document.createElement('input');
hiddenInput.id = 'user-input';
hiddenInput.type = 'text';
hiddenInput.className = 'hidden-input';
document.body.appendChild(hiddenInput);

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
  
  // Мгновенный вывод для текущего пользователя
  const line = document.createElement('div');
  line.textContent = `[${userId}]: ${msg}`;
  output.insertBefore(line, inputLine);
  
  // Очищаем ввод
  hiddenInput.value = '';
  updateInputDisplay();
  
  // Отправка на сервер
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

  // Мгновенно добавляем имя
  line.textContent = name + ": ";

  // Добавляем курсор
  const cursor = document.createElement("span");
  cursor.className = "typing-cursor";
  cursor.innerText = "▋";
  line.appendChild(cursor);

  let i = 0;
  const interval = setInterval(() => {
    if (i < message.length) {
      line.insertBefore(document.createTextNode(message[i]), cursor);
      output.scrollTop = output.scrollHeight;
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

// Автофокус на поле ввода при загрузке
window.onload = () => hiddenInput.focus();