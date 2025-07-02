/* --- CONFIG --- */
const SHEET_ID   = '1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4';
const SHEET_NAME = 'Hoja 1';
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbztMoHO_6AtF3RxLggY5sNcJFUOfVnD9ql8mZWIpMGE_I-UVAHc30Nm79M__h-IZdaxYg/exec';

const API_LISTA  = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;
const BLOQUE     = 50;              // cartones por carga

/* --- ESTADO --- */
let cartones = [];                  // cartones.json completo
let vendidos = new Set();           // IDs reservados
let pintados = 0;                   // cuántos ya se mostraron

/* --- ELEMENTOS --- */
const contenedor = document.getElementById('cartones-container');
const loader     = document.getElementById('loader');
const modal      = document.getElementById('modal');
const fReserva   = document.getElementById('form-reserva');
const spanNum    = document.getElementById('carton-numero');
const inputID    = document.getElementById('input-id');

/* --- INICIO --- */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    cartones  = await fetch('cartones.json').then(r => r.json());
  } catch (e) {
    loader.textContent = '❌ No se encontró cartones.json';
    return;
  }
  await actualizarVendidos();
  pintarBloque();
  observarScroll();
});

/* --- Obtener lista de vendidos --- */
async function actualizarVendidos() {
  try {
    const data = await fetch(API_LISTA).then(r => r.json());
    vendidos = new Set(data.filter(r => r.Estado === 'RESERVADO').map(r => r.ID));
  } catch (e) {
    console.warn('No se pudo leer la hoja: ', e);
  }
}

/* --- Pintar cartones --- */
function crearCarton({ id, grid }) {
  const art = document.createElement('article');
  art.className = 'carton';
  art.dataset.id = id;

  art.innerHTML = `
    <h3>#${id.toString().padStart(4, '0')}</h3>
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

/* --- Lazy Load --- */
function observarScroll() {
  const sentinel = document.createElement('div');
  contenedor.appendChild(sentinel);
  new IntersectionObserver(e => {
    if (e[0].isIntersecting) pintarBloque();
  }).observe(sentinel);
}

/* --- Modal --- */
function abrirModal(id) {
  inputID.value = id;
  spanNum.textContent = id;
  modal.classList.remove('hidden');
}
function cerrarModal() {
  modal.classList.add('hidden');
  fReserva.reset();
}
window.cerrarModal = cerrarModal;

/* --- Reservar --- */
fReserva.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(fReserva);

  /** Enviamos con un formulario oculto para evitar CORS **/
  const iframe = document.createElement('iframe');
  iframe.name  = 'hidden_iframe';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const form = document.createElement('form');
  form.action = WEBAPP_URL;
  form.method = 'POST';
  form.target = 'hidden_iframe';
  for (const [k, v] of formData.entries()) {
    const inp = document.createElement('input');
    inp.name = k; inp.value = v; form.appendChild(inp);
  }
  document.body.appendChild(form);
  form.submit();

  /** Front‑end: marcar como vendido inmediatamente **/
  vendidos.add(formData.get('ID'));
  const cartaDOM = contenedor.querySelector(`.carton[data-id="${formData.get('ID')}"]`);
  if (cartaDOM) cartaDOM.classList.add('vendido');
  cerrarModal();
});
