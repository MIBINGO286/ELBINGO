// BINGO JOKER - script.js
const CARTONES_URL = 'cartones.json';
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwfDVDNqvy-JHMU6Xi2EblwwCuDAU_uazEz0tuebXWxqdoPLVLyAjpktlUQuKNLX6Rk/exec';
const ADMIN_PASS = 'Jrr035$$*';

let cartones = [];
let displayed = 0;
const BATCH = 50;
let intervalId = null;
let numerosRestantes = [...Array(75).keys()].map(n => n+1);
let vozMasculina = null;

// ------------------------- utilidades ------------------------- //
function crearElemento(tag, attrs={}, ...children){
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  children.forEach(c=>{
    if(typeof c==='string') el.appendChild(document.createTextNode(c));
    else if(c) el.appendChild(c);
  });
  return el;
}

function hablar(texto){
  if(!vozMasculina){
    let voces = speechSynthesis.getVoices();
    vozMasculina = voces.find(v=>v.lang.startsWith('es') && v.name.toLowerCase().includes('male')) || voces.find(v=>v.lang.startsWith('es'));
  }
  const utter = new SpeechSynthesisUtterance(texto);
  if(vozMasculina) utter.voice = vozMasculina;
  speechSynthesis.speak(utter);
}

function letraParaNumero(n){
  if(n<=15) return 'B';
  if(n<=30) return 'I';
  if(n<=45) return 'N';
  if(n<=60) return 'G';
  return 'O';
}

// ------------------------- cartones ------------------------- //
async function cargarCartones(){
  const res = await fetch(CARTONES_URL);
  cartones = await res.json();
  mostrarMasCartones();
}

function mostrarMasCartones(){
  const cont = document.getElementById('cartones');
  const slice = cartones.slice(displayed, displayed + BATCH);
  slice.forEach(c=> cont.appendChild(crearCardCarton(c)));
  displayed += slice.length;
}

function crearCardCarton(c){
  const card = crearElemento('div', {class:'carton', 'data-id': c.id});
  const header = crearElemento('div', {class:'carton-id'}, '#'+c.id);
  const tabla = crearElemento('table');
  c.carton.forEach(row=>{
    const tr = crearElemento('tr');
    row.forEach(cell=>{
      tr.appendChild(crearElemento('td', {}, cell));
    });
    tabla.appendChild(tr);
  });
  card.append(header, tabla);
  card.addEventListener('click', ()=>abrirModalCompra(c.id, card));
  return card;
}

function abrirModalCompra(id, card){
  if(card.classList.contains('reservado')) return;
  document.getElementById('cartonSeleccionado').textContent = '#' + id;
  document.getElementById('modalCompra').classList.remove('hidden');
  document.getElementById('btnReservar').onclick = ()=>reservarCarton(id, card);
}

async function reservarCarton(id, card){
  const nombre = document.getElementById('nombre').value.trim();
  const apellido = document.getElementById('apellido').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  if(!nombre || !apellido || !telefono){alert('Complete todos los campos');return;}
  const payload = {action:'reservar', carton:id, nombre, apellido, telefono};
  const res = await fetch(WEBAPP_URL, {
    method:'POST',
    body:JSON.stringify(payload),
    headers:{'Content-Type':'application/json'}
  });
  const txt = await res.text();
  if(txt.includes('Reservado')){
    card.classList.add('reservado');
    cerrarModal();
    const msg = `Hola, deseo reservar el cartón #${id} para BINGO JOKER.\nNombre: ${nombre} ${apellido}\nTel: ${telefono}`;
    window.open('https://wa.me/584266404042?text='+encodeURIComponent(msg), '_blank');
  }else alert('Error: '+txt);
}

function cerrarModal(){
  document.getElementById('modalCompra').classList.add('hidden');
  ['nombre','apellido','telefono'].forEach(id=>document.getElementById(id).value='');
}
document.getElementById('closeModal').onclick = cerrarModal;
window.onclick = e=>{if(e.target.id==='modalCompra') cerrarModal();};

// ------------------------- sorteo ------------------------- //
function iniciarSorteo(){
  if(intervalId) return;
  if(numerosRestantes.length===0) resetearSorteo();
  sortearNumero(); // primer número inmediato
  intervalId = setInterval(sortearNumero, 3000);
}

function sortearNumero(){
  if(numerosRestantes.length===0){detenerSorteo();return;}
  const idx = Math.floor(Math.random()*numerosRestantes.length);
  const numero = numerosRestantes.splice(idx,1)[0];
  document.getElementById('letraNumero').textContent = letraParaNumero(numero);
  document.getElementById('valorNumero').textContent = numero;
  hablar(`${letraParaNumero(numero)} ${numero}`);
}

function detenerSorteo(){
  clearInterval(intervalId);
  intervalId = null;
}

function resetearSorteo(){
  numerosRestantes = [...Array(75).keys()].map(n=>n+1);
  document.getElementById('letraNumero').textContent = '';
  document.getElementById('valorNumero').textContent = '';
}

// ------------------------- admin y demás ------------------------- //
function desbloquearPanel(){
  const pass = document.getElementById('claveAdmin').value;
  if(pass===ADMIN_PASS){
    document.getElementById('panel-admin').classList.remove('hidden');
    document.getElementById('loginPanel').classList.add('hidden');
  }else alert('Contraseña incorrecta');
}

async function liberarTodos(){
  if(!confirm('¿Seguro que desea liberar todos los cartones?')) return;
  const res = await fetch(WEBAPP_URL, {
    method:'POST',
    body:JSON.stringify({action:'liberar_todos'}),
    headers:{'Content-Type':'application/json'}
  });
  const txt = await res.text();
  if(txt.includes('Todos liberados')){
    document.querySelectorAll('.carton.reservado').forEach(c=>c.classList.remove('reservado'));
  }else alert('Error: '+txt);
}

// ------------------------- buscador y scroll ------------------------- //
function buscarCarton(){
  const val = document.getElementById('buscarCarton').value.padStart(3,'0');
  const card = document.querySelector(`.carton[data-id="${val}"]`);
  if(card) card.scrollIntoView({behavior:'smooth', block:'center'});
}

function detectarScroll(){
  if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 300){
    mostrarMasCartones();
  }
}

// ------------------------- listeners ------------------------- //
document.getElementById('desbloquearPanel').onclick = desbloquearPanel;
document.getElementById('iniciarSorteo').onclick = iniciarSorteo;
document.getElementById('detenerSorteo').onclick = detenerSorteo;
document.getElementById('reiniciarPartida').onclick = ()=>{detenerSorteo();resetearSorteo();};
document.getElementById('liberarTodos').onclick = liberarTodos;
document.getElementById('buscarCarton').addEventListener('change', buscarCarton);
window.addEventListener('scroll', detectarScroll);

// precargar voces
speechSynthesis.onvoiceschanged = ()=>{};

// inicio
cargarCartones();
