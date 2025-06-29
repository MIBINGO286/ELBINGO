// script.js
import { getData, saveBola, saveGanador, saveVenta, resetGame } from './sheetsApi.js';
import { CONFIG } from './config.js';

// Elementos del juego principal
const cartonesContainer = document.getElementById('cartonesContainer');
const searchInput = document.getElementById('searchInput');
const currentBall = document.getElementById('currentBall');
const historyList = document.getElementById('historyList');
const openAdminBtn = document.getElementById('openAdminBtn');

// Elementos del Modal de Administrador
const adminModal = document.getElementById('adminModal');
const closeAdminBtn = document.getElementById('closeAdminBtn');
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
const soldCartonsCount = document.getElementById('soldCartonsCount'); // Nuevo elemento para el contador
const winnersList = document.getElementById('winnersList');

let cartones = [];
let vendidos = new Set();
let bolas = [];
let ganadores = [];
let intervalId = null;
let currentIndex = 0;

// --- Funciones del juego principal ---

async function init() {
  const data = await getData();
  vendidos = new Set(data.vendidos.map(id => String(id))); // Asegura que los IDs sean strings
  bolas = data.bolas;
  currentBall.textContent = `Bola actual: ${bolas.at(-1) || '--'}`;
  historyList.textContent = bolas.join(', ');

  try {
    const res = await fetch('./cartones.json');
    const loadedCartones = await res.json();
    // Preprocesar cartones: asegurar IDs como string y matriz aplanada para búsquedas
    cartones = loadedCartones.map(carton => ({
      id: String(carton.id),
      matriz: carton.matriz, // Mantener la matriz para las comprobaciones de línea/columna
      numeros: carton.matriz.flat() // Crear una versión plana para checkFull
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
  // Carga más cartones al hacer scroll cerca del final
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) { // Mayor margen para cargar antes
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
        vendidos.add(id); // Añadir a la lista local de vendidos
        const parentDiv = e.target.parentElement;
        parentDiv.classList.add('vendido');
        e.target.remove(); // Quitar el botón de comprar
        window.open(`https://wa.me/584141234567?text=Hola%2C%20quiero%20comprar%20el%20cart%C3%B3n%20%23${id}`, '_blank');
        // Si el panel admin está abierto, se debería actualizar también
        if (adminPanel.style.display === 'block') {
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
        cartonElement.style.border = '2px solid #e3c200'; // Volver al color original
      }, 2000);
    } else {
      // Puedes añadir un mensaje en la UI si el cartón no se encuentra
      console.log('Cartón no encontrado.');
    }
  } else {
    // Si el campo de búsqueda está vacío, quizás quitar cualquier resaltado
    [...cartonesContainer.children].forEach(div => div.style.border = '2px solid #e3c200');
  }
});

// --- Funciones del Modal de Administrador ---

openAdminBtn.addEventListener('click', () => {
  adminModal.style.display = 'block'; // Mostrar el modal
  // Si ya ha iniciado sesión, mostrar el panel, si no, el login
  if (passInput.value === CONFIG.SECRET && loginGate.style.display === 'none') {
      adminPanel.style.display = 'block';
      loginGate.style.display = 'none';
      initAdminPanelData(); // Solo carga los datos si ya está logueado
  } else {
      loginPanel.style.display = 'block';
      adminPanel.style.display = 'none';
  }
});

closeAdminBtn.addEventListener('click', () => {
  adminModal.style.display = 'none'; // Ocultar el modal
});

window.addEventListener('click', (event) => {
  if (event.target === adminModal) {
    adminModal.style.display = 'none'; // Cierra el modal si se hace clic fuera del contenido
  }
});

loginBtn.addEventListener('click', async () => {
    if (passInput.value === CONFIG.SECRET) {
        loginGate.style.display = 'none';
        adminPanel.style.display = 'block';
        await initAdminPanelData(); // Cargar datos al iniciar sesión
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
    updateModalidadesUI(); // Asegura que los checkboxes se muestren como están
}

function renderVentas() {
    salesList.innerHTML = '';
    const vendidosArray = Array.from(vendidos).sort((a, b) => parseInt(a) - parseInt(b));

    soldCartonsCount.textContent = vendidosArray.length; // Actualiza el contador

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
                renderVentas(); // Re-renderiza la lista de ventas y el contador
                // También actualiza la vista principal del jugador si el cartón quitado está visible
                const cartonDiv = document.querySelector(`.carton .carton-id[title="Cartón #${id}"]`);
                if (cartonDiv && cartonDiv.parentElement) {
                    cartonDiv.parentElement.classList.remove('vendido');
                    // Opcional: Volver a añadir el botón "Comprar" si es necesario
                }
                // Si el cartón se muestra en la pantalla principal y fue desvendido, actualiza su estado
                const mainCartonDiv = document.querySelector(`.carton .carton-id:text("${id}")`)?.closest('.carton');
                const existingButton = mainCartonDiv?.querySelector('button');

                if (mainCartonDiv && mainCartonDiv.classList.contains('vendido')) {
                    mainCartonDiv.classList.remove('vendido');
                    if (!existingButton) { // Si no hay botón, lo añade
                        const newButton = document.createElement('button');
                        newButton.dataset.id = id;
                        newButton.textContent = 'Comprar';
                        mainCartonDiv.appendChild(newButton);
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

// Event Listeners para los botones de control del sorteo (dentro del panel admin)
startBtn.addEventListener('click', () => {
    if (intervalId) return;
    intervalId = setInterval(extraerBola, 3000); // Extrae una bola cada 3 segundos
    startBtn.disabled = true; // Deshabilita el botón de inicio
    pauseBtn.disabled = false; // Habilita el botón de pausa
    console.log('Sorteo iniciado.');
});

pauseBtn.addEventListener('click', () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        startBtn.disabled = false; // Habilita el botón de inicio
        pauseBtn.disabled = true; // Deshabilita el botón de pausa
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
        // Limpiar la interfaz del juego principal
        currentBall.textContent = `Bola actual: --`;
        historyList.textContent = '';
        // Re-renderizar todos los cartones para desmarcarlos y restablecer botones de compra
        loaded = 0; // Reinicia el contador de carga de cartones
        cartonesContainer.innerHTML = ''; // Limpia el contenedor de cartones
        renderCartones(50); // Vuelve a cargar los primeros 50 cartones
        // Actualizar interfaz del panel admin
        renderGanadores();
        renderVentas();
        startBtn.disabled = false;
        pauseBtn.disabled = false; // Asegurar que ambos estén habilitados o deshabilitados correctamente
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
    const availableBalls = Array.from({ length: 75 }, (_, i) => i + 1).filter(b => !bolas.includes(b));

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

    // Actualizar la interfaz del juego principal
    currentBall.textContent = `Bola actual: ${bolaNueva}`;
    historyList.textContent = bolas.join(', ');
    markBolaInCartones(bolaNueva); // Marca la bola en los cartones visibles

    checkGanadores(); // Verificar ganadores con la nueva bola
    renderGanadores(); // Actualizar lista de ganadores en el panel admin
}

function markBolaInCartones(bola) {
    // Busca y marca la bola en todos los cartones visibles
    const cells = document.querySelectorAll(`.bingo-cell`);
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
        // Si ya ganó full, no necesita más chequeos para este cartón
        const yaGanoFull = ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Cartón lleno');
        if (!vendidos.has(carton.id) || yaGanoFull) return;

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
        if (modalidadesActivas.full && !yaGanoFull) {
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
        if (carton.matriz[r].every(n => bolas.includes(n))) return true;
    }
    return false;
}

function checkColumna(carton) {
    if (!carton.matriz || carton.matriz.length === 0 || carton.matriz[0].length === 0) return false;

    for (let c = 0; c < carton.matriz[0].length; c++) {
        let colCompleta = true;
        for (let r = 0; r < carton.matriz.length; r++) {
            // Asegurarse de que la celda exista antes de intentar acceder a ella
            if (carton.matriz[r] && typeof carton.matriz[r][c] !== 'undefined') {
                if (!bolas.includes(carton.matriz[r][c])) {
                    colCompleta = false;
                    break;
                }
            } else {
                colCompleta = false; // Columna incompleta si la celda no existe
                break;
            }
        }
        if (colCompleta) return true;
    }
    return false;
}

function checkFull(carton) {
    return carton.numeros.every(n => bolas.includes(n));
}

// Inicializa la aplicación principal al cargar
init();
