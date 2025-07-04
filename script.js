// script.js – versión completa con panel, sorteo, detección de ganadores y CORS resuelto mediante iframe/JSONP

/***********************  CONFIG ***********************/
const WEBAPP_URL  = 'https://script.google.com/macros/s/AKfycbxKH9xP-YZ6UXdTw9MtjeF9C19lMlXH0k-oMrbXiWqhrhoN0xJJPPpa6NOGFJo7x_5G/exec';
const SHEET_JSONP = 'https://opensheet.elk.sh/1YeHvkb5ag9hdL1VZTtXyi3PKwio7RWQ5tr-WaDKd52g/RESERVAS';
const BLOQUE      = 50;
const WHATS_APP   = '584266404042';
const PANEL_PASS  = 'joker123';

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
window.addEventListener('DOMContentLoaded', async ()=>{
  cartones = await fetch('cartones.json').then(r=>r.json());
  cartones.sort((a,b)=>a.id-b.id);
  pintarBloque();
  observarScroll();

  jsonp(SHEET_JSONP,'jsonpVendidos',data=>{
    vendidos = new Set(data.filter(r=>String(r.Estado||r.ESTADO).toUpperCase()==='RESERVADO').map(r=>String(r.ID)));
    refrescarVendidos();
  });
});

/*******************  JSONP helper *******************/
function jsonp(url,cb,cbfn){
  const s=document.createElement('script');
  window[cb]=d=>{cbfn(d);delete window[cb];s.remove();};
  s.src=`${url}?callback=${cb}&_=${Date.now()}`;
  document.body.appendChild(s);
}

/*******************  FUNCIONES PARA CARTONES *******************/
function crearCarton({id,grid}){
  const a=document.createElement('article');
  a.className='carton'; a.dataset.id=id;
  const gridHtml = grid.flat().map(n=>{
    const marked = (n!=='FREE' && drawn.has(n)) ? 'marked':'';
    return `<div class="cell ${marked}" data-num="${n}">${n==='FREE'?'★':n}</div>`;
  }).join('');
  a.innerHTML=`<h3>#${id.toString().padStart(4,'0')}</h3><div class="grid">${gridHtml}</div>`;
  if(vendidos.has(String(id))) a.classList.add('vendido');
  else a.onclick=()=>abrirModal(id);
  return a;
}
function pintarBloque(){
  const frag=document.createDocumentFragment();
  for(let i=pintados;i<pintados+BLOQUE&&i<cartones.length;i++) frag.appendChild(crearCarton(cartones[i]));
  pintados+=BLOQUE; contenedor.appendChild(frag);
  if(pintados>=cartones.length) loader.style.display='none';
}
function observarScroll(){
  const sent=document.createElement('div');contenedor.appendChild(sent);
  new IntersectionObserver(e=>{if(e[0].isIntersecting) pintarBloque();}).observe(sent);
}
function refrescarVendidos(){
  contenedor.querySelectorAll('.carton').forEach(c=>{
    if(vendidos.has(c.dataset.id)) c.classList.add('vendido');
    else c.classList.remove('vendido');
  });
}

/*******************  RESERVAR CARTÓN *******************/
function abrirModal(id){ inputID.value=id; spanNum.textContent=id; modal.classList.remove('hidden'); }
function cerrarModal(){ modal.classList.add('hidden'); formRes.reset(); }
window.cerrarModal=cerrarModal;

formRes.addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(formRes);
  const id=fd.get('ID');
  if(vendidos.has(id)){ alert('Ese cartón ya está reservado'); return; }

  try{
    const res = await fetch(WEBAPP_URL,{
      method:'POST',
      mode:'cors',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams(fd).toString()
    });
    const txt = await res.text();
    if(!res.ok || !/OK/i.test(txt)) throw new Error(txt);

    vendidos.add(id);
    refrescarVendidos();
    // Abrir WhatsApp con mensaje
    const msg = encodeURIComponent(`Hola, quiero comprar el cartón ${id} y ya estoy por realizar el pago.`);
    window.open(`https://wa.me/${WHATS_APP}?text=${msg}`,'_blank');
    cerrarModal();
  }catch(err){
    alert('Error al reservar. Intenta nuevamente.');
    console.error(err);
  }
});

/*******************  PANEL CONTROL *******************/
btnTogglePanel.onclick=()=>panel.classList.toggle('hidden');
btnUnlock.onclick=()=>{
  if(passwordInput.value===PANEL_PASS){panelContent.classList.remove('hidden');passwordInput.value='';}
  else alert('Contraseña incorrecta');
};

function letterFor(n){return n<=15?'B':n<=30?'I':n<=45?'N':n<=60?'G':'O';}
function drawBall(){
  if(!remainingBalls.length){stopDraw();alert('¡Sin bolas!');return;}
  const idx=Math.floor(Math.random()*remainingBalls.length);
  const num=remainingBalls.splice(idx,1)[0];drawn.add(num);
  currentBall.textContent=`${letterFor(num)} - ${num}`;
  const li=document.createElement('li');li.textContent=`${letterFor(num)}${num}`;historyList.prepend(li);
  marcarNumero(num);verificarGanador();
}
function startDraw(){if(drawInterval)return;drawBall();drawInterval=setInterval(drawBall,4000);btnStartDraw.disabled=true;btnStopDraw.disabled=false;}
function stopDraw(){clearInterval(drawInterval);drawInterval=null;btnStartDraw.disabled=false;btnStopDraw.disabled=true;}
btnStartDraw.onclick=startDraw;btnStopDraw.onclick=stopDraw;

btnRestart.onclick=()=>{
  if(confirm('¿Reiniciar partida?')){
    stopDraw();remainingBalls=Array.from({length:75},(_,i)=>i+1);drawn.clear();currentBall.textContent='';historyList.innerHTML='';
    contenedor.querySelectorAll('.cell.marked').forEach(c=>c.classList.remove('marked'));
  }
};

function marcarNumero(n){document.querySelectorAll(`.cell[data-num="${n}"]`).forEach(c=>c.classList.add('marked'));}
function getMode(){return [...modeRadios].find(r=>r.checked)?.value||'full';}
function cartonGanador(grid, mode){
  const check=l=>l.every(n=>n==='FREE'||drawn.has(n));
  const cols=grid[0].map((_,i)=>grid.map(r=>r[i]));
  if(mode==='full')return grid.flat().every(n=>n==='FREE'||drawn.has(n));
  if(mode==='horizontal')return grid.some(check);
  if(mode==='vertical')return cols.some(check);
  if(mode==='diagonal'){
    const d1=[0,1,2,3,4].map(i=>grid[i][i]);
    const d2=[0,1,2,3,4].map(i=>grid[i][4-i]);
    return check(d1)||check(d2);
  }
  return false;
}
function verificarGanador(){
  const m=getMode();
  for(const {id,grid} of cartones){
    if(!vendidos.has(String(id)))continue;
    if(cartonGanador(grid,m)){stopDraw();alert(`¡Cartón ganador #${id}!`);
      document.querySelector(`.carton[data-id="${id}"]`).scrollIntoView({behavior:'smooth',block:'center'});return;}
  }
}
