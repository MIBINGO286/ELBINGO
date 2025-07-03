// script.js – Versión funcional sin errores CORS

const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzapkct2eJCEvb-5XwDjpHNfe7LCNgrCJQMJzOQDQxmSBvOJBgtYxmuGadJ1oSfmshe7A/exec';
const API_LISTA = 'https://opensheet.elk.sh/1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4/RESERVAS';
const BLOQUE = 50;

let cartones = [];
let vendidos = new Set();
let pintados = 0;

const contenedor = document.getElementById('cartones-container');
const loader = document.getElementById('loader');
const modal = document.getElementById('modal');
const formRes = document.getElementById('form-reserva');
const spanNum = document.getElementById('carton-numero');
const inputID = document.getElementById('input-id');

window.addEventListener('DOMContentLoaded', async () => {
  cartones = await fetch('cartones.json').then(r => r.json());
  await actualizarVendidos();
  pintarBloque();
  observarScroll();
});

async function actualizarVendidos() {
  try {
    const res = await fetch(API_LISTA);
    const data = await res.json();
    vendidos = new Set(data.filter(r => (r.ESTADO || r.Estado) === 'RESERVADO').map(r => String(r.ID)));
  } catch (e) {
    console.warn('Error al obtener reservas', e);
  }
}

function crearCarton({ id, grid }) {
  const art = document.createElement('article');
  art.className = 'carton';
  art.dataset.id = id;
  art.innerHTML = `<h3>#${id.toString().padStart(4, '0')}</h3>
    <div class="grid">
      ${grid.flat().map(c => `<div class="cell" data-num="${c}">${c === 'FREE' ? '★' : c}</div>`).join('')}
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
  if (vendidos.has(fd.get('ID'))) {
    alert('Ese cartón ya está reservado.');
    return;
  }

  // Envío mediante iframe oculto para evitar CORS
  const iframe = document.createElement('iframe');
  iframe.name = 'hidden_iframe';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const form = document.createElement('form');
  form.action = WEBAPP_URL;
  form.method = 'POST';
  form.target = 'hidden_iframe';

  fd.forEach((v, k) => {
    const input = document.createElement('input');
    input.name = k;
    input.value = v;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();

  // Actualiza la vista y redirige a WhatsApp
  const id = fd.get('ID');
  vendidos.add(id);
  const carta = contenedor.querySelector(`.carton[data-id="${id}"]`);
  if (carta) carta.classList.add('vendido');
  const url = `https://wa.me/584266404042?text=Hola,%20acabo%20de%20reservar%20el%20cartón%20${id}`;
  window.open(url, '_blank');
  cerrarModal();
});
