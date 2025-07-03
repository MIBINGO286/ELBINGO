/***************************
 *  CONFIGURACIÓN GENERAL  *
 ***************************/
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxC4GxqUg5lnl80Zt6KpAmLEoWWYXcT9xgQMIqfyvzzwu8rAH2fdc1q5Dg5CHGOmi7BHA/exec';
const BLOQUE     = 50;              // cuántos cartones cargar por scroll
const WHATS_APP  = '584266404042';  // tu número WhatsApp a 12 dígitos sin “+”

/************************************************
 * 1. VARIABLES DE ESTADO Y REFERENCIAS A DOM   *
 ************************************************/
let cartones = [];          // [{id, grid:[[],[],[]]}]
let vendidos = new Set();   // IDs reservados
let pintados = 0;           // cuántos cartones ya se pintaron
let drawn    = new Set();   // números ya extraídos

/* Sorteo */
let remainingBalls = Array.from({length:75},(_,i)=>i+1);
let drawInterval   = null;

/* —— DOM —— */
const contenedor   = document.getElementById('cartones-container');
const loader       = document.getElementById('loader');
const modal        = document.getElementById('modal');
const formRes      = document.getElementById('form-reserva');
const spanNum      = document.getElementById('carton-numero');
const inputID      = document.getElementById('input-id');
const btnReservar  = document.getElementById('btn-reservar');

/* Panel de control */
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

/**********************************************
 * 2. INICIALIZACIÓN – Cargar datos y eventos *
 **********************************************/
window.addEventListener('DOMContentLoaded', async () => {
  // 2‑A  Cargar cartones locales y pintarlos
  cartones = await fetch('cartones.json').then(r=>r.json());
  cartones.sort((a,b)=>a.id-b.id);
  pintarBloque();
  observarScroll();

  // 2‑B  Cargar reservados vía JSONP
  loadJSONP(WEBAPP_URL, 'jsonpVendidos', data => {
    vendidos = new Set(
      data.filter(r=>String(r.Estado||r.ESTADO).toUpperCase()==='RESERVADO')
          .map(r=>String(r.ID))
    );
    refrescarVendidosEnPantalla();
  });
});

/**********************
 * 3. UTILIDADES JSONP *
 **********************/
function loadJSONP(url, cbName, callback){
  const s = document.createElement('script');
  window[cbName]=data=>{ callback(data); delete window[cbName]; s.remove(); };
  s.src=`${url}?callback=${cbName}`; document.body.appendChild(s);
}

/**************************
 * 4. CREAR Y PINTAR CARTON *
 **************************/
function crearCarton({id,grid}){
  const a = document.createElement('article');
  a.className='carton';
  a.dataset.id=id;
  a.innerHTML=`<h3>#${id.toString().padStart(4,'0')}</h3>
    <div class="grid">
      ${grid.flat().map(n=>`
        <div class="cell" data-num="${n}">${n==='FREE'?'★':n}</div>`).join('')}
    </div>`;
  if(vendidos.has(String(id))) a.classList.add('vendido');
  else a.onclick=()=>abrirModal(id);
  return a;
}

function pintarBloque(){
  const frag=document.createDocumentFragment();
  for(let i=pintados;i<pintados+BLOQUE&&i<cartones.length;i++){
    frag.appendChild(crearCarton(cartones[i]));
  }
  pintados+=BLOQUE; contenedor.appendChild(frag);
  if(pintados>=cartones.length) loader.style.display='none';
}

function observarScroll(){
  const sent=document.createElement('div'); contenedor.appendChild(sent);
  new IntersectionObserver(e=>{ if(e[0].isIntersecting) pintarBloque(); })
    .observe(sent);
}

function refrescarVendidosEnPantalla(){
  contenedor.querySelectorAll('.carton').forEach(c=>{
    if(vendidos.has(c.dataset.id)) c.classList.add('vendido');
  });
}

/**********************
 * 5. RESERVAR CARTÓN *
 **********************/
function abrirModal(id){
  inputID.value=id; spanNum.textContent=id; modal.classList.remove('hidden');
}
function cerrarModal(){
  modal.classList.add('hidden'); formRes.reset(); btnReservar.disabled=false;
}
window.cerrarModal=cerrarModal;

formRes.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(formRes);
  if(vendidos.has(fd.get('ID'))){ alert('Ya reservado'); return; }
  btnReservar.disabled=true;

  fetch(WEBAPP_URL,{method:'POST',body:fd})
  .then(()=>{
    const id=fd.get('ID');
    vendidos.add(id);
    const carta=contenedor.querySelector(`.carton[data-id="${id}"]`);
    if(carta) carta.classList.add('vendido');

    // 👉 Redirección a WhatsApp con mensaje
    const url=`https://wa.me/${WHATS_APP}?text=Hola,%20acabo%20de%20reservar%20el%20cartón%20${id}.`;
    window.open(url,'_blank');

    cerrarModal();
  })
  .catch(err=>{console.error(err); alert('Error al reservar.'); btnReservar.disabled=false;});
});

/****************************
 * 6. PANEL DE CONTROL      *
 ****************************/
btnTogglePanel.onclick=()=>panel.classList.toggle('hidden');
btnUnlock.onclick=()=>{
  if(passwordInput.value==='joker123'){ panelContent.classList.remove('hidden'); passwordInput.value=''; }
  else alert('Contraseña incorrecta');
};

/************* 6‑A Sorteo *************/
function letterFor(n){
  if(n<=15) return 'B'; if(n<=30) return 'I'; if(n<=45) return 'N';
  if(n<=60) return 'G'; return 'O';
}
function drawBall(){
  if(remainingBalls.length===0){ stopDraw(); alert('Sin bolas'); return; }
  const idx=Math.floor(Math.random()*remainingBalls.length);
  const num=remainingBalls.splice(idx,1)[0];
  drawn.add(num);

  currentBall.textContent=`${letterFor(num)} - ${num}`;
  const li=document.createElement('li'); li.textContent=`${letterFor(num)}${num}`;
  historyList.prepend(li);

  // Marcar en cartones y chequear ganadores
  marcarNumeroEnCartones(num);
  verificarGanadores();
}
function startDraw(){
  if(drawInterval) return;
  drawBall();
  drawInterval=setInterval(drawBall,4000);
  btnStartDraw.disabled=true; btnStopDraw.disabled=false;
}
function stopDraw(){
  clearInterval(drawInterval); drawInterval=null;
  btnStartDraw.disabled=false; btnStopDraw.disabled=true;
}
btnStartDraw.onclick=startDraw; btnStopDraw.onclick=stopDraw;

btnRestart.onclick=()=>{
  if(confirm('¿Reiniciar partida?')){
    stopDraw();
    remainingBalls=Array.from({length:75},(_,i)=>i+1);
    drawn.clear();
    historyList.innerHTML=''; currentBall.textContent='';
    contenedor.querySelectorAll('.cell.marked').forEach(c=>c.classList.remove('marked'));
  }
};

/************* 6‑B Marcar celdas *************/
function marcarNumeroEnCartones(num){
  document.querySelectorAll(`.cell[data-num="${num}"]`).forEach(c=>c.classList.add('marked'));
}

/************* 6‑C Verificar ganadores *************/
function getMode(){
  return [...modeRadios].find(r=>r.checked).value; // full, vertical, horizontal, diagonal
}
function verificarGanadores(){
  const modo=getMode();
  for(const {id,grid} of cartones){
    if(!vendidos.has(String(id))) continue;             // Solo cartones vendidos
    if(cartonEsGanador(grid,modo)){ anunciarGanador(id); break; }
  }
}
function cartonEsGanador(grid,modo){
  const marcado=(n)=> n==='FREE' || drawn.has(n);
  const g=grid;                       // alias

  if(modo==='full'){
    return g.flat().every(marcado);
  }
  if(modo==='vertical'){
    return g[0].some((_,col)=> g.every(row=>marcado(row[col])));
  }
  if(modo==='horizontal'){
    return g.some(row=> row.every(marcado));
  }
  if(modo==='diagonal'){
    const d1 = [0,1,2,3,4].every(i=>marcado(g[i][i]));
    const d2 = [0,1,2,3,4].every(i=>marcado(g[i][4-i]));
    return d1||d2;
  }
  return false;
}
function anunciarGanador(id){
  stopDraw();
  alert(`¡Tenemos ganador!\nCartón #${id}`);
  const carta=contenedor.querySelector(`.carton[data-id="${id}"]`);
  if(carta){ carta.classList.add('ganador'); carta.scrollIntoView({behavior:'smooth',block:'center'}); }
}

/***********************
 * 7. LIBERAR CARTÓN   *
 ***********************/
btnUnreserve.onclick=()=>{
  const id=inputUnreserve.value.trim();
  if(!id){ alert('Ingresa ID'); return; }
  if(!vendidos.has(id)){ alert('Ese cartón no está reservado.'); return; }

  const fd=new FormData(); fd.append('ID',id); fd.append('Estado','LIBRE');
  fetch(WEBAPP_URL,{method:'POST',body:fd})
    .then(()=>{ vendidos.delete(id); refrescarVendidosEnPantalla(); alert('Cartón liberado'); })
    .catch(err=>{ console.error(err); alert('Error al liberar'); });
};

/***********************
 * 8. BUSCADOR         *
 ***********************/
searchInput.oninput=()=>{
  const q=searchInput.value.trim();
  contenedor.querySelectorAll('.carton').forEach(c=>{
    c.style.display = c.dataset.id.startsWith(q) ? 'block':'none';
  });
};

/* —— Estilos extra para celdas marcadas y cartón ganador —— */
const style=document.createElement('style');
style.textContent=`
  .cell.marked      { background:#198754 !important; color:#fff; font-weight:bold; }
  .carton.ganador   { outline:4px solid #ffc107; transform:scale(1.06); transition:transform .3s; }
`;
document.head.appendChild(style);
