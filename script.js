// script.js
import { getData, saveBola, saveGanador, saveVenta, resetGame } from './sheetsApi.js';
import { CONFIG } from './config.js';

// --- Elementos del juego principal ---
const gameInfoSection = document.getElementById('gameInfo');
const cartonesContainer = document.getElementById('cartonesContainer');
const searchInput = document.getElementById('searchInput');
const currentBall = document.getElementById('currentBall');
const historyList = document.getElementById('historyList');
const openAdminBtn = document.getElementById('openAdminBtn');

// --- Configuración y elementos del Panel de Administrador (Creados dinámicamente) ---
const adminPanelContainer = document.createElement('div');
adminPanelContainer.id = 'adminPanelContainer';
adminPanelContainer.style.display = 'none';
document.body.insertBefore(adminPanelContainer, document.querySelector('footer'));

adminPanelContainer.innerHTML = `
<button id="closeAdminBtn" class="admin-link close-button" style="background-color: #dc3545; margin-bottom: 1rem; float: right;">Cerrar Panel</button>
<div style="clear: both;"></div>
<div id="loginGate" class="admin-section">
    <h2>Panel de control</h2>
    <input type="password" id="passInput" placeholder="Contraseña" />
    <button id="loginBtn">Entrar</button>
    <p id="loginMsg"></p>
</div>
<div id="adminPanel" style="display:none;" class="admin-section">
    <h2>Administrador Bingo Joker</h2>
    <section class="admin-controls">
        <h3>Controles del Sorteo</h3>
        <button id="startBtn">Iniciar sorteo</button>
        <button id="pauseBtn">Pausar</button>
        <button id="resetBtn">Reiniciar partida</button>
    </section>
    <section class="admin-modes">
        <h3>Modalidades activas</h3>
        <label><input type="checkbox" id="chkLinea" checked> Línea</label>
        <label><input type="checkbox" id="chkColumna" checked> Columna</label>
        <label><input type="checkbox" id="chkFull" checked> Cartón lleno</label>
    </section>
    <section class="admin-sales">
        <h3>Cartones vendidos (<span id="soldCartonsCount">0</span>)</h3>
        <div id="salesList"></div>
    </section>
    <section class="admin-winners">
        <h3>Ganadores</h3>
        <div id="winnersList"></div>
    </section>
</div>
`;

// --- REFERENCIAS A ELEMENTOS DEL PANEL DE ADMIN ---
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

// --- Estado del Juego ---
let cartones = [];
let vendidos = new Set();
let bolas = [];
let ganadores = [];
let bolaDeck = []; // Baraja de bolas para el sorteo (optimización)
let intervalId = null;
let gameActive = false;
let loaded = 0; // Contador de cartones renderizados

// --- NUEVA FUNCIÓN (REFACTORIZACIÓN) ---
// Carga los cartones desde el JSON solo si no han sido cargados previamente.
async function loadCartonesIfNeeded() {
    if (cartones.length > 0) return; // Ya están cargados

    try {
        console.log('Cargando cartones.json...');
        const res = await fetch('./cartones.json');
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        
        const loadedCartones = await res.json();
        cartones = loadedCartones.map(carton => ({
            id: String(carton.id),
            matriz: carton.matriz,
            numeros: carton.matriz.flat() // Array plano para chequeos fáciles
        }));
        console.log(`Cartones cargados: ${cartones.length}`);
    } catch (error) {
        console.error('Error cargando cartones.json:', error);
        showCustomAlert('No se pudieron cargar los cartones. Verifica el archivo y recarga la página.');
        throw error; // Detiene la ejecución si los cartones no cargan
    }
}

// --- NUEVA FUNCIÓN (OPTIMIZACIÓN) ---
// Prepara la baraja de bolas, la baraja y quita las bolas ya extraídas.
function prepareDeck() {
    // Crea un array del 1 al 75
    bolaDeck = Array.from({ length: 75 }, (_, i) => i + 1);

    // Baraja el mazo (algoritmo Fisher-Yates)
    for (let i = bolaDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bolaDeck[i], bolaDeck[j]] = [bolaDeck[j], bolaDeck[i]];
    }

    // Si estamos reanudando una partida, quitamos las bolas que ya salieron
    const bolasExistentes = new Set(bolas);
    bolaDeck = bolaDeck.filter(b => !bolasExistentes.has(b));
    console.log(`Baraja preparada con ${bolaDeck.length} bolas disponibles.`);
}

// --- Funciones principales del juego ---
async function init() {
    console.log('Inicializando aplicación...');
    const data = await getData();
    vendidos = new Set(data.vendidos.map(id => String(id)));
    bolas = data.bolas || [];
    ganadores = data.ganadores || [];

    currentBall.textContent = `Bola actual: ${bolas.at(-1) || '--'}`;
    historyList.textContent = bolas.join(', ');

    await loadCartonesIfNeeded();

    renderCartones(50);
    markAllExistingBalls();
    renderGanadores(); // Muestra los ganadores al cargar

    if (bolas.length > 0 && ganadores.length === 0) {
        gameActive = false; // El juego está pausado, no activo
    } else if (ganadores.length > 0) {
        startBtn.disabled = true;
        pauseBtn.disabled = true;
    }
}

function renderCartones(lote) {
    const frag = document.createDocumentFragment();
    const endIndex = Math.min(loaded + lote, cartones.length);

    for (let i = loaded; i < endIndex; i++) {
        const carton = cartones[i];
        const div = document.createElement('div');
        div.className = 'carton';
        const cartonIdStr = String(carton.id).padStart(3, '0');
        div.dataset.id = cartonIdStr;

        if (vendidos.has(carton.id)) {
            div.classList.add('vendido');
        }
        if (ganadores.some(g => String(g.id) === carton.id)) {
            div.classList.add('winner');
        }

        const numerosHtml = carton.numeros.map(n =>
            `<span class="bingo-cell${n === 0 || bolas.includes(n) ? ' marked' : ''}">${n === 0 ? '★' : n}</span>`
        ).join('');

        div.innerHTML = `<span class="carton-id">#${cartonIdStr}</span><div class="bingo-numbers">${numerosHtml}</div>${!vendidos.has(carton.id) ? `<button data-id="${carton.id}">Comprar</button>` : ''}`;
        frag.appendChild(div);
    }
    cartonesContainer.appendChild(frag);
    loaded = endIndex;
}

function markAllExistingBalls() {
    const bolasMarcadas = new Set(bolas);
    document.querySelectorAll('.bingo-cell').forEach(cell => {
        const num = parseInt(cell.textContent);
        if (bolasMarcadas.has(num)) {
            cell.classList.add('marked');
        }
    });
}

window.addEventListener('scroll', () => {
    if (adminPanelContainer.style.display !== 'block' && window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        renderCartones(50);
    }
});

cartonesContainer.addEventListener('click', async (e) => {
    if (e.target.tagName === 'BUTTON' && e.target.textContent === 'Comprar') {
        const id = e.target.dataset.id;
        showCustomConfirm(`¿Deseas comprar el cartón #${id.padStart(3, '0')}?`, async () => {
            try {
                await saveVenta(id);
                vendidos.add(id);
                const parentDiv = e.target.closest('.carton');
                parentDiv.classList.add('vendido');
                e.target.remove();
                if (adminPanel.style.display === 'block') renderVentas();
                window.open(`https://wa.me/${CONFIG.PHONE_NUMBER}?text=Hola%2C%20quiero%20comprar%20el%20cart%C3%B3n%20%23${id.padStart(3, '0')}`, '_blank');
            } catch (error) {
                console.error('Error en la compra:', error);
                showCustomAlert('No se pudo completar la compra. Inténtalo de nuevo.');
            }
        });
    }
});

searchInput.addEventListener('input', () => {
    const value = searchInput.value.trim();
    if (value.length > 0) {
        const formattedValue = String(parseInt(value)).padStart(3, '0');
        const cartonElement = document.querySelector(`.carton[data-id="${formattedValue}"]`);
        if (cartonElement) {
            cartonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cartonElement.classList.add('highlight');
            setTimeout(() => {
                cartonElement.classList.remove('highlight');
            }, 2500);
        }
    }
});

// --- Funciones del Panel de Admin ---
openAdminBtn.addEventListener('click', () => {
    gameInfoSection.style.display = 'none';
    cartonesContainer.style.display = 'none';
    adminPanelContainer.style.display = 'block';

    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        loginGate.style.display = 'none';
        adminPanel.style.display = 'block';
        initAdminPanelData();
    } else {
        loginGate.style.display = 'block';
        adminPanel.style.display = 'none';
        loginMsg.textContent = '';
        passInput.value = '';
        passInput.focus();
    }
});

closeAdminBtn.addEventListener('click', () => {
    adminPanelContainer.style.display = 'none';
    gameInfoSection.style.display = 'block';
    cartonesContainer.style.display = 'grid';
});

loginBtn.addEventListener('click', async () => {
    // ADVERTENCIA DE SEGURIDAD: Esta contraseña es visible en el código fuente del cliente.
    // Solo es adecuada para entornos de bajo riesgo sin dinero real.
    if (passInput.value === CONFIG.SECRET) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        loginGate.style.display = 'none';
        adminPanel.style.display = 'block';
        await initAdminPanelData();
    } else {
        loginMsg.textContent = 'Contraseña incorrecta';
        loginMsg.style.color = 'red';
    }
});

async function initAdminPanelData() {
    console.log('Cargando datos para el panel de admin...');
    const data = await getData();
    bolas = data.bolas || [];
    vendidos = new Set(data.vendidos.map(id => String(id)));
    ganadores = data.ganadores || [];

    await loadCartonesIfNeeded();
    
    renderVentas();
    renderGanadores();
    updateModalidadesUI();

    if (intervalId) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }
    if (ganadores.length > 0 || bolas.length >= 75) {
        startBtn.disabled = true;
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
        div.textContent = `Cartón #${String(id).padStart(3, '0')}`;
        const btn = document.createElement('button');
        btn.textContent = 'Quitar';
        btn.onclick = () => {
            showCustomConfirm(`¿Quitar el cartón #${String(id).padStart(3, '0')} de la venta?`, async () => {
                try {
                    vendidos.delete(id);
                    await saveVenta(id, true);
                    renderVentas();
                    const cartonDiv = document.querySelector(`.carton[data-id="${String(id).padStart(3, '0')}"]`);
                    if (cartonDiv) {
                        cartonDiv.classList.remove('vendido');
                        if (!cartonDiv.querySelector('button')) {
                            const newButton = document.createElement('button');
                            newButton.dataset.id = id;
                            newButton.textContent = 'Comprar';
                            cartonDiv.appendChild(newButton);
                        }
                    }
                } catch (error) {
                    showCustomAlert('Error al quitar la venta.');
                }
            });
        };
        div.appendChild(btn);
        salesList.appendChild(div);
    });
}

function renderGanadores() {
    winnersList.innerHTML = '';
    document.querySelectorAll('.carton.winner').forEach(c => c.classList.remove('winner')); // Limpia resaltados

    if (ganadores.length === 0) {
        winnersList.textContent = 'No hay ganadores aún.';
        return;
    }

    ganadores.forEach(({ id, modalidad }) => {
        const idStr = String(id).padStart(3, '0');
        const div = document.createElement('div');
        div.className = 'winner-item';
        div.textContent = `Cartón #${idStr} - Ganador: ${modalidad}`;
        winnersList.appendChild(div);
        
        const winnerCartonDiv = document.querySelector(`.carton[data-id="${idStr}"]`);
        if (winnerCartonDiv) {
            winnerCartonDiv.classList.add('winner');
        }
    });
}

function updateModalidadesUI() {
    chkLinea.checked = true;
    chkColumna.checked = true;
    chkFull.checked = true;
}

startBtn.addEventListener('click', () => {
    if (intervalId) return;
    if (ganadores.length > 0) {
        showCustomAlert('La partida ya tiene ganadores. Reinicia para volver a jugar.');
        return;
    }
    prepareDeck(); // Prepara la baraja justo antes de empezar
    intervalId = setInterval(extraerBola, 3000);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    gameActive = true;
    console.log('Sorteo iniciado.');
});

pauseBtn.addEventListener('click', () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        gameActive = false;
        console.log('Sorteo pausado.');
    }
});

resetBtn.addEventListener('click', () => {
    showCustomConfirm('¿Seguro que quieres reiniciar? Se borrarán bolas, ventas y ganadores.', async () => {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        try {
            await resetGame();
            bolas = [];
            ganadores = [];
            vendidos = new Set();
            gameActive = false;
            
            currentBall.textContent = 'Bola actual: --';
            historyList.textContent = '';
            
            loaded = 0;
            cartonesContainer.innerHTML = '';
            await init(); // Reinicializa toda la aplicación desde cero

            renderGanadores();
            renderVentas();
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            showCustomAlert('Partida reiniciada correctamente.');
        } catch (error) {
            console.error('Error reiniciando:', error);
            showCustomAlert('Error al reiniciar la partida.');
        }
    });
});

// --- FUNCIÓN MEJORADA ---
// Extrae una bola de la baraja pre-barajada.
async function extraerBola() {
    if (bolaDeck.length === 0) {
        clearInterval(intervalId);
        intervalId = null;
        gameActive = false;
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        showCustomAlert('Se han extraído todas las bolas. El juego ha terminado.');
        return;
    }

    const bolaNueva = bolaDeck.pop(); // Saca la siguiente bola de la baraja
    bolas.push(bolaNueva);
    await saveBola(bolaNueva);

    currentBall.textContent = `Bola actual: ${bolaNueva}`;
    historyList.textContent = bolas.join(', ');
    markBolaInCartones(bolaNueva);

    const newWinnersFound = await checkGanadores();
    if (newWinnersFound) {
        renderGanadores(); // Actualiza la lista de ganadores en el panel de admin
        clearInterval(intervalId);
        intervalId = null;
        gameActive = false;
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        showCustomAlert('¡Se encontró un ganador! El sorteo se ha detenido.');
    }
}

function markBolaInCartones(bola) {
    document.querySelectorAll('.bingo-cell').forEach(cell => {
        if (parseInt(cell.textContent) === bola) {
            cell.classList.add('marked');
        }
    });
}

// --- FUNCIÓN COMPLETADA ---
// Verifica si hay ganadores según las modalidades activas.
async function checkGanadores() {
    let newWinnerFoundThisTurn = false;
    const modalidades = {
        linea: chkLinea.checked,
        columna: chkColumna.checked,
        full: chkFull.checked
    };
    const bolasMarcadas = new Set(bolas);
    const existingWinnerIds = new Set(ganadores.map(g => String(g.id)));

    for (const carton of cartones) {
        if (!vendidos.has(carton.id) || existingWinnerIds.has(carton.id)) {
            continue; // Saltar si no está vendido o ya ganó
        }

        // 1. Chequeo de Cartón Lleno (Full)
        if (modalidades.full) {
            if (carton.numeros.every(num => num === 0 || bolasMarcadas.has(num))) {
                const winnerData = { id: carton.id, modalidad: 'Cartón Lleno' };
                ganadores.push(winnerData);
                await saveGanador(winnerData);
                newWinnerFoundThisTurn = true;
                existingWinnerIds.add(carton.id); // Evita que gane de nuevo en este turno
                continue; // Pasa al siguiente cartón
            }
        }
        
        // 2. Chequeo de Línea
        if (modalidades.linea) {
            for (const fila of carton.matriz) {
                if (fila.every(num => num === 0 || bolasMarcadas.has(num))) {
                    const winnerData = { id: carton.id, modalidad: 'Línea' };
                    ganadores.push(winnerData);
                    await saveGanador(winnerData);
                    newWinnerFoundThisTurn = true;
                    existingWinnerIds.add(carton.id);
                    break; // Salir del bucle de filas, ya ganó por línea
                }
            }
            if (existingWinnerIds.has(carton.id)) continue;
        }

        // 3. Chequeo de Columna
        if (modalidades.columna) {
            for (let col = 0; col < 5; col++) {
                if (carton.matriz.every(fila => fila[col] === 0 || bolasMarcadas.has(fila[col]))) {
                    const winnerData = { id: carton.id, modalidad: 'Columna' };
                    ganadores.push(winnerData);
                    await saveGanador(winnerData);
                    newWinnerFoundThisTurn = true;
                    existingWinnerIds.add(carton.id);
                    break; // Salir del bucle de columnas
                }
            }
        }
    }
    return newWinnerFoundThisTurn;
}

// Inicializar la aplicación al cargar la página
document.addEventListener('DOMContentLoaded', init);

// Funciones para modales personalizados (debes definirlas o importarlas)
function showCustomAlert(message) {
    alert(message); // Reemplaza con tu implementación de modal
}

function showCustomConfirm(message, callback) {
    if (confirm(message)) { // Reemplaza con tu implementación de modal
        callback();
    }
}
