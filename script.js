// Bingo Joker JS completo
const CARTONES_URL='cartones.json';
const WEBAPP_URL='https://script.google.com/macros/s/AKfycbwfDVDNqvy-JHMU6Xi2EblwwCuDAU_uazEz0tuebXWxqdoPLVLyAjpktlUQuKNLX6Rk/exec';
const ADMIN_PASS='Jrr035$$*';

let cartones=[], mostrados=0;
const BATCH=50;
let numeros=[...Array(75).keys()].map(n=>n+1);
let intervalo=null;
let currentMode='vertical';

const $=id=>document.getElementById(id);

/* CARTONES */
async function cargarCartones(){
  try{
    const data=await (await fetch(CARTONES_URL)).json();
    cartones=data;
    mostrarMas();
  }catch(e){
    console.error(e);
    $('cartones').textContent='Error cargando cartones.';
  }
}
function mostrarMas(){
  const cont=$('cartones');
  const slice=cartones.slice(mostrados, mostrados+BATCH);
  slice.forEach(c=>cont.appendChild(crearCard(c)));
  mostrados+=slice.length;
}
function crearCard(c){
  const card=document.createElement('div');
  card.className='carton';
  card.dataset.id=c.id;
  const header=document.createElement('div');
  header.className='carton-id';
  header.innerHTML='<div class="bingo-label">B  I  N  G  O</div><div class="carton-num">#'+c.id+'</div>';
  const table=document.createElement('table');
  c.carton.forEach(r=>{
    const tr=document.createElement('tr');
    r.forEach(cell=>{
      const td=document.createElement('td');
      td.textContent=cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  card.append(header,table);
  card.addEventListener('click',()=>abrirModal(c.id,card));
  return card;
}

/* MODAL RESERVA */
function abrirModal(id,card){
  if(card.classList.contains('reservado')) return;
  $('cartonSeleccionado').textContent='#'+id;
  $('modalCompra').classList.remove('hidden');
  $('btnReservar').onclick=()=>reservar(id,card);
}
function cerrarModal(){
  $('modalCompra').classList.add('hidden');
  ['nombre','apellido','telefono'].forEach(f=>$(f).value='');
}
$('closeModal').onclick=cerrarModal;
window.onclick=e=>{if(e.target.id==='modalCompra') cerrarModal();};

async function reservar(id,card){
  const nombre=$('nombre').value.trim();
  const apellido=$('apellido').value.trim();
  const telefono=$('telefono').value.trim();
  if(!nombre||!apellido||!telefono){alert('Completa todos los campos');return;}
  try{
    const r=await fetch(WEBAPP_URL,{method:'POST',body:JSON.stringify({action:'reservar',carton:id,nombre,apellido,telefono}),headers:{'Content-Type':'application/json'}});
    const t=await r.text();
    if(t.toLowerCase().includes('reservado')){
      card.classList.add('reservado');
      cerrarModal();
      const msg=encodeURIComponent(`Hola, deseo reservar el cartón #${id} para BINGO JOKER.\nNombre: ${nombre} ${apellido}\nTel: ${telefono}`);
      location.href='https://wa.me/584266404042?text='+msg;
    }else alert(t);
  }catch(e){
    alert('Error conectando al servidor.');
  }
}

/* BUSCADOR + SCROLL */
$('buscarCarton').addEventListener('change',()=>{
  const v=$('buscarCarton').value.padStart(3,'0');
  const card=document.querySelector('.carton[data-id="'+v+'"]');
  if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
});
window.addEventListener('scroll',()=>{
  if(window.innerHeight+window.scrollY>=document.body.offsetHeight-300) mostrarMas();
});

/* PANEL ADMIN */
$('desbloquearPanel').onclick=()=>{
  if($('claveAdmin').value===ADMIN_PASS){
    $('panel-admin').classList.remove('hidden');
    $('loginPanel').classList.add('hidden');
  }else alert('Contraseña incorrecta');
};

/* SORTEO */
function letra(n){return n<=15?'B':n<=30?'I':n<=45?'N':n<=60?'G':'O';}
function hablar(txt){
  const voces=speechSynthesis.getVoices();
  const male=voces.find(v=>v.lang.startsWith('es') && v.name.toLowerCase().includes('male'))||voces.find(v=>v.lang.startsWith('es'));
  const u=new SpeechSynthesisUtterance(txt); if(male)u.voice=male; speechSynthesis.speak(u);
}
function extraer(){
  if(!numeros.length){detener();return;}
  const idx=Math.floor(Math.random()*numeros.length);
  const num=numeros.splice(idx,1)[0];
  $('letraNumero').textContent=letra(num);
  $('valorNumero').textContent=num;
  hablar(`${letra(num)} ${num}`);
}
function iniciar(){if(intervalo) return; extraer(); intervalo=setInterval(extraer,3000);}
function detener(){clearInterval(intervalo);intervalo=null;}
function reiniciar(){detener();numeros=[...Array(75).keys()].map(n=>n+1);$('letraNumero').textContent='';$('valorNumero').textContent='';}
$('iniciarSorteo').onclick=iniciar;
$('detenerSorteo').onclick=detener;
$('reiniciarPartida').onclick=reiniciar;

/* LIBERAR TODOS */
$('liberarTodos').onclick=async()=>{
  if(!confirm('¿Seguro?'))return;
  const r=await fetch(WEBAPP_URL,{method:'POST',body:JSON.stringify({action:'liberar_todos'}),headers:{'Content-Type':'application/json'}});
  const t=await r.text();
  if(t.toLowerCase().includes('liberados')) document.querySelectorAll('.carton.reservado').forEach(c=>c.classList.remove('reservado'));
  else alert(t);
};

/* MODO JUEGO */
function setMode(m){
  currentMode=m;
  document.querySelectorAll('.mode').forEach(b=>b.classList.remove('active'));
  document.getElementById('modo'+capitalize(m)).classList.add('active');
}
function capitalize(str){return str.charAt(0).toUpperCase()+str.slice(1);}
['vertical','horizontal','diagonal','cartonLleno'].forEach(m=>{
  document.getElementById('modo'+capitalize(m)).addEventListener('click',()=>setMode(m));
});

/* INIT */
speechSynthesis.onvoiceschanged=()=>{};
cargarCartones();
