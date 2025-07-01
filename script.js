
const API_URL = 'https://script.google.com/macros/s/AKfycbzNMTwYH6URiHKx26XPph2prcwyO22p6GyIn49IsfA2dr2yv3rNBinTz3Es2lFw77VUFQ/exec';
const CARDS_JSON = 'bingo_cards.json';
const WHATSAPP_PHONE = '584266404042';
const ADMIN_PASSWORD = 'Jrr035$$*';
const DRAW_INTERVAL = 3000;

let drawnNumbers = [];
let drawInterval;
let isDrawing = false;
let voiceEnabled = true;
let currentMode = 'full';
let unlocked = false;
let cardsData = [];

const drawnGrid = document.getElementById('drawn-grid');
const cardsContainer = document.getElementById('cards-container');
const sentinel = document.getElementById('sentinel');

async function loadCards(offset = 0, limit = 50) {
  const res = await fetch(CARDS_JSON);
  const all = await res.json();
  cardsData = all;
  const slice = all.slice(offset, offset + limit);
  slice.forEach(card => renderCard(card));
}

function renderCard(card) {
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.id = card.id;
  const estado = card.estado || 'DISPONIBLE';
  if (estado === 'RESERVADO') div.classList.add('reserved');
  div.innerHTML = `<div class="card-id">#${card.id}</div>`;
  const grid = document.createElement('div');
  grid.className = 'grid';
  card.grid.forEach(row => row.forEach(num => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = num === "FREE" ? "★" : num;
    if (num === "FREE") cell.classList.add('free');
    grid.appendChild(cell);
  }));
  div.appendChild(grid);
  div.onclick = () => {
    if (div.classList.contains('reserved')) return;
    document.getElementById('modal-card-id').textContent = card.id;
    document.getElementById('reserve-form').dataset.id = card.id;
    document.getElementById('modal').classList.remove('hidden');
  };
  cardsContainer.appendChild(div);
}

document.getElementById('reserve-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = e.target.dataset.id;
  const nombre = e.target.nombre.value;
  const apellido = e.target.apellido.value;
  const telefono = e.target.telefono.value;
  const params = new URLSearchParams({ id, nombre, apellido, telefono });
  await fetch(API_URL + '?' + params.toString());
  const msg = `Hola, quiero reservar el cartón #${id}\nNombre: ${nombre} ${apellido}\nTeléfono: ${telefono}`;
  window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  document.getElementById('modal').classList.add('hidden');
  location.reload();
});

document.getElementById('modal-close').onclick = () => {
  document.getElementById('modal').classList.add('hidden');
};

document.getElementById('btn-unlock').onclick = () => {
  const pwd = prompt("Introduce la contraseña:");
  if (pwd === ADMIN_PASSWORD) {
    document.getElementById('control-panel').classList.remove('locked');
    unlocked = true;
  }
};

document.getElementById('btn-start').onclick = () => {
  if (isDrawing) return;
  isDrawing = true;
  drawInterval = setInterval(drawNumber, DRAW_INTERVAL);
};

document.getElementById('btn-stop').onclick = () => {
  isDrawing = false;
  clearInterval(drawInterval);
};

document.getElementById('btn-voice').onclick = () => {
  voiceEnabled = !voiceEnabled;
};

document.getElementById('btn-reset').onclick = () => {
  if (!unlocked) return;
  drawnNumbers = [];
  drawnGrid.innerHTML = '';
};

document.querySelectorAll('.mode').forEach(btn => {
  btn.onclick = () => currentMode = btn.dataset.mode;
});

document.getElementById('btn-search').onclick = () => {
  const val = parseInt(document.getElementById('search-input').value);
  if (!val) return;
  const el = [...document.querySelectorAll('.card')].find(c => parseInt(c.dataset.id) === val);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

function drawNumber() {
  if (drawnNumbers.length >= 75) return;
  let num;
  do {
    num = Math.floor(Math.random() * 75) + 1;
  } while (drawnNumbers.includes(num));
  drawnNumbers.push(num);
  const letter = "BINGO"[Math.floor((num - 1) / 15)];
  const full = `${letter}-${num}`;
  const div = document.createElement('div');
  div.className = 'drawn-num';
  div.textContent = full;
  drawnGrid.appendChild(div);
  if (voiceEnabled) speak(full);
}

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utter);
}

// Scroll infinito
let offset = 0;
let loading = false;
const observer = new IntersectionObserver(async entries => {
  if (entries[0].isIntersecting && !loading) {
    loading = true;
    offset += 50;
    await loadCards(offset, 50);
    loading = false;
  }
});
observer.observe(sentinel);

// Inicial
loadCards();
