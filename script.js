/* ------------------------------------------------------------------
   BINGO JOKER – Lógica de reserva, venta y sorteo (versión JSONP)
------------------------------------------------------------------- */

/* URL del Web App (mismo para POST y JSONP GET) */
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzapkct2eJCEvb-5XwDjpHNfe7LCNgrCJQMJzOQDQxmSBvOJBgtYxmuGadJ1oSfmshe7A/exec';

/* Bloque de cartones que se pintará por “scroll infinito” */
const BLOQUE = 50;

/* Variables globales de estado */
let cartones      = [];
let vendidos      = new Set();
let pintados      = 0;

/* Sorteo de bolas */
let remainingBalls = Array.from({ length: 75 }, (_, i) => i + 1);
let drawInterval   = null;

/* ---- Referencias a elementos del DOM ---- */
const contenedor     = document.getElementById('cartones-container');
const loader         = document.getElementById('loader');
const modal          = document.getElementById('modal');
const formRes        = document.getElementById('form-reserva');
const spanNum        = document.getElementById('carton-numero');
const inputID        = document.getElementById('input-id');
const msgReserva     = document.getElementById('msg-reserva');
const btnReservar    = document.getElementById('btn-reservar');

/* Panel de control */
const panel            = document.getElementById('panel');
const btnTogglePanel   = document.getElementById('btn-toggle-panel');
const btnUnlock        = document.getElementById('btn-unlock');
const passwordInput    = document.getElementById('password-input');
const panelContent     = document.getElementById('panel-content');
const btnStartDraw     = document.getElementById('btn-start-draw');
const btnStopDraw      = document.getElementById('btn-stop-draw');
const currentBall      = document.getElementById('current-ball');
const historyList      = document.getElementById('history');
const btnRestart       = document.getElementById('btn-restart');
const inputUnreserve   = document.getElementById('input-unreserve');
const btnUnreserve     = document.getElementById('btn-unreserve');

/* Buscador */
const searchInput = document.getElementById('search-input');

/* ---------------------------------------------------------------
   1. Inicialización (DOMContentLoaded)
---------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  /* 1‑A  Cargar cartones locales */
  cartones = await fetch('cartones.json').then(r => r.json());

  /* 1‑B  Descarga de cartones reservados (JSONP sin CORS) */
  loadJSONP(WEBAPP_URL, 'jsonpVendidos', data => {
    vendidos = new Set(
      data.filter(r => r.Estado === 'RESERVADO').map(r => String(r.ID))
    );
    ordenarCartones();
    pintarBloque();
    observarScroll();
  });
});

/* ---------------------------------------------------------------
   2. Función utilitaria JSONP
---------------------------------------------------------------- */
function loadJSONP(url, cbName, callback) {
  const script = document.createElement('script');
  window[cbName] = data => {
    callback(data);
    document.body.removeChild(script);
    delete window[cbName];
  };
  script.src = `${url}?callback=${cbName}`;
  document.body.appendChild(script);
}

/* ---------------------------------------------------------------
   3. Helpers generales
---------------------------------------------------------------- */
function ordenarCartones() {
  cartones.sort((a, b) => a.id - b.id);
}
function letterFor(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}

/* ---------------------------------------------------------------
   4. Pintar cartones y scroll infinito
---------------------------------------------------------------- */
function crearCarton({ id, grid }) {
  const art = document.createElement('article');
  art.className = 'carton';
  art.dataset.id = id;
  art.innerHTML = `<h3>#${id.toString().padStart(4, '0')}</h3>
    <div class="grid">
      ${grid.flat().map(c => `<div class="cell">${c === 'FREE' ? '★' : c}</div>`).join('')}
    </div>`;
  if (vendidos.has(String(id))) {
    art.classList.add('vendido');
  } else {
    art.onclick = () => abrirModal(id);
  }
  return art;
}
function pintarBloque() {
  const frag = document.createDocumentFragment();
  for (let i = pintados; i < pintados + BLOQUE && i < cartones.length; i++) {
    frag.appendChild(crearCarton(cartones[i]));
  }
  pintados += BLOQUE;
  contenedor.appendChild(frag);
  if (pintados >= cartones.length) loader.style.display = 'none';
}
function observarScroll() {
  const sentinel = document.createElement('div');
  contenedor.appendChild(sentinel);
  new IntersectionObserver(e => {
    if (e[0].isIntersecting) pintarBloque();
  }).observe(sentinel);
}

/* ---------------------------------------------------------------
   5. Modal de reserva
---------------------------------------------------------------- */
function abrirModal(id) {
  inputID.value = id;
  spanNum.textContent = id;
  msgReserva.classList.add('hidden');
  modal.classList.remove('hidden');
}
function cerrarModal() {
  modal.classList.add('hidden');
  formRes.reset();
  btnReservar.disabled = false;
}
window.cerrarModal = cerrarModal;

/* Enviar reserva (POST con CORS permitido en WebApp) */
formRes.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(formRes);

  if (vendidos.has(fd.get('ID'))) {
    alert('Ese cartón ya fue reservado.');
    return;
  }

  btnReservar.disabled = true;

  fetch(WEBAPP_URL, { method: 'POST', body: fd })
    .then(() => {
      vendidos.add(fd.get('ID'));
      const carta = contenedor.querySelector(`.carton[data-id="${fd.get('ID')}"]`);
      if (carta) carta.classList.add('vendido');
      msgReserva.classList.remove('hidden');
      setTimeout(cerrarModal, 1200);
    })
    .catch(err => {
      console.error(err);
      alert('Error al reservar. Intenta nuevamente.');
      btnReservar.disabled = false;
    });
});

/* ---------------------------------------------------------------
   6. Panel de control y sorteo
---------------------------------------------------------------- */
btnTogglePanel.addEventListener('click', () => panel.classList.toggle('hidden'));

btnUnlock.addEventListener('click', () => {
  if (passwordInput.value === 'joker2025') {
    panelContent.classList.remove('hidden');
    passwordInput.value = '';
  } else {
    alert('Contraseña incorrecta');
  }
});

function drawBall() {
  if (remainingBalls.length === 0) {
    stopDraw();
    alert('¡Ya no quedan bolas!');
    return;
  }
  const idx = Math.floor(Math.random() * remainingBalls.length);
  const num = remainingBalls.splice(idx, 1)[0];
  const letra = letterFor(num);
  currentBall.textContent = `${letra} - ${num}`;
  const li = document.createElement('li');
  li.textContent = `${letra}${num}`;
  historyList.prepend(li);
}
function startDraw() {
  if (drawInterval) return;
  drawBall();
  drawInterval = setInterval(drawBall, 4000);
  btnStartDraw.disabled = true;
  btnStopDraw.disabled = false;
}
function stopDraw() {
  clearInterval(drawInterval);
  drawInterval = null;
  btnStartDraw.disabled = false;
  btnStopDraw.disabled = true;
}
btnStartDraw.addEventListener('click', startDraw);
btnStopDraw.addEventListener('click', stopDraw);

/* Reiniciar partida */
btnRestart.addEventListener('click', () => {
  if (confirm('¿Reiniciar partida?')) {
    stopDraw();
    remainingBalls = Array.from({ length: 75 }, (_, i) => i + 1);
    historyList.innerHTML = '';
    currentBall.textContent = '';
  }
});

/* Liberar cartón */
btnUnreserve.addEventListener('click', () => {
  const id = inputUnreserve.value.trim();
  if (!id) return;
  if (!vendidos.has(id)) {
    alert('Ese cartón no está reservado.');
    return;
  }
  const fd = new FormData();
  fd.append('ID', id);
  fd.append('Estado', 'LIBRE');
  fetch(WEBAPP_URL, { method: 'POST', body: fd })
    .then(() => {
      vendidos.delete(id);
      const carta = contenedor.querySelector(`.carton[data-id="${id}"]`);
      if (carta) carta.classList.remove('vendido');
      alert('Cartón liberado');
    })
    .catch(err => {
      console.error(err);
      alert('Error al liberar.');
    });
});

/* ---------------------------------------------------------------
   7. Buscador de cartones
---------------------------------------------------------------- */
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  contenedor.querySelectorAll('.carton').forEach(card => {
    card.style.display = card.dataset.id.startsWith(q) ? 'block' : 'none';
  });
});
