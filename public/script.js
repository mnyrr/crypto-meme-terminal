const input = document.getElementById('user-input');
const output = document.getElementById('output');
const prompt = document.getElementById('prompt');

let userId = localStorage.getItem('terminalUserId');
if (!userId) {
  userId = 'User' + Math.floor(Math.random() * 1000000000);
  localStorage.setItem('terminalUserId', userId);
}

// Установка prompt
prompt.textContent = `[${userId}]: `;

// Курсор для ввода
const cursor = document.createElement('span');
cursor.className = 'cursor';
cursor.textContent = '▋';
input.parentNode.appendChild(cursor);

input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  
  // Мгновенный вывод для текущего пользователя
  const line = `[${userId}]: ${msg}\n`;
  output.appendChild(document.createTextNode(line));
  output.scrollTop = output.scrollHeight;

  // Отправка на сервер
  fetch('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, sender: userId })
  });
}

function typewriterEffect(data) {
  const [namePart, ...messageParts] = data.split("]: ");
  const name = namePart + "]"; 
  const message = messageParts.join("]: ") + "\n";

  // Мгновенно добавляем имя
  const nameNode = document.createTextNode(name + ": ");
  output.appendChild(nameNode);

  // Добавляем курсор
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.innerText = "▋";
  output.appendChild(cursor);

  let i = 0;
  const interval = setInterval(() => {
    if (i < message.length) {
      output.insertBefore(document.createTextNode(message[i]), cursor);
      output.scrollTop = output.scrollHeight;
      i++;
    } else {
      clearInterval(interval);
      cursor.remove();
      output.appendChild(document.createTextNode("\n"));
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
window.onload = () => input.focus();