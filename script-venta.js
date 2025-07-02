
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/exec';
const API_LISTA = 'AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow';
const BLOQUE = 50;

let cartones = [];
let vendidos = new Set();
let pintados = 0;

const contenedor = document.getElementById('cartones-container');
const loader     = document.getElementById('loader');
const modal      = document.getElementById('modal');
const formRes    = document.getElementById('form-reserva');
const spanNum    = document.getElementById('carton-numero');
const inputID    = document.getElementById('input-id');

window.addEventListener('DOMContentLoaded', async () => {
  cartones = await fetch('cartones.json').then(r => r.json());
  await actualizarVendidos();
  pintarBloque();
  observarScroll();
});

async function actualizarVendidos(){
  try {
    const data = await fetch(API_LISTA).then(r=>r.json());
    vendidos = new Set(data.filter(r=>r.Estado==='RESERVADO').map(r=>r.ID));
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
  const sentinel = document.createElement('div'); contenedor.appendChild(sentinel);
  new IntersectionObserver(e => {
    if (e[0].isIntersecting) pintarBloque();
  }).observe(sentinel);
}

function abrirModal(id){
  inputID.value = id;
  spanNum.textContent = id;
  modal.classList.remove('hidden');
}
function cerrarModal(){
  modal.classList.add('hidden');
  formRes.reset();
}
window.cerrarModal = cerrarModal;

formRes.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(formRes);
  const ifr = document.createElement('iframe');
  ifr.name = 'hidden_iframe'; ifr.style.display = 'none';
  document.body.appendChild(ifr);

  const f = document.createElement('form');
  f.action = WEBAPP_URL;
  f.method = 'POST';
  f.target = 'hidden_iframe';
  fd.forEach((v,k)=>{
    const i = document.createElement('input');
    i.name = k;
    i.value = v;
    f.appendChild(i);
  });
  document.body.appendChild(f); f.submit();

  vendidos.add(fd.get('ID'));
  const carta = contenedor.querySelector(`.carton[data-id="${fd.get('ID')}"]`);
  if(carta) carta.classList.add('vendido');
  cerrarModal();
});
