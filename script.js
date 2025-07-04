// script.js – versión robusta y FINAL
// Carga cartones, gestiona reservas (bloqueo persistente con Google Sheets),
// panel de sorteo, modalidades y WhatsApp.

/*********************** CONFIG ************************/
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxKH9xP-YZ6UXdTw9MtjeF9C19lMlXH0k-oMrbXiWqhrhoN0xJJPPpa6NOGFJo7x_5G/exec';
const SHEET_URL  = 'https://opensheet.elk.sh/1YeHvkb5ag9hdL1VZTtXyi3PKwio7RWQ5tr-WaDKd52g/RESERVAS';
const BLOQUE     = 50;          // cartones por “scroll”
const WHATS_APP  = '584266404042';
const PANEL_PASS = 'joker123';

/******************* VARIABLES GLOBALES *****************/
let cartones = [];
let vendidos = new Set();
let pintados = 0;
let drawn    = new Set();
let balls    = Array.from({length:75},(_,i)=>i+1);
let interval = null;

/******************* REFERENCIAS DOM *****************/
const contenedor = document.getElementById('cartones-container');
const loader     = document.getElementById('loader');
const modal      = document.getElementById('modal');
const formRes    = document.getElementById('form-reserva');
const spanNum    = document.getElementById('carton-numero');
const inputID    = document.getElementById('input-id');
// panel
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

/******************* INIT ******************************/
window.addEventListener('DOMContentLoaded',async()=>{
  // 1. cartones.json
  try{
    const r = await fetch('cartones.json',{cache:'no-store'});
    if(!r.ok) throw new Error(`cartones.json HTTP ${r.status}`);
    cartones = await r.json();
    if(!Array.isArray(cartones)) throw new Error('cartones.json mal formado');
    cartones.sort((a,b)=>a.id-b.id);
    pintarBloque();
    observarScroll();
  }catch(e){ console.error(e); loader.textContent='⚠️ Error al cargar cartones'; return; }

  // 2. reservas (OpenSheet con CORS)
  try{
    const r = await fetch(SHEET_URL,{cache:'no-store'});
    if(!r.ok) throw new Error(`OpenSheet HTTP ${r.status}`);
    const data = await r.json();
    vendidos = new Set(data.filter(x=>String(x.Estado||x.ESTADO).toUpperCase()==='RESERVADO').map(x=>String(x.ID)));
    refrescarVendidos();
  }catch(e){ console.warn('Error cargando reservas',e); }
});

/******************* CARTONES **************************/
function crearCarton({id,grid}){
  const art=document.createElement('article');
  art.className='carton'; art.dataset.id=id;
  const celdas=grid.flat().map(n=>{
    const mark=n!=='FREE'&&drawn.has(n)?'marked':'';
    return `<div class="cell ${mark}" data-num="${n}">${n==='FREE'?'★':n}</div>`;
  }).join('');
  art.innerHTML=`<h3>#${id.toString().padStart(4,'0')}</h3><div class="grid">${celdas}</div>`;
  if(vendidos.has(String(id))) art.classList.add('vendido');
  else art.onclick=()=>abrirModal(id);
  return art;
}
function pintarBloque(){
  const frag=document.createDocumentFragment();
  for(let i=pintados;i<pintados+BLOQUE&&i<cartones.length;i++) frag.appendChild(crearCarton(cartones[i]));
  pintados+=BLOQUE; contenedor.appendChild(frag);
  if(pintados>=cartones.length) loader.style.display='none';
}
function observarScroll(){
  const sent=document.createElement('div'); contenedor.appendChild(sent);
  new IntersectionObserver(e=>e[0].isIntersecting&&pintarBloque()).observe(sent);
}
function refrescarVendidos(){
  contenedor.querySelectorAll('.carton').forEach(c=>{
    vendidos.has(c.dataset.id)?c.classList.add('vendido'):c.classList.remove('vendido');
  });
}

/******************* RESERVA ***************************/
function abrirModal(id){ inputID.value=id; spanNum.textContent=id; modal.classList.remove('hidden'); }
function cerrarModal(){ modal.classList.add('hidden'); formRes.reset(); }
window.cerrarModal=cerrarModal;

formRes.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(formRes);
  const id=fd.get('ID');
  if(vendidos.has(id)){ alert('Ese cartón ya está reservado'); return; }

  // envío mediante iframe (sin CORS)
  const ifr=document.createElement('iframe'); ifr.name='hidden_iframe'; ifr.style.display='none'; document.body.appendChild(ifr);
  const f=document.createElement('form'); f.action=WEBAPP_URL; f.method='POST'; f.target='hidden_iframe';
  fd.forEach((v,k)=>{const inpt=document.createElement('input'); inpt.name=k; inpt.value=v; f.appendChild(inpt);} );
  document.body.appendChild(f); f.submit();

  vendidos.add(id); refrescarVendidos();
  window.open(`https://wa.me/${WHATS_APP}?text=${encodeURIComponent('Hola, quiero comprar el cartón '+id+' y ya estoy por realizar el pago.')}`,'_blank');
  cerrarModal();
});

/******************* PANEL / SORTEO ********************/
btnTogglePanel.onclick=()=>panel.classList.toggle('hidden');
btnUnlock.onclick=()=>{
  if(passwordInput.value===PANEL_PASS){ panelContent.classList.remove('hidden'); passwordInput.value=''; }
  else alert('Contraseña incorrecta');
};
const letra=n=>n<=15?'B':n<=30?'I':n<=45?'N':n<=60?'G':'O';
function drawBall(){
  if(!balls.length){ stopDraw(); alert('¡Sin bolas!'); return; }
  const idx=Math.floor(Math.random()*balls.length);
  const num=balls.splice(idx,1)[0]; drawn.add(num);
  currentBall.textContent=`${letra(num)} - ${num}`;
  const li=document.createElement('li'); li.textContent=letra(num)+num; historyList.prepend(li);
  document.querySelectorAll(`.cell[data-num="${num}"]`).forEach(c=>c.classList.add('marked'));
  verificarGanador();
}
function startDraw(){ if(interval) return; drawBall(); interval=setInterval(drawBall,4000); btnStartDraw.disabled=true; btnStopDraw.disabled=false; }
function stopDraw(){ clearInterval(interval); interval=null; btnStartDraw.disabled=false; btnStopDraw.disabled=true; }
btnStartDraw.onclick=startDraw; btnStopDraw.onclick=stopDraw;
btnRestart.onclick=()=>{
  if(!confirm('¿Reiniciar partida?')) return;
  stopDraw(); balls=Array.from({length:75},(_,i)=>i+1); drawn.clear(); currentBall.textContent=''; historyList.innerHTML='';
  document.querySelectorAll('.cell.marked').forEach(c=>c.classList.remove('marked'));
};
function getMode(){ return [...modeRadios].find(r=>r.checked)?.value||'full'; }
function cartonGanador(grid,mode){
  const ok=l=>l.every(n=>n==='FREE'||drawn.has(n));
  const cols=grid[0].map((_,i)=>grid.map(r=>r[i]));
  if(mode==='full')      return grid.flat().every(n=>n==='FREE'||drawn.has(n));
  if(mode==='horizontal')return grid.some(ok);
  if(mode==='vertical')  return cols.some(ok);
  if(mode==='diagonal'){
    const d1=[0,1,2,3,4].map(i=>grid[i][i]);
    const d2=[0,1,2,3,4].map(i=>grid[i][4-i]);
    return ok(d1)||ok(d2);
  }
  return false;
}
function verificarGanador(){
  const mode=getMode();
  for(const {id,grid} of cartones){
    if(!vendidos.has(String(id))) continue;
    if(cartonGanador(grid,mode)){
      stopDraw();
      alert(`¡Cartón ganador #${id}!`);
      document.querySelector(`.carton[data-id="${id}"]`).scrollIntoView({behavior:'smooth',block:'center'});
      break;
    }
  }
}
