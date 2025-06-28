
// Bingo Joker JS AVANZADO con detección automática de ganador
const CARTONES_URL='cartones.json';
const WEBAPP_URL='https://script.google.com/macros/s/AKfycbwfDVDNqvy-JHMU6Xi2EblwwCuDAU_uazEz0tuebXWxqdoPLVLyAjpktlUQuKNLX6Rk/exec';
const ADMIN_PASS='Jrr035$$*';

let cartones=[], mostrados=0;
const BATCH=50;
let numeros=[...Array(75).keys()].map(n=>n+1);
let intervalo=null;

let cantadosNums=JSON.parse(localStorage.getItem('cantadosNums')||'[]'); // numeric only
let cantadosEtiq=JSON.parse(localStorage.getItem('cantadosEtiq')||'[]'); // label strings
let ganadores=JSON.parse(localStorage.getItem('ganadores')||'[]'); // ids de cartones
let currentMode='vertical';

const $=id=>document.getElementById(id);

/* ---------- Utils de voz ---------- */
function hablar(txt){
  const voces=speechSynthesis.getVoices();
  const male=voces.find(v=>v.lang.startsWith('es')&&v.name.toLowerCase().includes('male'))||voces.find(v=>v.lang.startsWith('es'));
  const u=new SpeechSynthesisUtterance(txt);
  if(male)u.voice=male;
  speechSynthesis.speak(u);
}
function letra(n){return n<=15?'B':n<=30?'I':n<=45?'N':n<=60?'G':'O';}
function modoNombre(m){
  return m==='vertical'?'vertical':
         m==='horizontal'?'horizontal':
         m==='diagonal'?'diagonal':
         'cartón lleno';
}

/* ---------- Render de lista cantados ---------- */
function renderCantados(){
  const cont=$('cantados');cont.innerHTML='';
  cantadosEtiq.forEach(lbl=>{
    const span=document.createElement('span');
    span.textContent=lbl;
    cont.appendChild(span);
  });
}

/* ---------- Crear y mostrar cartones ---------- */
async function cargarCartones(){
  cartones=await (await fetch(CARTONES_URL)).json();
  mostrarMas();
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
  if(ganadores.includes(c.id)) card.classList.add('carton-victoria');
  const header=document.createElement('div');
  header.className='carton-id';
  header.innerHTML='<div class="bingo-label">B&nbsp;I&nbsp;N&nbsp;G&nbsp;O</div><div class="carton-num">#'+c.id+'</div>';
  const table=document.createElement('table');
  c.carton.forEach(r=>{
    const tr=document.createElement('tr');
    r.forEach(cell=>{
      const td=document.createElement('td');
      td.textContent=cell;
      if(cell!=='FREE' && cantadosNums.includes(Number(cell))) td.classList.add('cantado');
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  card.append(header,table);
  card.addEventListener('click',()=>abrirModal(c.id,card));
  return card;
}

/* ---------- Modal reserva ---------- */
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
window.onclick=e=>{if(e.target.id==='modalCompra')cerrarModal();};

async function reservar(id,card){
  const nombre=$('nombre').value.trim(),apellido=$('apellido').value.trim(),telefono=$('telefono').value.trim();
  if(!nombre||!apellido||!telefono){alert('Completa todos los campos');return;}
  try{
    const r=await fetch(WEBAPP_URL,{method:'POST',body:JSON.stringify({action:'reservar',carton:id,nombre,apellido,telefono}),headers:{'Content-Type':'application/json'}});
    const t=await r.text();
    if(t.toLowerCase().includes('reservado')){
      card.classList.add('reservado');
      cerrarModal();
      const msg=encodeURIComponent(`Hola, deseo reservar el cartón #${id} para BINGO JOKER.%0ANombre: ${nombre} ${apellido}%0ATel: ${telefono}`);
      location.href='https://wa.me/584266404042?text='+msg;
    }else alert(t);
  }catch(e){alert('Error conectando al servidor.');}
}

/* ---------- Sorteo ---------- */
function extraerNumero(){
  if(!numeros.length){detenerSorteo();return;}
  const idx=Math.floor(Math.random()*numeros.length);
  const num=numeros.splice(idx,1)[0];
  $('letraNumero').textContent=letra(num);
  $('valorNumero').textContent=num;
  hablar(`${letra(num)} ${num}`);

  // Guardar listados
  cantadosNums.unshift(num);
  cantadosEtiq.unshift(`${letra(num)}${num}`);
  cantadosNums=cantadosNums.slice(0,75);
  cantadosEtiq=cantadosEtiq.slice(0,75);
  localStorage.setItem('cantadosNums',JSON.stringify(cantadosNums));
  localStorage.setItem('cantadosEtiq',JSON.stringify(cantadosEtiq));
  renderCantados();

  // Marcar en DOM
  marcarNumero(num);
  // checar ganadores
  detectarGanadores(num);
}
function marcarNumero(num){
  document.querySelectorAll('#cartones td').forEach(td=>{
    if(td.textContent==num) td.classList.add('cantado');
  });
}
function iniciarSorteo(){if(intervalo)return;extraerNumero();intervalo=setInterval(extraerNumero,3000);}
function detenerSorteo(){clearInterval(intervalo);intervalo=null;}
function reiniciarPartida(){
  detenerSorteo();
  numeros=[...Array(75).keys()].map(n=>n+1);
  $('letraNumero').textContent='';$('valorNumero').textContent='';
  cantadosNums=[];cantadosEtiq=[];
  localStorage.removeItem('cantadosNums');localStorage.removeItem('cantadosEtiq');
  renderCantados();
  document.querySelectorAll('.cantado').forEach(td=>td.classList.remove('cantado'));
  ganadores=[];localStorage.removeItem('ganadores');
  document.querySelectorAll('.carton-victoria').forEach(c=>c.classList.remove('carton-victoria'));
}

/* ---------- Detección de ganador ---------- */
function esLineaGanadora(indices){
  return indices.every(([r,c])=>{
    if(r===2&&c===2) return true; // FREE
    const val = cartonesTempCell(r,c);
    return val==="FREE" || cantadosNums.includes(Number(val));
  });
}
function cartonesTempCell(r,c){
  // placeholder; replaced in loop
  return null;
}
function tarjetaGanadora(cardData){
  const mat=cardData.carton;
  function cell(r,c){return mat[r][c];}
  // helpers
  const checkVertical=()=>[0,1,2,3,4].some(c=>[0,1,2,3,4].every(r=>r===2&&c===2?'FREE':cantadosNums.includes(Number(cell(r,c)))));
  const checkHorizontal=()=>[0,1,2,3,4].some(r=>[0,1,2,3,4].every(c=>r===2&&c===2?'FREE':cantadosNums.includes(Number(cell(r,c)))));
  const checkDiagonal=()=>{
    const main=[0,1,2,3,4].every(i=>i===2?'FREE':cantadosNums.includes(Number(cell(i,i))));
    const anti=[0,1,2,3,4].every(i=>i===2?'FREE':cantadosNums.includes(Number(cell(i,4-i))));
    return main||anti;
  };
  const checkFull=()=>[0,1,2,3,4].every(r=>[0,1,2,3,4].every(c=>r===2&&c===2?'FREE':cantadosNums.includes(Number(cell(r,c)))));
  if(currentMode==='vertical') return checkVertical();
  if(currentMode==='horizontal') return checkHorizontal();
  if(currentMode==='diagonal') return checkDiagonal();
  return checkFull(); // cartonLleno
}
function detectarGanadores(){
  cartones.forEach(c=>{
    if(ganadores.includes(c.id)) return;
    if(tarjetaGanadora(c)){
      ganadores.push(c.id);
      localStorage.setItem('ganadores',JSON.stringify(ganadores));
      const cardEl=document.querySelector('.carton[data-id="'+c.id+'"]');
      if(cardEl) cardEl.classList.add('carton-victoria');
      hablar(`¡Cartón ${c.id} ganador ${modoNombre(currentMode)}!`);
      alert('¡Cartón #'+c.id+' ha ganado ('+modoNombre(currentMode)+')!');
    }
  });
}

/* ---------- Buscador y scroll ---------- */
$('buscarCarton').addEventListener('change',()=>{
  const v=$('buscarCarton').value.padStart(3,'0');
  const card=document.querySelector('.carton[data-id="'+v+'"]');
  if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
});
window.addEventListener('scroll',()=>{if(window.innerHeight+window.scrollY>=document.body.offsetHeight-300)mostrarMas();});

/* ---------- Panel admin ---------- */
$('desbloquearPanel').onclick=()=>{ if($('claveAdmin').value===ADMIN_PASS){$('panel-admin').classList.remove('hidden');$('loginPanel').classList.add('hidden');}else alert('Contraseña incorrecta'); };

/* ---------- Liberar todos ---------- */
$('liberarTodos').onclick=async()=>{
  if(!confirm('¿Seguro que desea liberar todos los cartones?')) return;
  try{
    const r=await fetch(WEBAPP_URL,{method:'POST',body:JSON.stringify({action:'liberar_todos'}),headers:{'Content-Type':'application/json'}});
    const t=await r.text();
    if(t.toLowerCase().includes('liberados')){
      document.querySelectorAll('.carton.reservado').forEach(c=>c.classList.remove('reservado'));
    }else alert(t);
  }catch(e){alert('Error conectando al servidor');}
};

/* ---------- Modo de juego ---------- */
function setMode(m){
  currentMode=m;
  document.querySelectorAll('.mode').forEach(b=>b.classList.remove('active'));
  document.getElementById('modo'+(m==='cartonLleno'?'CartonLleno':m.charAt(0).toUpperCase()+m.slice(1))).classList.add('active');
}
['vertical','horizontal','diagonal','cartonLleno'].forEach(m=>{
  document.getElementById('modo'+(m==='cartonLleno'?'CartonLleno':m.charAt(0).toUpperCase()+m.slice(1))).addEventListener('click',()=>setMode(m));
});

/* ---------- Inicio ---------- */
speechSynthesis.onvoiceschanged=()=>{};
renderCantados();
cargarCartones();

$('iniciarSorteo').onclick=iniciarSorteo;
$('detenerSorteo').onclick=detenerSorteo;
$('reiniciarPartida').onclick=reiniciarPartida;
