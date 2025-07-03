/***********************  CONFIG ***********************/
const WEBAPP_URL  = 'https://script.google.com/macros/s/AKfycbxHSaYZatIzKTfYmk421iKeM90RytSf7vkd7ewAm7nKB4BvGtO5KU-1iL8mx39aONI9ZA/exec'; // URL de la WebApp para enviar datos
const SHEET_JSONP = 'https://opensheet.elk.sh/1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4/CARTONES'; // URL de la hoja CARTONES
const WHATS_APP   = '584266404042'; // Número de WhatsApp
const PANEL_PASS  = 'joker123'; // Contraseña para desbloquear el panel de control
const BLOQUE = 50; // Cantidad de cartones que se deben cargar por vez

/*******************  VARIABLES GLOBALES *******************/
let cartones   = [];
let vendidos   = new Set();
let pintados   = 0;
let drawn      = new Set();
let remainingBalls = Array.from({length:75},(_,i)=>i+1);
let drawInterval   = null;

/*******************  REFERENCIAS DOM *******************/
const contenedor   = document.getElementById('cartones-container');
const loader       = document.getElementById('loader');
const modal        = document.getElementById('modal');
const formRes      = document.getElementById('form-reserva');
const spanNum      = document.getElementById('carton-numero');
const inputID      = document.getElementById('input-id');

// Panel
const panel          = document.getElementById('panel');
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const btnUnlock      = document.getElementById('btn-unlock');
const passwordInput  = document.getElementById('password-input');
const panelContent   = document.getElementById('panel-content');
const btnStartDraw   = document.getElementById('btn-start-draw');
const btnStopDraw    = document.getElementById('btn-stop-draw');
const currentBall    = document.getElementById('current-ball');
const historyList    = document.getElementById('history');
const btnRestart     = document.getElementById('btn-restart');
const modeRadios     = document.querySelectorAll('input[name="mode"]');
const inputUnreserve = document.getElementById('input-unreserve');
const btnUnreserve   = document.getElementById('btn-unreserve');
const searchInput    = document.getElementById('search-input');

/*******************  INIT *******************/
window.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch(SHEET_JSONP);
  const data = await response.json();
  cartones = data.map(carton => {
    return {
      id: carton.ID,
      grid: JSON.parse(carton.Grid),  // Asegúrate de que el grid esté almacenado como JSON
      estado: carton.Estado || 'LIBRE'
    };
  });

  cartones.sort((a, b) => a.id - b.id);
  pintarBloque();
  observarScroll();

  jsonp(SHEET_JSONP, 'jsonpVendidos', data => {
    vendidos = new Set(data.filter(r => String(r.Estado || r.ESTADO).toUpperCase() === 'RESERVADO').map(r => String(r.ID)));
    refrescarVendidos();
  });
});

/*******************  JSONP helper *******************/
function jsonp(url, cb, cbfn) {
  const s = document.createElement('script');
  window[cb] = d => { cbfn(d); delete window[cb]; s.remove(); };
  s.src = `${url}?callback=${cb}&_=${Date.now()}`;
  document.body.appendChild(s);
}

/*******************  FUNCIONES PARA CARTONES *******************/
function crearCarton({ id, grid, estado }) {
  const a = document.createElement('article');
  a.className = 'carton';
  a.dataset.id = id;
  const gridHtml = grid.flat().map(n => {
    const marked = (n !== 'FREE' && drawn.has(n)) ? 'marked' : '';
    return `<div class="cell ${marked}" data-num="${n}">${n === 'FREE' ? '★' : n}</div>`;
  }).join('');
  a.innerHTML = `<h3>#${id.toString().padStart(4, '0')}</h3><div class="grid">${gridHtml}</div>`;

  if (estado === 'RESERVADO') {
    a.classList.add('vendido');
  } else {
    a.onclick = () => abrirModal(id);
  }

  return a;
}

function pintarBloque() {
  const frag = document.createDocumentFragment();
  for (let i = pintados; i < pintados + BLOQUE && i < cartones.length; i++) frag.appendChild(crearCarton(cartones[i]));
  pintados += BLOQUE;
  contenedor.appendChild(frag);
  if (pintados >= cartones.length) loader.style.display = 'none';
}

function observarScroll() {
  const sent = document.createElement('div');
  contenedor.appendChild(sent);
  new IntersectionObserver(e => { if (e[0].isIntersecting) pintarBloque(); }).observe(sent);
}

function refrescarVendidos() {
  contenedor.querySelectorAll('.carton').forEach(c => {
    if (vendidos.has(c.dataset.id)) c.classList.add('vendido');
    else c.classList.remove('vendido');
  });
}

/*******************  RESERVAR CARTÓN *******************/
function abrirModal(id) {
  inputID.value = id;
  spanNum.textContent = id;
  modal.classList.remove('hidden');
}

function cerrarModal() {
  modal.classList.add('hidden');
  formRes.reset();
}

window.cerrarModal = cerrarModal;

formRes.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(formRes);
  if (vendidos.has(fd.get('ID'))) { alert('Ya reservado'); return; }

  const data = {
    ID: fd.get('ID'),
    Estado: 'RESERVADO',
    Nombre: fd.get('Nombre'),
    Apellido: fd.get('Apellido'),
    Telefono: fd.get('Telefono')
  };

  // Enviar los datos a la WebApp de Google Script
  const ifr = document.createElement('iframe');
  ifr.name = 'hidden_iframe';
  ifr.style.display = 'none';
  document.body.appendChild(ifr);
  const f = document.createElement('form');
  f.action = WEBAPP_URL;
  f.method = 'POST';
  f.target = 'hidden_iframe';

  Object.keys(data).forEach(key => {
    const i = document.createElement('input');
    i.name = key;
    i.value = data[key];
    f.appendChild(i);
  });

  document.body.appendChild(f);
  f.submit();

  // Marcar como reservado en la interfaz
  const id = fd.get('ID');
  vendidos.add(id);
  refrescarVendidos();

  // Abrir WhatsApp
  window.open(`https://wa.me/${WHATS_APP}?text=Hola,%20acabo%20de%20reservar%20el%20cartón%20${id}.`, '_blank');
  cerrarModal();
});
