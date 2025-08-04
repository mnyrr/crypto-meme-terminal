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

  // Удаляем всё, кроме курсора
  inputText.innerHTML = '';
  inputText.appendChild(document.createTextNode(hiddenInput.value));
  inputText.appendChild(cursor);
}

// Проверка: выделяет ли пользователь текст
function isSelectingText() {
  const sel = window.getSelection();
  return sel && sel.type === 'Range';
}

// Автофокус при загрузке
window.onload = () => {
  if (!isSelectingText()) hiddenInput.focus();
};

// Автофокус при возвращении на вкладку
window.addEventListener('focus', () => {
  setTimeout(() => {
    if (!isSelectingText()) hiddenInput.focus();
  }, 50);
});

// Автофокус при клике по терминалу
document.querySelector('.output-container').addEventListener('click', () => {
  if (!isSelectingText()) hiddenInput.focus();
});

// Прокрутка к нижней части, если пользователь печатает и не скроллит вручную
function scrollToInputIfNeeded() {
  const container = document.querySelector('.output-container');
  const containerBottom = container.scrollTop + container.clientHeight;
  const inputBottom = inputLine.offsetTop + inputLine.offsetHeight;

  const atBottom = Math.abs(containerBottom - container.scrollHeight) < 5;

  if (inputBottom > containerBottom || atBottom) {
    container.scrollTop = container.scrollHeight;
  }
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

  scrollToInputIfNeeded();
}

// Обработка ввода
hiddenInput.addEventListener('input', () => {
  updateInputDisplay();
  scrollToInputIfNeeded();
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

  // Скрываем input-line
  inputLine.style.display = 'none';

  // Добавляем имя
  line.textContent = name + ": ";

  // Курсор для эффекта
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

      // Возвращаем input-line после окончания
      inputLine.style.display = 'flex'; // flex для корректного отображения
      scrollInputIntoView();
    }
  }, 30);
}

// Подключение к EventSource
const es = new EventSource('/stream');
es.onmessage = (e) => {
  if (!e.data.startsWith(`[${userId}]`)) {
    typewriterEffect(e.data);
  }
};
