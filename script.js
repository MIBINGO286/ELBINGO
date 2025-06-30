// script.js
// Importa las funciones para interactuar con Google Sheets y la configuración.
import { getData, saveBola, saveGanador, saveVenta, resetGame } from './sheetsApi.js';
import { CONFIG } from './config.js';

// --- Elementos del juego principal (interfaz visible para el jugador) ---
const gameInfoSection = document.getElementById('gameInfo'); // Sección de información del juego (bola actual, historial)
const cartonesContainer = document.getElementById('cartonesContainer'); // Contenedor para mostrar los cartones de bingo
const searchInput = document.getElementById('searchInput'); // Campo de búsqueda de cartones
const currentBall = document.getElementById('currentBall'); // Elemento para mostrar la bola actual
const historyList = document.getElementById('historyList'); // Elemento para mostrar el historial de bolas
const openAdminBtn = document.getElementById('openAdminBtn'); // Botón para abrir el panel de administración

// --- Configuración y elementos del Panel de Administrador (Creados dinámicamente) ---
// Creamos el contenedor principal para el panel de administración.
// Este div será insertado en el DOM y contendrá toda la interfaz del panel.
const adminPanelContainer = document.createElement('div');
adminPanelContainer.id = 'adminPanelContainer'; // Asigna un ID al contenedor
adminPanelContainer.style.display = 'none'; // Oculto por defecto al cargar la página
// Inserta el contenedor justo antes del pie de página en el HTML.
document.body.insertBefore(adminPanelContainer, document.querySelector('footer'));

// Define el HTML interno del panel de administración.
// Este HTML se inyecta en 'adminPanelContainer' al cargar el script.
adminPanelContainer.innerHTML = `
  <button id="closeAdminBtn" class="admin-link close-button" style="background-color: #dc3545; margin-bottom: 1rem; float: right;">Cerrar Panel</button>
  <div style="clear: both;"></div> <!-- Limpia el flotado del botón -->
  
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

// --- OBTENER REFERENCIAS A LOS ELEMENTOS DEL PANEL DESPUÉS DE QUE SE HAN CREADO ---
// Es crucial obtener estas referencias *después* de que adminPanelContainer.innerHTML se haya establecido.
// Si se intentan obtener antes, los elementos no existirán en el DOM y las referencias serán null.
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


// --- Variables de estado del juego ---
let cartones = []; // Almacena todos los cartones cargados desde cartones.json
let vendidos = new Set(); // Conjunto de IDs de cartones que han sido vendidos
let bolas = []; // Array de las bolas que ya han sido extraídas
let ganadores = []; // Array de objetos {id, modalidad} de los cartones ganadores
let intervalId = null; // ID del intervalo para el sorteo automático (para poder pausarlo/detenerlo)
let currentIndex = 0; // Índice para llevar un conteo de las bolas extraídas (de 0 a 74 para 75 bolas)
let gameActive = false; // Bandera para indicar si el sorteo está en curso

// --- Funciones del juego principal (visibles para el usuario) ---

/**
 * Inicializa la aplicación: carga datos de Sheets, cartones.json y renderiza la UI.
 */
async function init() {
  console.log('Inicializando la aplicación...');
  // Obtiene los datos persistentes (ventas, bolas, ganadores) de Google Sheets.
  const data = await getData();
  vendidos = new Set(data.vendidos.map(id => String(id).padStart(3, '0'))); // Asegura IDs de 3 dígitos
  bolas = data.bolas;
  ganadores = data.ganadores || []; // Asegura que ganadores sea un array, no undefined

  // Actualiza la interfaz de usuario con la última bola extraída y el historial.
  currentBall.textContent = `Bola actual: ${bolas.at(-1) || '--'}`;
  historyList.textContent = bolas.join(', ');
  historyList.scrollTop = historyList.scrollHeight; // Desplaza al final del historial

  try {
    // Intenta cargar los cartones desde el archivo cartones.json.
    const res = await fetch('./cartones.json');
    if (!res.ok) { // Si la respuesta HTTP no es exitosa (ej. 404 Not Found)
        throw new Error(`HTTP error! status: ${res.status} - No se pudo encontrar cartones.json.`);
    }
    const loadedCartones = await res.json();
    // Mapea los cartones para asegurar que los IDs son strings y aplanando la matriz de números.
    cartones = loadedCartones.map(carton => ({
      id: String(carton.id).padStart(3, '0'), // Formatea el ID a 3 dígitos con ceros iniciales
      matriz: carton.matriz,
      numeros: carton.matriz.flat() // Convierte la matriz 2D en un array 1D para fácil comprobación
    }));
    console.log('Cartones cargados:', cartones.length);
    renderCartones(50); // Renderiza un lote inicial de 50 cartones
    markAllExistingBalls(); // Marca las bolas que ya están en el historial en los cartones
  } catch (error) {
    console.error('Error al cargar cartones.json:', error);
    showCustomAlert('No se pudieron cargar los cartones. Por favor, verifica el archivo cartones.json y recarga la página.');
  }

  // Si ya hay bolas extraídas y no hay ganadores registrados, el juego está en pausa.
  if (bolas.length > 0 && ganadores.length === 0) {
      currentIndex = bolas.length; // Sincroniza el índice de la próxima bola a extraer
  } else if (ganadores.length > 0) {
      // Si ya hay ganadores, el juego ha terminado. Deshabilita los controles de sorteo.
      startBtn.disabled = true;
      pauseBtn.disabled = true;
      gameActive = false; // Asegura que el juego no se inicie automáticamente
  }
}

let loaded = 0; // Contador de cuántos cartones se han renderizado hasta el momento.
/**
 * Renderiza un lote de cartones en el contenedor principal.
 * @param {number} lote La cantidad de cartones a renderizar en esta llamada.
 */
function renderCartones(lote) {
  const frag = document.createDocumentFragment(); // Usa un DocumentFragment para mejor rendimiento
  const endIndex = Math.min(loaded + lote, cartones.length); // Calcula el índice final para este lote

  for (let i = loaded; i < endIndex; i++) {
    const carton = cartones[i];
    const div = document.createElement('div');
    div.className = 'carton';
    div.dataset.id = carton.id; // Asigna el ID formateado como data-id

    // Añade la clase 'vendido' si el cartón ya está en la lista de vendidos.
    if (vendidos.has(carton.id)) {
      div.classList.add('vendido');
    }

    // Genera el HTML para cada número del cartón.
    const numerosHtml = carton.numeros.map(n =>
      // Si el número es 0 (espacio libre 'FREE') o ya ha sido extraído, se marca.
      `<span class="bingo-cell${n === 0 || bolas.includes(n) ? ' marked' : ''}">${n === 0 ? '★' : n}</span>`
    ).join(''); // Une los spans para formar el bloque de números.

    // Construye el contenido HTML completo del cartón.
    div.innerHTML = `
      <span class="carton-id">#${carton.id}</span> <!-- Muestra el ID del cartón -->
      <div class="bingo-numbers">${numerosHtml}</div> <!-- Contenedor de los números -->
      ${!vendidos.has(carton.id) ? `<button data-id="${carton.id}">Comprar</button>` : ''} <!-- Botón de compra si no está vendido -->
    `;
    frag.appendChild(div); // Añade el cartón al fragmento.
  }
  cartonesContainer.appendChild(frag); // Añade el fragmento (con todos los cartones) al DOM.
  loaded = endIndex; // Actualiza el contador de cartones cargados.
}

/**
 * Marca todas las bolas ya extraídas en los cartones visibles.
 * Esto es útil al cargar la página para reflejar el estado actual del juego.
 */
function markAllExistingBalls() {
    // Selecciona todas las celdas de bingo en la página.
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        // Convierte el texto de la celda a número para comparar.
        // Se ignora el caracter '★' ya que no es un número de bola.
        const cellValue = parseInt(cell.textContent);
        if (!isNaN(cellValue) && bolas.includes(cellValue)) {
            cell.classList.add('marked'); // Añade la clase 'marked' si la bola ya fue extraída.
        }
    });
}


// Listener para cargar más cartones al hacer scroll cerca del final de la página.
window.addEventListener('scroll', () => {
  // Solo carga más cartones si el panel de administración NO está visible
  // y el usuario está cerca del final de la página.
  if (adminPanelContainer.style.display !== 'block' && window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    renderCartones(50); // Carga 50 cartones adicionales.
  }
});

// Listener para el evento de clic en el contenedor de cartones (delegación de eventos).
cartonesContainer.addEventListener('click', async (e) => {
  // Verifica si el clic fue en un botón con el texto "Comprar".
  if (e.target.tagName === 'BUTTON' && e.target.textContent === 'Comprar') {
    const id = e.target.dataset.id; // Obtiene el ID del cartón desde el atributo data-id.
    // Muestra un modal de confirmación personalizado en lugar de window.confirm.
    showCustomConfirm(`¿Deseas comprar el cartón #${id}?`, async () => {
      try {
        await saveVenta(id); // Guarda la venta en Google Sheets.
        vendidos.add(id); // Añade el cartón al Set de vendidos local.
        const parentDiv = e.target.parentElement;
        parentDiv.classList.add('vendido'); // Marca el cartón como vendido visualmente.
        e.target.remove(); // Quita el botón de "Comprar".
        // Abre un enlace de WhatsApp con un mensaje pre-llenado.
        window.open(`https://wa.me/584141234567?text=Hola%2C%20quiero%20comprar%20el%20cart%C3%B3n%20%23${id}`, '_blank');
        
        // Si el panel de administración está abierto, actualiza la lista de ventas.
        if (adminPanel.style.display === 'block') {
          renderVentas();
        }
      } catch (error) {
        console.error('Error al procesar la compra:', error);
        showCustomAlert('No se pudo completar la compra. Inténtalo de nuevo.');
      }
    });
  }
});

// Listener para el campo de búsqueda de cartones.
searchInput.addEventListener('input', () => {
  const value = searchInput.value.trim().toLowerCase(); // Obtiene el valor de búsqueda
  // Formatea el valor de búsqueda para que siempre tenga 3 dígitos si es un número,
  // útil para buscar IDs como "001" o "010".
  const formattedValue = value.length > 0 && !isNaN(value) ? String(parseInt(value)).padStart(3, '0') : value;

  if (formattedValue.length > 0) {
    // Busca el elemento del cartón que coincida con el ID formateado.
    const cartonElement = [...cartonesContainer.children].find(div =>
      div.dataset.id && div.dataset.id.includes(formattedValue)
    );
    if (cartonElement) {
      // Desplaza el cartón encontrado a la vista.
      cartonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Resalta el cartón temporalmente.
      cartonElement.style.border = '3px solid #00f';
      setTimeout(() => {
        cartonElement.style.border = '2px solid #e3c200'; // Vuelve al color original después de 2 segundos.
      }, 2000);
    } else {
      console.log('Cartón no encontrado.');
      // Opcional: mostrar un mensaje al usuario si el cartón no se encuentra.
    }
  } else {
    // Si la búsqueda está vacía, restablece el borde de todos los cartones.
    [...cartonesContainer.children].forEach(div => div.style.border = '2px solid #e3c200');
  }
});

// --- Funciones del Panel de Administrador ---

// Listener para el botón "Panel de control" en el encabezado.
openAdminBtn.addEventListener('click', () => {
  gameInfoSection.style.display = 'none'; // Oculta la sección de información del juego.
  cartonesContainer.style.display = 'none'; // Oculta el contenedor de cartones.
  adminPanelContainer.style.display = 'block'; // Muestra el contenedor del panel de administración.

  // Lógica para mostrar la puerta de login o el panel directamente si ya está logueado.
  // Utiliza sessionStorage para mantener el estado de login entre recargas de página.
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
      loginGate.style.display = 'none';
      adminPanel.style.display = 'block';
      initAdminPanelData(); // Inicializa y carga los datos del panel.
  } else {
      loginGate.style.display = 'block';
      adminPanel.style.display = 'none';
      loginMsg.textContent = ''; // Limpia cualquier mensaje de login previo.
      passInput.value = ''; // Limpia el campo de contraseña.
      passInput.focus(); // Pone el foco en el campo de contraseña.
  }
});

// Listener para el botón "Cerrar Panel" dentro del panel de administración.
closeAdminBtn.addEventListener('click', () => {
  adminPanelContainer.style.display = 'none'; // Oculta el panel de administración.
  gameInfoSection.style.display = 'block'; // Muestra la sección de información del juego.
  cartonesContainer.style.display = 'grid'; // Muestra los cartones (restaura la vista principal).
  // La sesión del administrador no se cierra, solo se oculta el panel.
});

// Listener para el botón de login del administrador.
loginBtn.addEventListener('click', async () => {
    // Compara la contraseña ingresada con la contraseña secreta de CONFIG.
    if (passInput.value === CONFIG.SECRET) {
        sessionStorage.setItem('adminLoggedIn', 'true'); // Marca al administrador como logueado.
        loginGate.style.display = 'none'; // Oculta la puerta de login.
        adminPanel.style.display = 'block'; // Muestra el panel de administración.
        await initAdminPanelData(); // Carga y renderiza los datos del panel.
    } else {
        loginMsg.textContent = 'Contraseña incorrecta'; // Muestra mensaje de error.
        loginMsg.style.color = 'red';
        passInput.value = ''; // Limpia el campo de contraseña.
    }
});

/**
 * Inicializa y actualiza los datos que se muestran en el panel de administración.
 * Se llama al loguearse y al reiniciar la partida.
 */
async function initAdminPanelData() {
    console.log('Cargando datos para el panel de administración...');
    const data = await getData(); // Obtiene los datos más recientes de Sheets.
    bolas = data.bolas;
    vendidos = new Set(data.vendidos.map(id => String(id).padStart(3, '0'))); // Asegura IDs de 3 dígitos
    ganadores = data.ganadores || [];

    // Asegura que los cartones estén cargados si aún no lo están (para evitar recargas innecesarias).
    if (cartones.length === 0) {
        try {
            const res = await fetch('./cartones.json');
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status} - No se pudo encontrar cartones.json para admin.`);
            }
            const loadedCartones = await res.json();
            cartones = loadedCartones.map(carton => ({
                id: String(carton.id).padStart(3, '0'),
                matriz: carton.matriz,
                numeros: carton.matriz.flat()
            }));
            console.log('Cartones cargados en admin panel:', cartones.length);
        } catch (error) {
            console.error('Error al cargar cartones.json para admin:', error);
            showCustomAlert('No se pudieron cargar los cartones en el panel admin. Verifica el archivo.');
            return;
        }
    }

    renderVentas();     // Actualiza la lista de cartones vendidos en el panel.
    renderGanadores();  // Actualiza la lista de ganadores en el panel.
    currentIndex = bolas.length; // Sincroniza el índice de la bola actual extraída.
    updateModalidadesUI(); // Asegura que los checkboxes de modalidades estén sincronizados.

    // Actualiza el estado de los botones de control de sorteo al cargar el panel.
    if (intervalId) { // Si el sorteo está activo (hay un intervalo corriendo)
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        gameActive = true;
    } else { // Si el sorteo está pausado o no iniciado
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        gameActive = false;
    }

    // Deshabilitar botones de sorteo si ya hay ganadores (la partida ha terminado).
    if (ganadores.length > 0) {
        startBtn.disabled = true;
        pauseBtn.disabled = true;
    }
}

/**
 * Renderiza la lista de cartones vendidos en el panel de administración.
 * Actualiza el contador de cartones vendidos.
 */
function renderVentas() {
    salesList.innerHTML = ''; // Limpia la lista actual.
    // Convierte el Set de vendidos a un array, lo ordena y lo muestra.
    const vendidosArray = Array.from(vendidos).sort((a, b) => parseInt(a) - parseInt(b));

    soldCartonsCount.textContent = vendidosArray.length; // Actualiza el contador de cartones vendidos.

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
        btn.classList.add('remove-sale-btn'); // Clase para el botón de quitar.
        btn.addEventListener('click', async () => {
            // Muestra un modal de confirmación personalizado para quitar la venta.
            showCustomConfirm(`¿Deseas quitar el cartón #${id} de la lista de vendidos?`, async () => {
                try {
                    vendidos.delete(id); // Elimina el cartón del Set local de vendidos.
                    await saveVenta(id, true); // Envía la acción de quitar al Google Sheet (remove=true).
                    renderVentas(); // Vuelve a renderizar la lista de ventas actualizada.

                    // Actualiza el estado visual del cartón en la vista principal si es visible.
                    const cartonDiv = document.querySelector(`.carton[data-id="${id}"]`);
                    if (cartonDiv) {
                        cartonDiv.classList.remove('vendido'); // Quita la clase 'vendido'.
                        // Si no existe un botón de "Comprar", lo crea y lo añade de nuevo.
                        if (!cartonDiv.querySelector('button[data-id]')) {
                            const newButton = document.createElement('button');
                            newButton.dataset.id = id;
                            newButton.textContent = 'Comprar';
                            cartonDiv.appendChild(newButton);
                        }
                    }
                } catch (error) {
                    console.error('Error al quitar venta:', error);
                    showCustomAlert('No se pudo quitar el cartón. Inténtalo de nuevo.');
                }
            });
        });
        div.appendChild(btn);
        salesList.appendChild(div);
    });
}

/**
 * Renderiza la lista de cartones ganadores en el panel de administración.
 * También aplica la clase 'winner' a los cartones ganadores en la interfaz principal.
 */
function renderGanadores() {
    winnersList.innerHTML = ''; // Limpia la lista actual.
    if (ganadores.length === 0) {
        winnersList.textContent = 'No hay ganadores aún.';
        return;
    }
    ganadores.forEach(({ id, modalidad }) => {
        const div = document.createElement('div');
        div.className = 'winner-item';
        // Formatea el ID del ganador a 3 dígitos para mostrar.
        div.textContent = `Cartón #${String(id).padStart(3, '0')} - Ganador: ${modalidad}`;

        // Resalta el cartón ganador en la vista principal.
        const winnerCartonDiv = document.querySelector(`.carton[data-id="${String(id).padStart(3, '0')}"]`);
        if (winnerCartonDiv) {
            winnerCartonDiv.classList.add('winner'); // Añade la clase CSS 'winner' para resaltado y animación.
            // Asegura que el cartón ganador sea visible y se desplace a la vista si el panel de admin está cerrado.
            if (adminPanelContainer.style.display !== 'block') {
                winnerCartonDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        winnersList.appendChild(div);
    });
}

/**
 * Sincroniza el estado de los checkboxes de modalidades en el panel de administración.
 * Actualmente, se mantienen siempre marcados (pueden ser modificados por el administrador).
 */
function updateModalidadesUI() {
    // Si en el futuro se guardara el estado de estas modalidades en Sheets,
    // aquí es donde se cargarían. Por ahora, asumen estar activos por defecto.
    chkLinea.checked = true;
    chkColumna.checked = true;
    chkFull.checked = true;
}

// Listener para el botón "Iniciar sorteo".
startBtn.addEventListener('click', () => {
    if (intervalId) return; // Evita iniciar múltiples intervalos.
    if (ganadores.length > 0) { // Si ya hay ganadores, no se puede iniciar un nuevo sorteo.
        showCustomAlert('La partida ya tiene ganadores. Por favor, reinicia para jugar de nuevo.');
        return;
    }
    intervalId = setInterval(extraerBola, 3000); // Inicia la extracción de bolas cada 3 segundos.
    startBtn.disabled = true; // Deshabilita el botón de inicio.
    pauseBtn.disabled = false; // Habilita el botón de pausa.
    gameActive = true;
    console.log('Sorteo iniciado.');
});

// Listener para el botón "Pausar".
pauseBtn.addEventListener('click', () => {
    if (intervalId) { // Si hay un sorteo activo.
        clearInterval(intervalId); // Detiene el intervalo.
        intervalId = null; // Reinicia el ID del intervalo.
        startBtn.disabled = false; // Habilita el botón de inicio.
        pauseBtn.disabled = true; // Deshabilita el botón de pausa.
        gameActive = false;
        console.log('Sorteo pausado.');
    }
});

// Listener para el botón "Reiniciar partida".
resetBtn.addEventListener('click', async () => {
    // Muestra un modal de confirmación personalizado para reiniciar la partida.
    showCustomConfirm('¿Estás seguro de reiniciar la partida? Esto borrará todas las bolas, ventas y ganadores.', async () => {
        if (intervalId) { // Si hay un sorteo activo, lo detiene.
            clearInterval(intervalId);
            intervalId = null;
        }
        
        try {
            await resetGame(); // Llama a la función para reiniciar los datos en Google Sheets.
            
            // Restablece todas las variables de estado del frontend a su estado inicial.
            bolas = [];
            ganadores = [];
            vendidos = new Set();
            currentIndex = 0;
            gameActive = false;

            // Actualiza la UI del juego principal.
            currentBall.textContent = `Bola actual: --`;
            historyList.textContent = '';
            historyList.scrollTop = 0;
            
            // Forzar la recarga y re-renderizado de todos los cartones para desmarcarlos.
            loaded = 0;
            cartonesContainer.innerHTML = ''; // Limpia el contenedor de cartones.
            // Elimina la clase 'marked' y 'winner' de todos los elementos visuales.
            document.querySelectorAll('.bingo-cell.marked').forEach(cell => cell.classList.remove('marked'));
            document.querySelectorAll('.carton.vendido').forEach(carton => carton.classList.remove('vendido'));
            document.querySelectorAll('.carton.winner').forEach(carton => carton.classList.remove('winner'));


            await init(); // Re-inicializa la aplicación para cargar el estado limpio desde Sheets y renderizar.

            // Actualiza la UI del panel de administración.
            renderGanadores();
            renderVentas();
            
            // Restablece el estado de los botones de control del sorteo.
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            showCustomAlert('Partida reiniciada correctamente.');
        } catch (error) {
            console.error('Error al reiniciar la partida:', error);
            showCustomAlert('Error al reiniciar la partida. Inténtalo de nuevo.');
        }
    });
});

/**
 * Extrae una nueva bola de bingo y actualiza el estado del juego.
 */
async function extraerBola() {
    if (bolas.length >= 75) { // Si ya se extrajeron todas las 75 bolas.
        clearInterval(intervalId);
        intervalId = null;
        gameActive = false;
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        showCustomAlert('Se han extraído todas las bolas. El juego ha terminado.');
        return;
    }

    let bolaNueva;
    // Crea un array con todas las bolas posibles (del 1 al 75).
    const allPossibleBalls = Array.from({ length: 75 }, (_, i) => i + 1);
    // Filtra las bolas que aún no han sido extraídas.
    const availableBalls = allPossibleBalls.filter(b => !bolas.includes(b));

    if (availableBalls.length === 0) { // Si no quedan bolas disponibles para extraer (caso extremo).
        clearInterval(intervalId);
        intervalId = null;
        gameActive = false;
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        showCustomAlert('No quedan bolas disponibles para extraer. El juego ha terminado.');
        return;
    }

    // Selecciona una bola aleatoria de las disponibles.
    const randomIndex = Math.floor(Math.random() * availableBalls.length);
    bolaNueva = availableBalls[randomIndex];

    bolas.push(bolaNueva); // Añade la nueva bola al historial de bolas extraídas.
    currentIndex++; // Incrementa el contador de bolas extraídas.
    await saveBola(bolaNueva); // Guarda la bola en Google Sheets.

    // Actualiza la interfaz de usuario con la bola actual y el historial.
    currentBall.textContent = `Bola actual: ${bolaNueva}`;
    historyList.textContent = bolas.join(', ');
    historyList.scrollTop = historyList.scrollHeight; // Desplaza el historial hacia abajo.
    markBolaInCartones(bolaNueva); // Marca la bola en los cartones visibles.

    // Comprueba si hay nuevos ganadores después de extraer la bola.
    const newWinnersFound = checkGanadores();
    renderGanadores(); // Actualiza la lista de ganadores en el panel de admin.

    // Detiene el sorteo si se encuentra un nuevo ganador.
    if (newWinnersFound) {
        clearInterval(intervalId); // Detiene la extracción automática de bolas.
        intervalId = null;
        gameActive = false;
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        showCustomAlert('¡Hemos encontrado un ganador! La extracción automática se ha detenido.');
    }
}

/**
 * Marca una bola específica en todas las celdas de los cartones visibles.
 * @param {number} bola El número de la bola a marcar.
 */
function markBolaInCartones(bola) {
    // Selecciona todas las celdas de bingo en la página.
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        // Compara el número de la celda con la bola extraída.
        // Se asegura de que la celda no contenga el caracter '★' del espacio libre.
        const cellValue = parseInt(cell.textContent);
        if (!isNaN(cellValue) && cellValue === bola) {
            cell.classList.add('marked'); // Añade la clase 'marked' para el estilo visual.
        }
    });
}

/**
 * Comprueba si algún cartón vendido ha ganado según las modalidades activas.
 * @returns {boolean} True si se encontró al menos un nuevo ganador en esta comprobación, false en caso contrario.
 */
function checkGanadores() {
    let newWinnerFoundThisTurn = false; // Bandera para saber si se encontró un nuevo ganador en esta ronda.
    // Obtiene el estado de las modalidades de victoria desde los checkboxes del panel de admin.
    const modalidadesActivas = {
        linea: chkLinea.checked,
        columna: chkColumna.checked,
        full: chkFull.checked
    };

    cartones.forEach(carton => {
        // Solo comprueba cartones que han sido vendidos y que aún no han ganado en la modalidad actual.
        if (!vendidos.has(carton.id)) return; // Ignora cartones no vendidos.

        // Comprobar Línea
        if (modalidadesActivas.linea && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Línea')) {
            if (checkLinea(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Línea' });
                saveGanador(carton.id, 'Línea'); // Guarda el ganador en Sheets.
                console.log(`¡Cartón #${carton.id} ha ganado la Línea!`);
                newWinnerFoundThisTurn = true; // Se encontró un nuevo ganador.
            }
        }

        // Comprobar Columna
        if (modalidadesActivas.columna && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Columna')) {
            if (checkColumna(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Columna' });
                saveGanador(carton.id, 'Columna');
                console.log(`¡Cartón #${carton.id} ha ganado la Columna!`);
                newWinnerFoundThisTurn = true;
            }
        }

        // Comprobar Cartón lleno (Full House)
        if (modalidadesActivas.full && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Cartón lleno')) {
            if (checkFull(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Cartón lleno' });
                saveGanador(carton.id, 'Cartón lleno');
                console.log(`¡Cartón #${carton.id} ha ganado el Cartón Lleno!`);
                newWinnerFoundThisTurn = true;
            }
        }
    });
    return newWinnerFoundThisTurn; // Retorna si se encontró algún nuevo ganador en esta ejecución.
}

/**
 * Verifica si un cartón tiene una línea completa.
 * Asume una matriz de 5x5 y que el 0 representa el espacio libre.
 * @param {object} carton El objeto cartón con su matriz de números.
 * @returns {boolean} True si hay una línea completa, false en caso contrario.
 */
function checkLinea(carton) {
    for (let r = 0; r < 5; r++) { // Itera sobre cada fila (r de row)
        let rowComplete = true;
        for (let c = 0; c < 5; c++) { // Itera sobre cada columna (c de column)
            const numberInCell = carton.matriz[r][c];
            // Si la celda no es el espacio libre (0) y su número no está en las bolas extraídas,
            // la fila no está completa.
            if (numberInCell !== 0 && !bolas.includes(numberInCell)) {
                rowComplete = false;
                break; // Sale del bucle de columnas
            }
        }
        if (rowComplete) return true; // Si la fila está completa, retorna true.
    }
    return false; // Si ninguna fila está completa.
}

/**
 * Verifica si un cartón tiene una columna completa.
 * Asume una matriz de 5x5 y que el 0 representa el espacio libre.
 * @param {object} carton El objeto cartón con su matriz de números.
 * @returns {boolean} True si hay una columna completa, false en caso contrario.
 */
function checkColumna(carton) {
    for (let c = 0; c < 5; c++) { // Itera sobre cada columna (c de column)
        let colComplete = true;
        for (let r = 0; r < 5; r++) { // Itera sobre cada fila (r de row)
            const numberInCell = carton.matriz[r][c];
            // Si la celda no es el espacio libre (0) y su número no está en las bolas extraídas,
            // la columna no está completa.
            if (numberInCell !== 0 && !bolas.includes(numberInCell)) {
                colComplete = false;
                break; // Sale del bucle de filas
            }
        }
        if (colComplete) return true; // Si la columna está completa, retorna true.
    }
    return false; // Si ninguna columna está completa.
}

/**
 * Verifica si un cartón está completamente lleno (todos los números marcados).
 * Asume que el 0 representa el espacio libre.
 * @param {object} carton El objeto cartón con su array aplanado de números.
 * @returns {boolean} True si el cartón está lleno, false en caso contrario.
 */
function checkFull(carton) {
    // Comprueba si *todos* los números del cartón (incluyendo el 0 si es espacio libre)
    // están en la lista de bolas extraídas.
    return carton.numeros.every(n => n === 0 || bolas.includes(n));
}


// --- Implementación de Modales Personalizados (Reemplazo de alert/confirm) ---

/**
 * Muestra una alerta personalizada en lugar de la función nativa alert().
 * @param {string} message El mensaje a mostrar en la alerta.
 */
function showCustomAlert(message) {
    const alertModal = document.createElement('div');
    alertModal.className = 'custom-modal'; // Aplica la clase CSS para el modal
    alertModal.innerHTML = `
        <div class="custom-modal-content">
            <p>${message}</p>
            <button class="custom-modal-ok">OK</button>
        </div>
    `;
    document.body.appendChild(alertModal); // Añade el modal al cuerpo del documento.

    // Listener para cerrar el modal cuando se hace clic en "OK".
    alertModal.querySelector('.custom-modal-ok').addEventListener('click', () => {
        document.body.removeChild(alertModal);
    });
}

/**
 * Muestra un modal de confirmación personalizado en lugar de la función nativa confirm().
 * @param {string} message El mensaje a mostrar en la confirmación.
 * @param {function} onConfirm La función a ejecutar si el usuario confirma (hace clic en "Sí").
 */
function showCustomConfirm(message, onConfirm) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'custom-modal'; // Aplica la clase CSS para el modal
    confirmModal.innerHTML = `
        <div class="custom-modal-content">
            <p>${message}</p>
            <button class="custom-modal-yes">Sí</button>
            <button class="custom-modal-no">No</button>
        </div>
    `;
    document.body.appendChild(confirmModal); // Añade el modal al cuerpo del documento.

    // Listener para el botón "Sí": cierra el modal y ejecuta la función onConfirm.
    confirmModal.querySelector('.custom-modal-yes').addEventListener('click', () => {
        document.body.removeChild(confirmModal);
        onConfirm();
    });

    // Listener para el botón "No": simplemente cierra el modal.
    confirmModal.querySelector('.custom-modal-no').addEventListener('click', () => {
        document.body.removeChild(confirmModal);
    });
}


// Inicializa la aplicación principal al cargar el script.
// Esto asegura que todo el juego se configure correctamente cuando la página esté lista.
init();
