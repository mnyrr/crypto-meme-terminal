const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const output = document.getElementById('output');
const cooldown = document.getElementById('cooldown');
let isCooldown = false;

sendBtn.onclick = () => {
  if (isCooldown || !input.value.trim()) return;
  const msg = input.value.trim();
  input.value = '';
  output.innerText += `> You: ${msg}\n`;
  fetch('/user', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message: msg}) });
  startCooldown(30);
};

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

const es = new EventSource('/stream');
es.onmessage = e => {
  output.innerText += `${e.data}\n`;
  output.scrollTop = output.scrollHeight;
};
