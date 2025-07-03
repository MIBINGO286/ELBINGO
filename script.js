/* BINGO JOKER – lógicas de reserva y juego */
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/exec';
const API_LISTA  = 'https://opensheet.elk.sh/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/Reservas';
const BLOQUE = 50;

let cartones = [];
let vendidos = new Set();
let pintados = 0;

/* Sorteo */
let remainingBalls = Array.from({length:75},(_,i)=>i+1);
let drawInterval = null;

const contenedor = document.getElementById('cartones-container');
const loader     = document.getElementById('loader');
const modal      = document.getElementById('modal');
const formRes    = document.getElementById('form-reserva');
const spanNum    = document.getElementById('carton-numero');
const inputID    = document.getElementById('input-id');
const msgReserva = document.getElementById('msg-reserva');

const panel          = document.getElementById('panel');
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const btnUnlock      = document.getElementById('btn-unlock');
const passwordInput  = document.getElementById('password-input');
const panelContent   = document.getElementById('panel-content');

const btnStartDraw = document.getElementById('btn-start-draw');
const btnStopDraw  = document.getElementById('btn-stop-draw');
const currentBall  = document.getElementById('current-ball');
const historyList  = document.getElementById('history');
const btnRestart   = document.getElementById('btn-restart');

const searchInput   = document.getElementById('search-input');
const inputUnreserve = document.getElementById('input-unreserve');
const btnUnreserve   = document.getElementById('btn-unreserve');

/* ---------- INIT ---------- */
window.addEventListener('DOMContentLoaded', async () => {
  cartones = await fetch('cartones.json').then(r => r.json());
  await actualizarVendidos();
  ordenarCartones();
  pintarBloque();
  observarScroll();
});

/* ---------- HELPERS ---------- */
function ordenarCartones() {
  cartones.sort((a,b)=>a.id-b.id);
}

function letterFor(n){
  if(n<=15) return 'B';
  if(n<=30) return 'I';
  if(n<=45) return 'N';
  if(n<=60) return 'G';
  return 'O';
}

/* ---------- RESERVAS ---------- */
async function actualizarVendidos(){
  try {
    const data = await fetch(API_LISTA).then(r=>r.json());
    vendidos = new Set(data.filter(r=>r.Estado==='RESERVADO').map(r=>String(r.ID)));
  } catch(e) {
    console.warn('opensheet error', e);
  }
}

function crearCarton({id,grid}){
  const art = document.createElement('article');
  art.className = 'carton';
  art.dataset.id = id;
  art.innerHTML = `<h3>#${id.toString().padStart(4,'0')}</h3>
    <div class="grid">
      ${grid.flat().map(c=>`<div class="cell">${c==='FREE'?'★':c}</div>`).join('')}
    </div>`;
  if (vendidos.has(String(id))) {
    art.classList.add('vendido');
  } else {
    art.onclick = () => abrirModal(id);
  }
  return art;
}

function pintarBloque(){
  const frag = document.createDocumentFragment();
  for(let i=pintados; i<pintados+BLOQUE && i<cartones.length; i++){
    frag.appendChild(crearCarton(cartones[i]));
  }
  pintados += BLOQUE;
  contenedor.appendChild(frag);
  if(pintados >= cartones.length) loader.style.display = 'none';
}

function observarScroll(){
  const sentinel = document.createElement('div');
  contenedor.appendChild(sentinel);
  new IntersectionObserver(e => {
    if (e[0].isIntersecting) pintarBloque();
  }).observe(sentinel);
}

function abrirModal(id){
  inputID.value = id;
  spanNum.textContent = id;
  msgReserva.classList.add('hidden');
  modal.classList.remove('hidden');
}
function cerrarModal(){
  modal.classList.add('hidden');
  formRes.reset();
  document.getElementById('btn-reservar').disabled = false;
}
window.cerrarModal = cerrarModal;

formRes.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(formRes);

  /* Validaciones extra */
  if(vendidos.has(fd.get('ID'))) {
    alert('Ese cartón ya fue reservado.');
    return;
  }

  /* Deshabilitar botón */
  const btn = document.getElementById('btn-reservar');
  btn.disabled = true;

  /* Enviar */
  fetch(WEBAPP_URL, { method:'POST', body: fd })
    .then(()=> {
      vendidos.add(fd.get('ID'));
      const carta = contenedor.querySelector(`.carton[data-id="${fd.get('ID')}"]`);
      if(carta) carta.classList.add('vendido');

      msgReserva.classList.remove('hidden');
      setTimeout(cerrarModal, 1200);
    })
    .catch(err=>{
      console.error(err);
      alert('Error al reservar. Intenta nuevamente.');
      btn.disabled = false;
    });
});

/* ---------- PANEL DE CONTROL ---------- */
btnTogglePanel.addEventListener('click', ()=> panel.classList.toggle('hidden'));

/* Desbloqueo simple con contraseña 'joker2025' */
btnUnlock.addEventListener('click', ()=>{
  if(passwordInput.value === 'joker2025'){
    panelContent.classList.remove('hidden');
    passwordInput.value='';
  } else {
    alert('Contraseña incorrecta');
  }
});

/* Sorteo automático */
function drawBall(){
  if(remainingBalls.length===0){
    stopDraw();
    alert('¡Ya no quedan bolas!');
    return;
  }
  const idx = Math.floor(Math.random()*remainingBalls.length);
  const num = remainingBalls.splice(idx,1)[0];
  const letra = letterFor(num);
  currentBall.textContent = `${letra} - ${num}`;
  const li = document.createElement('li');
  li.textContent = `${letra}${num}`;
  historyList.prepend(li);
}

function startDraw(){
  if(drawInterval) return;
  drawBall(); /* primera inmediata */
  drawInterval = setInterval(drawBall, 4000);
  btnStartDraw.disabled = true;
  btnStopDraw.disabled  = false;
}
function stopDraw(){
  clearInterval(drawInterval);
  drawInterval = null;
  btnStartDraw.disabled = false;
  btnStopDraw.disabled  = true;
}
btnStartDraw.addEventListener('click', startDraw);
btnStopDraw .addEventListener('click', stopDraw);

/* Reiniciar partida */
btnRestart.addEventListener('click', ()=>{
  if(confirm('¿Reiniciar partida?')){
    stopDraw();
    remainingBalls = Array.from({length:75},(_,i)=>i+1);
    historyList.innerHTML='';
    currentBall.textContent='';
  }
});

/* Unreservar */
btnUnreserve.addEventListener('click', ()=>{
  const id = inputUnreserve.value.trim();
  if(!id) return;
  if(!vendidos.has(id)){
    alert('Ese cartón no está reservado.');
    return;
  }
  const fd = new FormData();
  fd.append('ID', id);
  fd.append('Estado', 'LIBRE');
  fetch(WEBAPP_URL, { method:'POST', body: fd })
    .then(()=>{
      vendidos.delete(id);
      const carta = contenedor.querySelector(`.carton[data-id="${id}"]`);
      if(carta) carta.classList.remove('vendido');
      alert('Cartón liberado');
    })
    .catch(err=>{
      console.error(err);
      alert('Error al liberar.');
    });
});

/* Buscador de cartones */
searchInput.addEventListener('input', ()=>{
  const q = searchInput.value.trim();
  contenedor.querySelectorAll('.carton').forEach(card=>{
    card.style.display = card.dataset.id.startsWith(q) ? 'block' : 'none';
  });
});
