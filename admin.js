// admin.js
import { getData, saveBola, saveGanador, saveVenta, resetGame } from './sheetsApi.js';

const loginGate = document.getElementById('loginGate');
const adminPanel = document.getElementById('adminPanel');
const passInput = document.getElementById('passInput');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const chkLinea = document.getElementById('chkLinea');
const chkColumna = document.getElementById('chkColumna');
const chkFull = document.getElementById('chkFull');

const salesList = document.getElementById('salesList');
const winnersList = document.getElementById('winnersList');

const PASSWORD = 'Jrr035$$*';

let bolas = [];
let vendidos = new Set();
let ganadores = [];
let cartones = [];
let intervalId = null;
let currentIndex = 0;

loginBtn.addEventListener('click', () => {
  if (passInput.value === PASSWORD) {
    loginGate.style.display = 'none';
    adminPanel.style.display = 'block';
    initAdmin();
  } else {
    loginMsg.textContent = 'Contraseña incorrecta';
    loginMsg.style.color = 'red';
  }
});

async function initAdmin() {
  const data = await getData();
  bolas = data.bolas;
  vendidos = new Set(data.vendidos);
  ganadores = data.ganadores || [];
  const res = await fetch('./cartones.json');
  cartones = await res.json();
  renderVentas();
  renderGanadores();
  currentIndex = bolas.length;
  updateModalidadesUI();
}

function renderVentas() {
  salesList.innerHTML = '';
  vendidos.forEach(id => {
    const div = document.createElement('div');
    div.textContent = `Cartón #${id}`;
    const btn = document.createElement('button');
    btn.textContent = 'Quitar';
    btn.addEventListener('click', async () => {
      vendidos.delete(id);
      await saveVenta(id, true); // true means remove
      renderVentas();
    });
    div.appendChild(btn);
    salesList.appendChild(div);
  });
}

function renderGanadores() {
  winnersList.innerHTML = '';
  ganadores.forEach(({ id, modalidad }) => {
    const div = document.createElement('div');
    div.textContent = `Cartón #${id} - Ganador: ${modalidad}`;
    winnersList.appendChild(div);
  });
}

function updateModalidadesUI() {
  chkLinea.checked = true;
  chkColumna.checked = true;
  chkFull.checked = true;
}

startBtn.addEventListener('click', () => {
  if (intervalId) return;
  intervalId = setInterval(extraerBola, 5000);
});

pauseBtn.addEventListener('click', () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
});

resetBtn.addEventListener('click', async () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  await resetGame();
  bolas = [];
  ganadores = [];
  currentIndex = 0;
  renderGanadores();
  renderVentas();
  alert('Partida reiniciada');
});

async function extraerBola() {
  if (currentIndex >= 75) {
    clearInterval(intervalId);
    intervalId = null;
    alert('Se han extraído todas las bolas.');
    return;
  }
  let bolaNueva;
  do {
    bolaNueva = Math.floor(Math.random() * 75) + 1;
  } while (bolas.includes(bolaNueva));
  bolas.push(bolaNueva);
  currentIndex++;
  await saveBola(bolaNueva);
  checkGanadores();
  renderGanadores();
  renderVentas();
}

function checkGanadores() {
  const modalidades = {
    linea: chkLinea.checked,
    columna: chkColumna.checked,
    full: chkFull.checked,
  };
  cartones.forEach(carton => {
    if (!vendidos.has(carton.id)) return;
    if (ganadores.find(g => g.id === carton.id)) return;
    if (modalidades.linea && checkLinea(carton)) {
      ganadores.push({ id: carton.id, modalidad: 'Línea' });
      saveGanador(carton.id, 'Línea');
    } else if (modalidades.columna && checkColumna(carton)) {
      ganadores.push({ id: carton.id, modalidad: 'Columna' });
      saveGanador(carton.id, 'Columna');
    } else if (modalidades.full && checkFull(carton)) {
      ganadores.push({ id: carton.id, modalidad: 'Cartón lleno' });
      saveGanador(carton.id, 'Cartón lleno');
    }
  });
}

function checkLinea(carton) {
  for (let r = 0; r < carton.matriz.length; r++) {
    if (carton.matriz[r].every(n => bolas.includes(n))) return true;
  }
  return false;
}

function checkColumna(carton) {
  for (let c = 0; c < carton.matriz[0].length; c++) {
    let colCompleta = true;
    for (let r = 0; r < carton.matriz.length; r++) {
      if (!bolas.includes(carton.matriz[r][c])) {
        colCompleta = false;
        break;
      }
    }
    if (colCompleta) return true;
  }
  return false;
}

function checkFull(carton) {
  return carton.matriz.flat().every(n => bolas.includes(n));
}
