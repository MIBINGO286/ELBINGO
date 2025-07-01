//---------------------------------------------------
// CONFIGURACIÓN
//---------------------------------------------------
const API_URL  ='https://script.google.com/macros/s/AKfycbwLxvJuwaHL_5tvMJt31VeDYoL5LsaVq8P51gPBnzIxLDK66IH6sUq_1MnGcFDZrsITlA/exec';
const PHONE    ='584266404042';
const PASS     ='Jrr035$$*';
const INTERVAL =3000;
const PAGE     =50;                 // cartones por tanda
//---------------------------------------------------

let bolsa      =Array.from({length:75},(_,i)=>i+1);
let timer      =null;
let cargados   =0;
let datosCartones=[];
let reservados =new Set();
let admin      =false;

// refs DOM
const ctn  =id=>document.getElementById(id);
const cart =ctn('cartones');
const modal=ctn('modal');
const idModal=ctn('idModal');

//-------------------- CARGA INICIAL -----------------
fetch('bingo_cards.json')
  .then(r=>r.json())
  .then(json=>{
    datosCartones=json;
    cargarMas();
    // estado reservado desde backend
    fetch(API_URL+'?list=1')
      .then(r=>r.json()).then(j=>{
        (j.reservados||[]).forEach(id=>reservados.add(id));
        marcarReservados();
      });
  });

function cargarMas(){
  const slice=datosCartones.slice(cargados,cargados+PAGE);
  slice.forEach(renderCarton);
  cargados+=slice.length;
}

function renderCarton(c){
  const div=document.createElement('div');
  div.className='carton';
  div.dataset.id=c.id;
  div.innerHTML=`<div class="idCarton">#${String(c.id).padStart(4,'0')}</div>`;
  const g=document.createElement('div');
  g.className='grid';
  c.grid.forEach(fila=>fila.forEach(v=>{
    const cell=document.createElement('div');
    cell.className='celda';
    if(v==='FREE') cell.classList.add('free');
    cell.textContent=v;
    g.appendChild(cell);
  }));
  div.appendChild(g);
  div.onclick=()=>abrirReserva(c.id);
  cart.appendChild(div);
}

function marcarReservados(){
  reservados.forEach(id=>{
    const d=document.querySelector(`.carton[data-id="${id}"]`);
    if(d) d.classList.add('reservado');
  });
}

// scroll infinito
new IntersectionObserver(e=>{
  if(e[0].isIntersecting) cargarMas();
}).observe(ctn('sentinel'));

//-------------------- RESERVA -----------------------
function abrirReserva(id){
  if(reservados.has(id)) return;
  idModal.textContent=id;
  modal.classList.remove('oculto');
  modal.dataset.id=id;
}
ctn('cerrarModal').onclick=()=>modal.classList.add('oculto');

ctn('formReserva').onsubmit=async e=>{
  e.preventDefault();
  const id=Number(modal.dataset.id);
  const {nombre,apellido,telefono}=Object.fromEntries(new FormData(e.target));
  const body={id,nombre,apellido,telefono};
  const res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await res.json();
  if(j.ok){
    reservados.add(id);
    marcarReservados();
    modal.classList.add('oculto');
    // WhatsApp
    const msg=`Hola! Quiero reservar el cartón #${id} (BINGO JOKER)`;
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`,'_blank');
  }else alert(j.error||'Error');
};

//-------------------- SORTEO ------------------------
function letra(num){return 'BINGO'[Math.floor((num-1)/15)];}
function cantar(num){
  const txt=`${letra(num)} ${num}`;
  speechSynthesis.speak(new SpeechSynthesisUtterance(txt));
}
function sacar(){
  if(!bolsa.length){detener();return;}
  const idx=Math.floor(Math.random()*bolsa.length);
  const n=bolsa.splice(idx,1)[0];
  cantar(n);
  // (pinta el número si tienes tablero)
}
function iniciar(){
  if(timer) return;
  sacar(); timer=setInterval(sacar,INTERVAL);
}
function detener(){clearInterval(timer);timer=null;}

//-------------------- BOTONES -----------------------
ctn('btnIniciar').onclick=iniciar;
ctn('btnDetener').onclick=detener;
ctn('btnReset').onclick=()=>{if(admin){bolsa=Array.from({length:75},(_,i)=>i+1);detener();}};

ctn('btnAdmin').onclick=()=>{
  if(prompt('Contraseña:')===PASS){
    admin=true; ctn('panel').classList.remove('oculto');
  }else alert('Contraseña incorrecta');
};

//-------------------- BUSCADOR ----------------------
ctn('btnBuscar').onclick=()=>{
  const id=Number(ctn('buscar').value);
  const obj=document.querySelector(`.carton[data-id="${id}"]`);
  if(obj) obj.scrollIntoView({behavior:'smooth',block:'center'});
};
