import { CONFIG } from './config.js';
import { obtenerVentas, obtenerBolas, registrarBola, registrarGanador, quitarVenta, obtenerGanadores } from './sheetsApi.js';

const loginGate = document.getElementById('loginGate');
const adminPanel = document.getElementById('adminPanel');

document.getElementById('loginBtn').addEventListener('click', ()=>{
  const pass = document.getElementById('passInput').value;
  if(pass === 'Jrr035$$*'){
    loginGate.style.display='none';
    adminPanel.style.display='block';
    initAdmin();
  } else {
    document.getElementById('loginMsg').innerText='Contraseña incorrecta';
  }
});

/* === Sorteo de bolas === */
let remainingNumbers = [...Array(75).keys()].map(n=>n+1);
let drawInterval = null;
let partidaID = Date.now().toString();

async function drawNext(){
  if(remainingNumbers.length===0){
    clearInterval(drawInterval);
    return;
  }
  const idx = Math.floor(Math.random()*remainingNumbers.length);
  const ball = remainingNumbers.splice(idx,1)[0];
  await registrarBola(partidaID, ball);
  actualizarUI();
  evaluarGanadores(ball);
  reproducirSonido('ball');
}

function startDraw(){
  if(!drawInterval){
    drawInterval = setInterval(drawNext, 5000);
    drawNext(); // saca la primera de inmediato
  }
}
function pauseDraw(){
  clearInterval(drawInterval);
  drawInterval = null;
}
function resetGame(){
  pauseDraw();
  remainingNumbers = [...Array(75).keys()].map(n=>n+1);
  partidaID = Date.now().toString();
  alert('Nueva partida iniciada');
}

document.getElementById('startBtn').addEventListener('click', startDraw);
document.getElementById('pauseBtn').addEventListener('click', pauseDraw);
document.getElementById('resetBtn').addEventListener('click', resetGame);

/* === Modalidades === */
function getActiveModes(){
  return {
    linea: document.getElementById('chkLinea').checked,
    columna: document.getElementById('chkColumna').checked,
    full: document.getElementById('chkFull').checked
  };
}

/* === Ventas === */
async function cargarVentas(){
  const ventas = await obtenerVentas();
  const list = document.getElementById('salesList');
  list.innerHTML='';
  ventas.slice(1).forEach(v=>{
    const div = document.createElement('div');
    div.innerHTML = `Cartón #${v[0]} - ${v[3]} <button data-id="${v[0]}">Quitar</button>`;
    list.appendChild(div);
  });
  list.querySelectorAll('button').forEach(btn=>{
    btn.onclick=async ()=>{
      await quitarVenta(btn.dataset.id);
      cargarVentas();
    };
  });
}

/* === Ganadores === */
async function cargarGanadores(){
  const gan = await obtenerGanadores();
  const list = document.getElementById('winnersList');
  list.innerHTML='';
  gan.slice(1).forEach(w=>{
    const div = document.createElement('div');
    div.textContent = `Cartón #${w[1]} ganó por ${w[2]}`;
    list.appendChild(div);
  });
}

async function actualizarUI(){
  await cargarVentas();
  await cargarGanadores();
}

async function initAdmin(){
  await actualizarUI();
}

/* === Evaluación de ganadores (simple) === */
import cartonesData from './cartones.json' assert {type:'json'};
async function evaluarGanadores(ball){
  const mods = getActiveModes();
  const ventas = await obtenerVentas();
  const vendidos = ventas.slice(1).map(r=>r[0]);
  const draws = await obtenerBolas();
  const bolas = draws.slice(1).map(r=>r[1]).map(Number);
  vendidos.forEach(id=>{
    const carton = cartonesData.find(c=>c.id===id.padStart(3,'0'));
    if(!carton) return;
    if(mods.full && isFull(carton, bolas)){
      registrarGanador(partidaID, id, 'Full');
      reproducirSonido('win');
    } else if(mods.linea && isLinea(carton, bolas)){
      registrarGanador(partidaID, id, 'Línea');
      reproducirSonido('win');
    } else if(mods.columna && isColumna(carton, bolas)){
      registrarGanador(partidaID, id, 'Columna');
      reproducirSonido('win');
    }
  });
}

/* === Utilidades de chequeo === */
function isMarked(num, bolas){ return num==='FREE' || bolas.includes(num); }
function isLinea(carton, bolas){
  return carton.rows.some(row => row.every(n=>isMarked(n, bolas)));
}
function isColumna(carton, bolas){
  for(let c=0;c<5;c++){
    let ok=true;
    for(let r=0;r<5;r++){
      if(!isMarked(carton.rows[r][c], bolas)){ ok=false; break; }
    }
    if(ok) return true;
  }
  return false;
}
function isFull(carton, bolas){
  return carton.rows.flat().every(n=>isMarked(n, bolas));
}

/* === Sonidos === */
function reproducirSonido(tipo){
  const audio = new Audio(tipo==='win' ? 'sounds/win.mp3' : 'sounds/ball.mp3');
  audio.play().catch(()=>{});
}

/* === MD5 simple (función ligera) === */
function md5(str){return CryptoJS.MD5(str).toString();}
