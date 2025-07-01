// ==================== CONFIG ====================
const API_URL = 'https://script.google.com/macros/s/AKfycbzaEXxImofLR8zaw7b3zt16LyQF9ytlcSNNusR8dJWslXiL8bVNW9vBXxDlt9n-tTB8aw/exec';
const CARDS_JSON = 'bingo_cards.json';
const PAGE_SIZE = 50;
const DRAW_INTERVAL_MS = 3000;
const ADMIN_SECRET_PROMPT = 'Introduce la contraseña:';
// =================================================

let cardsData = [];
let loadedCount = 0;
let reservedMap = new Map();          // id -> true
let cardsMarks = new Map();           // id -> 5x5 boolean[][]
let winners = new Set();              // id ganadores
let currentMode = 'full';             // modo por defecto
let drawTimer = null;
let remainingNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
let isAdmin = false;
let adminSecret = null;

// DOM refs
const cardsContainer = document.getElementById('cards-container');
const sentinel = document.getElementById('sentinel');
const modal = document.getElementById('modal');
const modalCardIdSpan = document.getElementById('modal-card-id');
const modalCloseBtn = document.getElementById('modal-close');
const reserveForm = document.getElementById('reserve-form');
const controlPanel = document.getElementById('control-panel');

// Buttons
document.getElementById('btn-start').addEventListener('click', startDraw);
document.getElementById('btn-stop').addEventListener('click', stopDraw);
document.getElementById('btn-reset').addEventListener('click', resetGame);
document.getElementById('btn-unreserve-all').addEventListener('click', unreserveAll);
document.querySelectorAll('.mode').forEach(btn =>
  btn.addEventListener('click', () => chooseMode(btn.dataset.mode))
);
document.getElementById('btn-search').addEventListener('click', searchCard);
document.getElementById('btn-unlock').addEventListener('click', unlockPanel);

// Modal events
modalCloseBtn.addEventListener('click', () => (modal.classList.add('hidden')));
modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});
reserveForm.addEventListener('submit', handleReserveSubmit);

// Observer for infinite scroll
const io = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    loadMoreCards();
  }
});
io.observe(sentinel);

// Init
fetchInitialData();

async function fetchInitialData() {
  const resp = await fetch(CARDS_JSON);
  cardsData = await resp.json();

  // Load reservation status
  try {
    const statResp = await fetch(API_URL + '?action=list&offset=0&limit=1000');
    const { cartones } = await statResp.json();
    cartones.forEach(c => {
      if (c.estado === 'RESERVADO') reservedMap.set(c.id, true);
    });
  } catch (err) {
    console.error('No se pudo obtener estado inicial:', err);
  }

  loadMoreCards();
}

function loadMoreCards() {
  const slice = cardsData.slice(loadedCount, loadedCount + PAGE_SIZE);
  slice.forEach(renderCard);
  loadedCount += slice.length;
}

function renderCard(card) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.id = card.id;

  if (reservedMap.get(card.id)) cardEl.classList.add('reserved');

  const idEl = document.createElement('div');
  idEl.className = 'card-id';
  idEl.textContent = '#' + String(card.id).padStart(4, '0');
  cardEl.appendChild(idEl);

  const gridEl = document.createElement('div');
  gridEl.className = 'grid';

  const marks = Array.from({ length: 5 }, () => Array(5).fill(false));
  cardsMarks.set(card.id, marks);

  card.grid.forEach((rowArr, r) => {
    rowArr.forEach((val, c) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (val === 'FREE') {
        cell.classList.add('free', 'marked');
        marks[r][c] = true;
      } else {
        cell.dataset.num = val;
      }
      cell.dataset.cardId = card.id;
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.textContent = val;
      gridEl.appendChild(cell);
    });
  });

  cardEl.appendChild(gridEl);
  cardsContainer.appendChild(cardEl);

  if (!cardEl.classList.contains('reserved')) {
    cardEl.addEventListener('click', () => openReserveModal(card.id));
  }
}

function openReserveModal(cardId) {
  modalCardIdSpan.textContent = cardId;
  modal.dataset.cardId = cardId;
  reserveForm.reset();
  modal.classList.remove('hidden');
}

async function handleReserveSubmit(e) {
  e.preventDefault();
  const cardId = Number(modal.dataset.cardId);
  const formData = new FormData(reserveForm);
  const body = {
    action: 'reserve',
    id: cardId,
    nombre: formData.get('nombre'),
    apellido: formData.get('apellido'),
    telefono: formData.get('telefono')
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  if (json.ok) {
    reservedMap.set(cardId, true);
    const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
    if (cardEl) cardEl.classList.add('reserved');
    modal.classList.add('hidden');

    const message = `Hola, deseo reservar el cartón #${cardId} (BINGO JOKER)`;
    const phone = '584266404042';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  } else {
    alert(json.error || 'Ocurrió un error');
  }
}

function letterForNumber(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}

function startDraw() {
  if (drawTimer) return;
  if (!remainingNumbers.length) {
    alert('Ya no quedan números');
    return;
  }
  drawTimer = setInterval(drawNumber, DRAW_INTERVAL_MS);
  drawNumber();
}

function drawNumber() {
  if (!remainingNumbers.length) {
    stopDraw();
    return;
  }
  const idx = Math.floor(Math.random() * remainingNumbers.length);
  const num = remainingNumbers.splice(idx, 1)[0];
  const letter = letterForNumber(num);
  announce(letter + ' ' + num);
  markNumber(num);

  if (isAdmin) {
    fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'recordDraw', numero: num, secret: adminSecret })
    });
  }
}

function markNumber(num) {
  const cells = document.querySelectorAll(`.cell[data-num="${num}"]`);
  cells.forEach(cell => {
    cell.classList.add('marked');
    const cid = Number(cell.dataset.cardId);
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    const marks = cardsMarks.get(cid);
    if (marks) {
      marks[r][c] = true;
      if (!winners.has(cid) && checkWin(marks)) {
        winners.add(cid);
        alert('¡BINGO! Cartón #' + cid + ' (' + currentMode.toUpperCase() + ')');
      }
    }
  });
}

function checkWin(marks) {
  switch (currentMode) {
    case 'vertical':
      return marks[0].some((_, c) => marks.every(r => r[c]));
    case 'horizontal':
      return marks.some(row => row.every(cell => cell));
    case 'diagonal':
      return marks.every((row, i) => row[i]) || marks.every((row, i) => row[4 - i]);
    case 'full':
    default:
      return marks.every(row => row.every(cell => cell));
  }
}

function stopDraw() {
  clearInterval(drawTimer);
  drawTimer = null;
}

function resetGame() {
  if (!confirm('¿Reiniciar partida?')) return;
  stopDraw();
  remainingNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  winners.clear();
  cardsMarks.forEach((marks) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        marks[r][c] = (r === 2 && c === 2);
      }
    }
  });
  document.querySelectorAll('.cell.marked').forEach(el => {
    if (!el.classList.contains('free')) el.classList.remove('marked');
  });
}

function chooseMode(mode) {
  currentMode = mode;
  alert('Modo seleccionado: ' + mode.toUpperCase());
}

function searchCard() {
  const val = Number(document.getElementById('search-input').value);
  if (!val) return;
  const target = document.querySelector(`.card[data-id="${val}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 1000);
  } else {
    alert('Cartón no encontrado (puede estar más abajo)');
  }
}

async function unreserveAll() {
  if (!isAdmin) return;
  if (!confirm('Liberar todas las reservas?')) return;
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'resetAll', secret: adminSecret })
  });
  const json = await res.json();
  if (json.ok) {
    reservedMap.clear();
    document.querySelectorAll('.card.reserved').forEach(el => el.classList.remove('reserved'));
  } else {
    alert(json.error || 'Error');
  }
}

function unlockPanel() {
  const pwd = prompt(ADMIN_SECRET_PROMPT);
  if (pwd === 'Jrr035$$*') {
    isAdmin = true;
    adminSecret = pwd;
    controlPanel.classList.remove('locked');
    alert('Panel desbloqueado');
  } else {
    alert('Contraseña incorrecta');
  }
}

function announce(text) {
  const utter = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utter);
}
