// script.js
import { getData, saveBola, saveGanador, saveVenta, resetGame } from './sheetsApi.js';
import { CONFIG } from './config.js';

// --- Elementos del juego principal (estos siempre están disponibles) ---
const gameInfoSection = document.getElementById('gameInfo');
const cartonesContainer = document.getElementById('cartonesContainer');
const searchInput = document.getElementById('searchInput');
const currentBall = document.getElementById('currentBall');
const historyList = document.getElementById('historyList');
const openAdminBtn = document.getElementById('openAdminBtn'); // Este es el botón para abrir el panel


// --- Configuración y elementos del Panel de Administrador ---
// Creamos el contenedor principal para el panel de admin dinámicamente
const adminPanelContainer = document.createElement('div');
adminPanelContainer.id = 'adminPanelContainer';
// Insertamos este contenedor justo antes del footer
document.body.insertBefore(adminPanelContainer, document.querySelector('footer'));

// Definimos el HTML interno del panel de administración
adminPanelContainer.innerHTML = `
  <button id="closeAdminBtn" class="admin-link" style="background-color: #dc3545; margin-bottom: 1rem; float: right;">Cerrar Panel</button>
  <div style="clear: both;"></div>
  <div id="loginGate">
    <h2>Panel de control</h2>
    <input type="password" id="passInput" placeholder="Contraseña" />
    <button id="loginBtn">Entrar</button>
    <p id="loginMsg"></p>
  </div>

  <div id="adminPanel" style="display:none;">
    <h2>Administrador Bingo Joker</h2>
    <section class="admin-section">
      <button id="startBtn">Iniciar sorteo</button>
      <button id="pauseBtn">Pausar</button>
      <button id="resetBtn">Reiniciar partida</button>
    </section>

    <section class="admin-section">
      <h3>Modalidades activas</h3>
      <label><input type="checkbox" id="chkLinea" checked> Línea</label>
      <label><input type="checkbox" id="chkColumna" checked> Columna</label>
      <label><input type="checkbox" id="chkFull" checked> Cartón lleno</label>
    </section>

    <section class="admin-section">
      <h3>Cartones vendidos (<span id="soldCartonsCount">0</span>)</h3>
      <div id="salesList"></div>
    </section>

    <section class="admin-section">
      <h3>Ganadores</h3>
      <div id="winnersList"></div>
    </section>
  </div>
`;

// --- OBTENER REFERENCIAS A LOS ELEMENTOS DEL PANEL DESPUÉS DE QUE SE HAN CREADO ---
// Es crucial obtener estas referencias *después* de que adminPanelContainer.innerHTML se haya establecido.
const loginGate = adminPanelContainer.querySelector('#loginGate');
const adminPanel = adminPanelContainer.querySelector('#adminPanel');
const passInput = adminPanelContainer.querySelector('#passInput');
const loginBtn = adminPanelContainer.querySelector('#loginBtn');
const loginMsg = adminPanelContainer.querySelector('#loginMsg');
const closeAdminBtn = adminPanelContainer.querySelector('#closeAdminBtn');

const startBtn = adminPanelContainer.querySelector('#startBtn');
const pauseBtn = adminPanelContainer.querySelector('#pauseBtn');
const resetBtn = adminPanelContainer.querySelector('#resetBtn');

const chkLinea = adminPanelContainer.querySelector('#chkLinea');
const chkColumna = adminPanelContainer.querySelector('#chkColumna');
const chkFull = adminPanelContainer.querySelector('#chkFull');

const salesList = adminPanelContainer.querySelector('#salesList');
const soldCartonsCount = adminPanelContainer.querySelector('#soldCartonsCount');
const winnersList = adminPanelContainer.querySelector('#winnersList');


let cartones = [];
let vendidos = new Set();
let bolas = [];
let ganadores = [];
let intervalId = null;
let currentIndex = 0;

// --- Funciones del juego principal ---

async function init() {
  const data = await getData();
  vendidos = new Set(data.vendidos.map(id => String(id)));
  bolas = data.bolas;
  currentBall.textContent = `Bola actual: ${bolas.at(-1) || '--'}`;
  historyList.textContent = bolas.join(', ');

  try {
    const res = await fetch('./cartones.json');
    const loadedCartones = await res.json();
    cartones = loadedCartones.map(carton => ({
      id: String(carton.id),
      matriz: carton.matriz,
      numeros: carton.matriz.flat()
    }));
    renderCartones(50);
  } catch (error) {
    console.error('Error al cargar cartones.json:', error);
    alert('No se pudieron cargar los cartones. Por favor, recarga la página o verifica el archivo cartones.json.');
  }
}

let loaded = 0;
function renderCartones(lote) {
  const frag = document.createDocumentFragment();
  const endIndex = Math.min(loaded + lote, cartones.length);

  for (let i = loaded; i < endIndex; i++) {
    const carton = cartones[i];
    const div = document.createElement('div');
    div.className = 'carton';
    div.dataset.id = carton.id; // Añadir data-id para facilitar la búsqueda

    if (vendidos.has(carton.id)) {
      div.classList.add('vendido');
    }

    const numerosHtml = carton.numeros.map(n =>
      `<span class="bingo-cell${bolas.includes(n) ? ' marked' : ''}">${n}</span>`
    ).join('');

    div.innerHTML = `
      <span class="carton-id">#${carton.id}</span>
      <div class="bingo-numbers">${numerosHtml}</div>
      ${!vendidos.has(carton.id) ? `<button data-id="${carton.id}">Comprar</button>` : ''}
    `;
    frag.appendChild(div);
  }
  cartonesContainer.appendChild(frag);
  loaded = endIndex;
}

window.addEventListener('scroll', () => {
  if (adminPanelContainer.style.display !== 'block' && window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    renderCartones(50);
  }
});

cartonesContainer.addEventListener('click', async (e) => {
  if (e.target.tagName === 'BUTTON') {
    const id = e.target.dataset.id;
    const confirmPurchase = window.confirm(`¿Deseas comprar el cartón #${id}?`);
    if (confirmPurchase) {
      try {
        await saveVenta(id);
        vendidos.add(id);
        const parentDiv = e.target.parentElement;
        parentDiv.classList.add('vendido');
        e.target.remove();
        window.open(`https://wa.me/584141234567?text=Hola%2C%20quiero%20comprar%20el%20cart%C3%B3n%20%23${id}`, '_blank');
        if (adminPanelContainer.style.display === 'block') { // Si el panel está abierto, actualiza ventas
          renderVentas();
        }
      } catch (error) {
        console.error('Error al procesar la compra:', error);
        alert('No se pudo completar la compra. Inténtalo de nuevo.');
      }
    }
  }
});

searchInput.addEventListener('input', () => {
  const value = searchInput.value.trim();
  if (value.length > 0) {
    const cartonElement = [...cartonesContainer.children].find(div =>
      div.querySelector('.carton-id')?.textContent.includes(value)
    );
    if (cartonElement) {
      cartonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cartonElement.style.border = '3px solid #00f';
      setTimeout(() => {
        cartonElement.style.border = '2px solid #e3c200';
      }, 2000);
    } else {
      console.log('Cartón no encontrado.');
    }
  } else {
    [...cartonesContainer.children].forEach(div => div.style.border = '2px solid #e3c200');
  }
});

// --- Funciones del Panel de Administrador ---

openAdminBtn.addEventListener('click', () => {
  gameInfoSection.style.display = 'none'; // Ocultar info del juego
  cartonesContainer.style.display = 'none'; // Ocultar cartones
  adminPanelContainer.style.display = 'block'; // Mostrar panel admin

  // Asegurar que el login/panel se muestre correctamente
  if (passInput.value === CONFIG.SECRET) { // Si la contraseña ya está correcta
      loginGate.style.display = 'none';
      adminPanel.style.display = 'block';
      initAdminPanelData();
  } else { // Si no ha iniciado sesión o la contraseña es incorrecta
      loginGate.style.display = 'block';
      adminPanel.style.display = 'none';
      loginMsg.textContent = ''; // Limpiar mensaje previo
      passInput.value = ''; // Limpiar el campo de contraseña
      passInput.focus(); // Poner el foco en el input de contraseña
  }
});

closeAdminBtn.addEventListener('click', () => {
  adminPanelContainer.style.display = 'none'; // Ocultar panel admin
  gameInfoSection.style.display = 'block'; // Mostrar info del juego
  cartonesContainer.style.display = 'grid'; // Mostrar cartones
});

loginBtn.addEventListener('click', async () => {
    if (passInput.value === CONFIG.SECRET) {
        loginGate.style.display = 'none';
        adminPanel.style.display = 'block';
        await initAdminPanelData();
    } else {
        loginMsg.textContent = 'Contraseña incorrecta';
        loginMsg.style.color = 'red';
    }
});

async function initAdminPanelData() {
    const data = await getData();
    bolas = data.bolas;
    vendidos = new Set(data.vendidos.map(id => String(id)));
    ganadores = data.ganadores || [];

    // Cargar cartones solo si aún no están cargados (para evitar recargas innecesarias)
    if (cartones.length === 0) {
        try {
            const res = await fetch('./cartones.json');
            const loadedCartones = await res.json();
            cartones = loadedCartones.map(carton => ({
                id: String(carton.id),
                matriz: carton.matriz,
                numeros: carton.matriz.flat()
            }));
        } catch (error) {
            console.error('Error al cargar cartones.json para admin:', error);
            alert('No se pudieron cargar los cartones en el panel admin.');
            return;
        }
    }

    renderVentas();
    renderGanadores();
    currentIndex = bolas.length;
    updateModalidadesUI();

    // Actualiza el estado de los botones de control al cargar el panel
    if (intervalId) { // Si el sorteo está activo
        startBtn.disabled = true;
        pauseBtn.disabled = false;
    } else { // Si el sorteo está pausado o no iniciado
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }
}

function renderVentas() {
    salesList.innerHTML = '';
    const vendidosArray = Array.from(vendidos).sort((a, b) => parseInt(a) - parseInt(b));

    soldCartonsCount.textContent = vendidosArray.length;

    if (vendidosArray.length === 0) {
        salesList.textContent = 'No hay cartones vendidos aún.';
        return;
    }

    vendidosArray.forEach(id => {
        const div = document.createElement('div');
        div.className = 'sold-carton-item';
        div.textContent = `Cartón #${id}`;
        const btn = document.createElement('button');
        btn.textContent = 'Quitar';
        btn.classList.add('remove-sale-btn');
        btn.addEventListener('click', async () => {
            const confirmRemove = window.confirm(`¿Deseas quitar el cartón #${id} de la lista de vendidos?`);
            if (confirmRemove) {
                vendidos.delete(id);
                await saveVenta(id, true);
                renderVentas();

                // Actualizar el estado visual del cartón en la vista principal si es visible
                // Usamos data-id para una selección más robusta
                const cartonDiv = document.querySelector(`.carton[data-id="${id}"]`);
                if (cartonDiv) {
                    cartonDiv.classList.remove('vendido');
                    if (!cartonDiv.querySelector('button[data-id]')) {
                        const newButton = document.createElement('button');
                        newButton.dataset.id = id;
                        newButton.textContent = 'Comprar';
                        cartonDiv.appendChild(newButton);
                    }
                }
            }
        });
        div.appendChild(btn);
        salesList.appendChild(div);
    });
}

function renderGanadores() {
    winnersList.innerHTML = '';
    if (ganadores.length === 0) {
        winnersList.textContent = 'No hay ganadores aún.';
        return;
    }
    ganadores.forEach(({ id, modalidad }) => {
        const div = document.createElement('div');
        div.className = 'winner-item';
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
    intervalId = setInterval(extraerBola, 3000);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    console.log('Sorteo iniciado.');
});

pauseBtn.addEventListener('click', () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        console.log('Sorteo pausado.');
    }
});

resetBtn.addEventListener('click', async () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    const confirmReset = window.confirm('¿Estás seguro de reiniciar la partida? Esto borrará todas las bolas y ganadores.');
    if (confirmReset) {
        await resetGame();
        bolas = [];
        ganadores = [];
        currentIndex = 0;
        currentBall.textContent = `Bola actual: --`;
        historyList.textContent = '';
        
        loaded = 0;
        cartonesContainer.innerHTML = '';
        await init(); // Vuelve a cargar y renderizar los cartones para desmarcarlos y restablecer botones
        
        renderGanadores();
        renderVentas();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        alert('Partida reiniciada correctamente.');
    }
});

async function extraerBola() {
    if (currentIndex >= 75) {
        clearInterval(intervalId);
        intervalId = null;
        alert('Se han extraído todas las bolas. El juego ha terminado.');
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        return;
    }

    let bolaNueva;
    const allPossibleBalls = Array.from({ length: 75 }, (_, i) => i + 1);
    const availableBalls = allPossibleBalls.filter(b => !bolas.includes(b));

    if (availableBalls.length === 0) {
        clearInterval(intervalId);
        intervalId = null;
        alert('No quedan bolas disponibles para extraer.');
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableBalls.length);
    bolaNueva = availableBalls[randomIndex];

    bolas.push(bolaNueva);
    currentIndex++;
    await saveBola(bolaNueva);

    currentBall.textContent = `Bola actual: ${bolaNueva}`;
    historyList.textContent = bolas.join(', ');
    markBolaInCartones(bolaNueva);

    checkGanadores();
    renderGanadores();
}

function markBolaInCartones(bola) {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        if (parseInt(cell.textContent) === bola) {
            cell.classList.add('marked');
        }
    });
}

function checkGanadores() {
    const modalidadesActivas = {
        linea: chkLinea.checked,
        columna: chkColumna.checked,
        full: chkFull.checked
    };

    cartones.forEach(carton => {
        if (!vendidos.has(carton.id)) return;

        // Comprobar Línea
        if (modalidadesActivas.linea && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Línea')) {
            if (checkLinea(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Línea' });
                saveGanador(carton.id, 'Línea');
                console.log(`¡Cartón #${carton.id} ha ganado la Línea!`);
            }
        }

        // Comprobar Columna
        if (modalidadesActivas.columna && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Columna')) {
            if (checkColumna(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Columna' });
                saveGanador(carton.id, 'Columna');
                console.log(`¡Cartón #${carton.id} ha ganado la Columna!`);
            }
        }

        // Comprobar Cartón lleno (Full)
        if (modalidadesActivas.full && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Cartón lleno')) {
            if (checkFull(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Cartón lleno' });
                saveGanador(carton.id, 'Cartón lleno');
                console.log(`¡Cartón #${carton.id} ha ganado el Cartón Lleno!`);
            }
        }
    });
}

function checkLinea(carton) {
    for (let r = 0; r < carton.matriz.length; r++) {
        // Ignorar filas que no tienen 5 números (como las filas con el espacio libre si se representa diferente)
        // O asegurarse de que el espacio libre se cuenta como 'marcado'
        const row = carton.matriz[r];
        if (row && row.length === 5 && row.every(n => n === 0 || bolas.includes(n))) {
            return true;
        }
    }
    return false;
}

function checkColumna(carton) {
    if (!carton.matriz || carton.matriz.length === 0 || carton.matriz[0].length === 0) return false;

    for (let c = 0; c < carton.matriz[0].length; c++) {
        let colCompleta = true;
        for (let r = 0; r < carton.matriz.length; r++) {
            const numberInCell = carton.matriz[r][c];
            // Si la celda es 0 (espacio libre), se considera marcada.
            if (numberInCell === 0) {
                continue;
            }
            if (typeof numberInCell === 'undefined' || !bolas.includes(numberInCell)) {
                colCompleta = false;
                break;
            }
        }
        if (colCompleta) return true;
    }
    return false;
}

function checkFull(carton) {
    return carton.numeros.every(n => n === 0 || bolas.includes(n));
}

// Inicializa la aplicación principal al cargar
init();
