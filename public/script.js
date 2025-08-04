const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const output = document.getElementById('output');
const cooldown = document.getElementById('cooldown');

let isCooldown = false;
let userId = localStorage.getItem('terminalUserId');
if (!userId) {
  userId = 'User' + Math.floor(Math.random() * 1000000000);
  localStorage.setItem('terminalUserId', userId);
}

sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = input.value.trim();
  if (!msg || isCooldown) return;
  input.value = '';
  startCooldown(30);

  fetch('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, sender: userId })
  });
}

function startCooldown(sec) {
  isCooldown = true;
  sendBtn.disabled = true;
  cooldown.innerText = `Next in ${sec}s`;
  const iv = setInterval(() => {
    sec--;
    cooldown.innerText = sec > 0 ? `Next in ${sec}s` : '';
    if (sec <= 0) {
      clearInterval(iv);
      isCooldown = false;
      sendBtn.disabled = false;
    }
  }, 1000);
}

function typewriterEffect(data) {
  // Разделяем данные на имя и текст сообщения
  const [namePart, ...messageParts] = data.split("]: ");
  const name = namePart + "]"; // Включаем скобки
  const message = messageParts.join("]: ") + "\n"; // Добавляем перенос строки

  // Мгновенно добавляем имя
  const nameNode = document.createTextNode(name + ": ");
  output.appendChild(nameNode);

  // Добавляем курсор для эффекта печатания
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
      output.appendChild(document.createTextNode("\n")); // Добавляем дополнительный перенос
    }
  }, 30);
}

const es = new EventSource('/stream');
es.onmessage = e => {
  typewriterEffect(e.data);
};