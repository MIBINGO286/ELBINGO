// script.js – versión completa con panel, sorteo, detección de ganadores y CORS resuelto mediante iframe/JSONP

/***********************  CONFIG ***********************/
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzapkct2eJCEvb-5XwDjpHNfe7LCNgrCJQMJzOQDQxmSBvOJBgtYxmuGadJ1oSfmshe7A/exec';
const SHEET_JSONP = 'https://opensheet.elk.sh/1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4/RESERVAS';
const BLOQUE      = 50;
const WHATS_APP   = '584266404042';    // tu número WhatsApp sin +
const PANEL_PASS  = 'joker123';        // contraseña para panel control

/*******************  VARIABLES GLOBALES *******************/
let cartones   = [];          // catálogos locales
let vendidos   = new Set();   // IDs reservados
let pintados   = 0;           // cuántos cartones ya se pintaron
let drawn      = new Set();   // números ya extraídos
let remainingBalls = Array.from({length:75},(_,i)=>i+1);
let drawInterval   = null;

/*******************  REFERENCIAS DOM *******************/
const contenedor   = document.getElementById('cartones-container');
const loader       = document.getElementById('loader');
const modal        = document.getElementById('modal');
const formRes      = document.getElementById('form-reserva');
const spanNum      = document.getElementById('carton-numero');
const inputID      = document.getElementById('input-id');

// Panel control elementos (asegúrate de tenerlos en tu HTML)
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

/*******************  INICIALIZACIÓN *******************/
window.addEventListener('DOMContentLoaded', async ()=>{
  // Carga de cartones desde local
  cartones = await fetch('cartones.json').then(r=>r.json());
  cartones.sort((a,b)=>a.id-b.id);
  pintarBloque();
  observarScroll();

  // Cargar cartones vendidos con JSONP para evitar CORS
  jsonp(SHEET_JSONP,'jsonpVendidos',data=>{
    vendidos = new Set(data.filter(r=>String(r.Estado||r.ESTADO).toUpperCase()==='RESERVADO').map(r=>String(r.ID)));
    refrescarVendidos();
  });
});

/*******************  JSONP helper *******************/
function jsonp(url,cb,cbfn){
  const s=document.createElement('script');
  window[cb]=d=>{cbfn(d);delete window[cb];s.remove();};
  s.src=`${url}?callback=${cb}`;
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

/*******************  RESERVAR CARTÓN (iframe para evitar CORS) *******************/
function abrirModal(id){
  inputID.value=id;
  spanNum.textContent=id;
  modal.classList.remove('hidden');
}
function cerrarModal(){
  modal.classList.add('hidden');
  formRes.reset();
}
window.cerrarModal=cerrarModal;

formRes.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(formRes);
  if(vendidos.has(fd.get('ID'))){
    alert('Este cartón ya está reservado.');
    return;
  }

  // Enviar formulario vía iframe oculto para evitar CORS
  const ifr=document.createElement('iframe');
  ifr.name='hidden_iframe';
  ifr.style.display='none';
  document.body.appendChild(ifr);

  const f=document.createElement('form');
  f.action=WEBAPP_URL;
  f.method='POST';
  f.target='hidden_iframe';
  fd.forEach((v,k)=>{
    const i=document.createElement('input');
    i.name=k; i.value=v;
    f.appendChild(i);
  });
  document.body.appendChild(f);
  f.submit();

  // Marcar vendido y refrescar UI
  const id=fd.get('ID');
  vendidos.add(id);
  refrescarVendidos();

  // Abrir WhatsApp para confirmar
  window.open(`https://wa.me/${WHATS_APP}?text=Hola,%20acabo%20de%20reservar%20el%20cartón%20${id}.`,'_blank');

  cerrarModal();
});

/*******************  PANEL DE CONTROL *******************/
btnTogglePanel.onclick=()=>panel.classList.toggle('hidden');
btnUnlock.onclick=()=>{
  if(passwordInput.value===PANEL_PASS){
    panelContent.classList.remove('hidden');
    passwordInput.value='';
  } else alert('Contraseña incorrecta');
};

/*******************  SORTEO *******************/
function letterFor(n){
  if(n<=15)return 'B';
  if(n<=30)return 'I';
  if(n<=45)return 'N';
  if(n<=60)return 'G';
  return 'O';
}
function drawBall(){
  if(remainingBalls.length === 0){
    stopDraw();
    alert('¡No quedan más bolas!');
    return;
  }
  const idx=Math.floor(Math.random()*remainingBalls.length);
  const num=remainingBalls.splice(idx,1)[0];
  drawn.add(num);
  currentBall.textContent=`${letterFor(num)} - ${num}`;
  const li=document.createElement('li');
  li.textContent=`${letterFor(num)}${num}`;
  historyList.prepend(li);
  marcarNumero(num);
  verificarGanador();
}
function startDraw(){
  if(drawInterval) return;
  drawBall();
  drawInterval=setInterval(drawBall,4000);
  btnStartDraw.disabled=true;
  btnStopDraw.disabled=false;
}
function stopDraw(){
  clearInterval(drawInterval);
  drawInterval=null;
  btnStartDraw.disabled=false;
  btnStopDraw.disabled=true;
}
btnStartDraw.onclick=startDraw;
btnStopDraw.onclick=stopDraw;

/*******************  REINICIAR PARTIDA *******************/
btnRestart.onclick=()=>{
  if(confirm('¿Reiniciar partida?')){
    stopDraw();
    remainingBalls=Array.from({length:75},(_,i)=>i+1);
    drawn.clear();
    currentBall.textContent='';
    historyList.innerHTML='';
    contenedor.querySelectorAll('.cell.marked').forEach(c=>c.classList.remove('marked'));
  }
};

/*******************  MARCAR NÚMERO EN LOS CARTONES *******************/
function marcarNumero(n){
  document.querySelectorAll(`.cell[data-num="${n}"]`).forEach(c=>c.classList.add('marked'));
}

/*******************  DETECCIÓN DE GANADORES *******************/
function getMode(){
  const checked = [...modeRadios].find(r=>r.checked);
  return checked ? checked.value : 'full';
}
function cartonGanador(grid,mode){
  const m=n=> n==='FREE' || drawn.has(n);
  if(mode==='full') return grid.flat().every(m);
  if(mode==='horizontal') return grid.some(row => row.every(m));
  if(mode==='vertical') {
    for(let c=0;c<grid[0].length;c++){
      let colWin = true;
      for(let r=0;r<grid.length;r++){
        if(!m(grid[r][c])){
          colWin = false;
          break;
        }
      }
      if(colWin) return true;
    }
    return false;
  }
  if(mode==='diagonal'){
    const d1 = [0,1,2,3,4].every(i=>m(grid[i][i]));
    const d2 = [0,1,2,3,4].every(i=>m(grid[i][4-i]));
    return d1 || d2;
  }
  return false;
}
function verificarGanador(){
  const mode = getMode();
  for(let c of contenedor.querySelectorAll('.carton:not(.vendido)')){
    const id = c.dataset.id;
    const carton = cartones.find(x=>String(x.id)===id);
    if(!carton) continue;
    if(cartonGanador(carton.grid, mode)){
      stopDraw();
      alert(`¡Cartón ganador: #${id}!`);
      c.classList.add('ganador');
      break;
    }
  }
}

/*******************  PANEL DE CONTROL: LIBERAR CARTÓN *******************/
btnUnreserve.onclick=()=>{
  const id = inputUnreserve.value.trim();
  if(!id){
    alert('Ingrese ID de cartón para liberar');
    return;
  }
  if(!vendidos.has(id)){
    alert('Este cartón no está reservado');
    return;
  }

  // Enviar formulario vía iframe para liberar
  const ifr=document.createElement('iframe');
  ifr.name='hidden_iframe';
  ifr.style.display='none';
  document.body.appendChild(ifr);

  const f=document.createElement('form');
  f.action=WEBAPP_URL;
  f.method='POST';
  f.target='hidden_iframe';

  // Para liberar, enviamos Estado=LIBRE
  const inputs = [
    {name:'ID', value:id},
    {name:'Estado', value:'LIBRE'},
    {name:'Nombre', value:''},
    {name:'Apellido', value:''},
    {name:'Teléfono', value:''}
  ];
  inputs.forEach(({name,value})=>{
    const i=document.createElement('input');
    i.name=name; i.value=value;
    f.appendChild(i);
  });
  document.body.appendChild(f);
  f.submit();

  vendidos.delete(id);
  refrescarVendidos();
  alert(`Cartón #${id} liberado.`);
};

/*******************  BUSCADOR DE CARTONES *******************/
searchInput.addEventListener('input', e=>{
  const val = e.target.value.trim();
  if(!val){
    contenedor.querySelectorAll('.carton').forEach(c=>c.style.display='');
    return;
  }
  contenedor.querySelectorAll('.carton').forEach(c=>{
    c.style.display = c.dataset.id.includes(val) ? '' : 'none';
  });
});
