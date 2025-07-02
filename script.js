/* --- CONFIG --- */
const SHEET_ID   = '1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4';
const SHEET_NAME = 'Hoja 1';
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbztMoHO_6AtF3RxLggY5sNcJFUOfVnD9ql8mZWIpMGE_I-UVAHc30Nm79M__h-IZdaxYg/exec';

const API_LISTA  = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;
const BLOQUE     = 50;

/* --- ESTADO --- */
let cartones = [];
let vendidos = new Set();
let pintados = 0;

/* --- DOM --- */
const contenedor = document.getElementById('cartones-container');
const loader     = document.getElementById('loader');
const modal      = document.getElementById('modal');
const formRes    = document.getElementById('form-reserva');
const spanNum    = document.getElementById('carton-numero');
const inputID    = document.getElementById('input-id');

/* --- INICIO --- */
window.addEventListener('DOMContentLoaded', async () => {
  cartones  = await fetch('cartones.json').then(r => r.json());
  await actualizarVendidos();
  pintarBloque();
  observarScroll();
});

/* --- Leer vendidos --- */
async function actualizarVendidos(){
  try{
    const data = await fetch(API_LISTA).then(r=>r.json());
    vendidos = new Set(data.filter(r=>r.Estado==='RESERVADO').map(r=>r.ID));
  }catch(e){console.warn('opensheet error',e);}
}

/* --- Crear cartón --- */
function crearCarton({id,grid}){
  const art=document.createElement('article');
  art.className='carton';
  art.dataset.id=id;
  art.innerHTML=`
    <h3>#${id.toString().padStart(4,'0')}</h3>
    <div class="grid">
      ${grid.flat().map(c=>`<div class="cell">${c==='FREE'?'★':c}</div>`).join('')}
    </div>`;
  if(vendidos.has(String(id))){art.classList.add('vendido');}
  else{art.onclick=()=>abrirModal(id);}
  return art;
}

/* --- Pintar bloques --- */
function pintarBloque(){
  const frag=document.createDocumentFragment();
  for(let i=pintados;i<pintados+BLOQUE&&i<cartones.length;i++){
    frag.appendChild(crearCarton(cartones[i]));
  }
  pintados+=BLOQUE; contenedor.appendChild(frag);
  if(pintados>=cartones.length) loader.style.display='none';
}

/* --- Lazy Load --- */
function observarScroll(){
  const sentinel=document.createElement('div'); contenedor.appendChild(sentinel);
  new IntersectionObserver(e=>{if(e[0].isIntersecting) pintarBloque();})
    .observe(sentinel);
}

/* --- Modal --- */
function abrirModal(id){
  inputID.value=id; spanNum.textContent=id;
  modal.classList.remove('hidden');
}
function cerrarModal(){
  modal.classList.add('hidden'); formRes.reset();
}
window.cerrarModal=cerrarModal;

/* --- Reservar --- */
formRes.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(formRes);
  /** enviar con formulario oculto (sin CORS) **/
  const ifr=document.createElement('iframe');
  ifr.name='hidden_iframe'; ifr.style.display='none';
  document.body.appendChild(ifr);

  const f=document.createElement('form');
  f.action=WEBAPP_URL; f.method='POST'; f.target='hidden_iframe';
  fd.forEach((v,k)=>{const i=document.createElement('input');i.name=k;i.value=v;f.appendChild(i);});
  document.body.appendChild(f); f.submit();

  vendidos.add(fd.get('ID'));
  const carta=contenedor.querySelector(`.carton[data-id="${fd.get('ID')}"]`);
  if(carta) carta.classList.add('vendido');
  cerrarModal();
});

/* --- Cargar más al hacer scroll --- */
window.addEventListener('scroll',()=>{
  if(window.innerHeight+window.scrollY>=document.body.offsetHeight-100){pintarBloque();}
});
