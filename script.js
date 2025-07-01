// ==================== CONFIG ====================
const API_URL = 'https://script.google.com/macros/s/AKfycbxiphW24FmJe-6ngVwBxl9Dp8mJPcqzBzPQvErXvL13zAMd0af_fh0dcjpEnU0SLZHuGA/exec';
const CARDS_JSON = 'bingo_cards.json';
const PAGE_SIZE = 50;
const DRAW_INTERVAL_MS = 3000;
const ADMIN_SECRET_PROMPT = 'Introduce la contraseña:'; // Este prompt se reemplazará por un modal personalizado
// =================================================

let cardsData = [];
let loadedCount = 0;
let reservedMap = new Map();        // id -> true
let cardsMarks = new Map();         // id -> 5x5 boolean[][]
let winners = new Set();            // id ganadores
let currentMode = 'full';           // modo por defecto
let drawTimer = null;
let remainingNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
let isAdmin = false;
let adminSecret = null;

// DOM refs
const cardsContainer = document.getElementById('cards-container');
const sentinel = document.getElementById('sentinel');
const modal = document.getElementById('modal'); // Modal de reserva
const modalCardIdSpan = document.getElementById('modal-card-id');
const modalCloseBtn = document.getElementById('modal-close');
const reserveForm = document.getElementById('reserve-form');
const controlPanel = document.getElementById('control-panel');

// DOM refs para el nuevo modal de alerta/confirmación
const customAlertModal = document.getElementById('custom-alert-modal');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
const customAlertCancelBtn = document.getElementById('custom-alert-cancel-btn');

// --- FUNCIONES PERSONALIZADAS PARA ALERTAS Y CONFIRMACIONES ---
/**
 * Muestra un modal de alerta personalizado.
 * @param {string} message El mensaje a mostrar.
 */
function showAlert(message) {
    customAlertMessage.textContent = message;
    customAlertCancelBtn.classList.add('hidden'); // Oculta el botón Cancelar
    customAlertModal.classList.remove('hidden'); // Muestra el modal

    // Maneja el clic en OK
    customAlertOkBtn.onclick = () => {
        customAlertModal.classList.add('hidden'); // Oculta el modal
    };
}

/**
 * Muestra un modal de confirmación personalizado.
 * @param {string} message El mensaje a mostrar.
 * @param {function(boolean): void} callback La función a ejecutar con true/false según la elección del usuario.
 */
function showConfirm(message, callback) {
    customAlertMessage.textContent = message;
    customAlertCancelBtn.classList.remove('hidden'); // Muestra el botón Cancelar
    customAlertModal.classList.remove('hidden'); // Muestra el modal

    // Maneja el clic en OK
    customAlertOkBtn.onclick = () => {
        customAlertModal.classList.add('hidden');
        callback(true); // Llama al callback con true
    };

    // Maneja el clic en Cancelar
    customAlertCancelBtn.onclick = () => {
        customAlertModal.classList.add('hidden');
        callback(false); // Llama al callback con false
    };
}

// --- EVENT LISTENERS ---
document.getElementById('btn-start').addEventListener('click', startDraw);
document.getElementById('btn-stop').addEventListener('click', stopDraw);
document.getElementById('btn-reset').addEventListener('click', () => {
    showConfirm('¿Reiniciar partida? Esto borrará todos los números sorteados y ganadores.', (result) => {
        if (result) {
            resetGame();
        }
    });
});
document.getElementById('btn-unreserve-all').addEventListener('click', () => {
    if (!isAdmin) return; // Solo si es admin
    showConfirm('¿Liberar todas las reservas? Esta acción no se puede deshacer.', (result) => {
        if (result) {
            unreserveAll();
        }
    });
});
document.querySelectorAll('.mode').forEach(btn =>
    btn.addEventListener('click', () => chooseMode(btn.dataset.mode))
);
document.getElementById('btn-search').addEventListener('click', searchCard);
document.getElementById('btn-unlock').addEventListener('click', unlockPanel);

// Modal de reserva events
modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
});
reserveForm.addEventListener('submit', handleReserveSubmit);

// Observer for infinite scroll
const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMoreCards();
});
io.observe(sentinel);

// Init
fetchInitialData();

// ---------- CARGA INICIAL ----------
async function fetchInitialData() {
    const resp = await fetch(CARDS_JSON);
    cardsData = await resp.json();

    // Estado de reservas
    try {
        const statResp = await fetch(API_URL + '?action=list'); // No se necesita offset/limit si la API maneja el listado completo
        const { cartones } = await statResp.json();
        cartones.forEach(c => {
            if (c.estado === 'RESERVADO') reservedMap.set(c.id, true);
        });
    } catch (err) {
        console.error('No se pudo obtener estado inicial:', err);
        showAlert('Error al cargar el estado inicial de las reservas.');
    }

    loadMoreCards();
}

function loadMoreCards() {
    const slice = cardsData.slice(loadedCount, loadedCount + PAGE_SIZE);
    slice.forEach(renderCard);
    loadedCount += slice.length;
}

function renderCard(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.id = card.id;

    if (reservedMap.get(card.id)) cardEl.classList.add('reserved');

    const idEl = document.createElement('div');
    idEl.className = 'card-id';
    idEl.textContent = '#' + String(card.id).padStart(4, '0');
    cardEl.appendChild(idEl);

    const gridEl = document.createElement('div');
    gridEl.className = 'grid';

    // matriz de marcas
    const marks = Array.from({ length: 5 }, () => Array(5).fill(false));
    cardsMarks.set(card.id, marks);

    card.grid.forEach((rowArr, r) => {
        rowArr.forEach((val, c) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (val === 'FREE') {
                cell.classList.add('free', 'marked');
                marks[r][c] = true;
            } else {
                cell.dataset.num = val;
            }
            cell.dataset.cardId = card.id;
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.textContent = val;
            gridEl.appendChild(cell);
        });
    });

    cardEl.appendChild(gridEl);
    cardsContainer.appendChild(cardEl);

    // Solo añade el listener de click si el cartón NO está reservado
    if (!cardEl.classList.contains('reserved')) {
        cardEl.addEventListener('click', () => openReserveModal(card.id));
    }
}

// ---------- MODAL DE RESERVA ----------
function openReserveModal(cardId) {
    modalCardIdSpan.textContent = cardId;
    modal.dataset.cardId = cardId;
    reserveForm.reset();
    modal.classList.remove('hidden');
}

// ----------- FUNCIÓN CORREGIDA ------------
async function handleReserveSubmit(e) {
    e.preventDefault();
    const cardId = Number(modal.dataset.cardId);
    const formData = new FormData(reserveForm);

    const nombre = formData.get('nombre')?.trim();
    const apellido = formData.get('apellido')?.trim();
    const telefono = formData.get('telefono')?.trim();

    if (!nombre || !apellido || !telefono) {
        showAlert('Debes completar nombre, apellido y teléfono.');
        return;
    }

    const body = {
        action: 'reserve',
        id: cardId,
        nombre,
        apellido,
        telefono
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // Asegura que el tipo de contenido sea JSON
            body: JSON.stringify(body)
        });
        const json = await res.json();

        if (json.ok) {
            reservedMap.set(cardId, true);
            const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
            if (cardEl) {
                cardEl.classList.add('reserved');
                // Remover el event listener para que no se pueda reservar de nuevo
                cardEl.removeEventListener('click', () => openReserveModal(card.id));
            }
            modal.classList.add('hidden');

            const message = `Hola, deseo reservar el cartón #${cardId} (BINGO JOKER).\nMi nombre es ${nombre} ${apellido} y mi teléfono es ${telefono}`;
            const phone = '584266404042'; // Número de teléfono de WhatsApp
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            showAlert(json.error || 'Ocurrió un error al reservar el cartón.');
        }
    } catch (err) {
        console.error('Error al reservar:', err);
        showAlert('Error al conectar con el servidor. Por favor, intenta de nuevo más tarde.');
    }
}

// ---------- SORTEO ----------
function letterForNumber(n) {
    if (n >= 1 && n <= 15) return 'B';
    if (n >= 16 && n <= 30) return 'I';
    if (n >= 31 && n <= 45) return 'N';
    if (n >= 46 && n <= 60) return 'G';
    if (n >= 61 && n <= 75) return 'O';
    return ''; // En caso de número fuera de rango
}

function startDraw() {
    if (drawTimer) {
        showAlert('El sorteo ya está en curso.');
        return;
    }
    if (!remainingNumbers.length) {
        showAlert('Ya no quedan números por sortear. La partida ha terminado.');
        return;
    }
    drawNumber(); // Primera bola inmediata
    drawTimer = setInterval(drawNumber, DRAW_INTERVAL_MS);
}

function drawNumber() {
    if (!remainingNumbers.length) {
        stopDraw();
        showAlert('¡Todos los números han sido sorteados! La partida ha finalizado.');
        return;
    }
    const idx = Math.floor(Math.random() * remainingNumbers.length);
    const num = remainingNumbers.splice(idx, 1)[0];
    const letter = letterForNumber(num);
    announce(letter + ' ' + num);
    markNumber(num);

    if (isAdmin) {
        // Enviar el número sorteado al backend (Apps Script)
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'recordDraw', numero: num, secret: adminSecret })
        }).catch(err => console.error('Error al registrar sorteo en el backend:', err));
    }
}

function markNumber(num) {
    const cells = document.querySelectorAll(`.cell[data-num="${num}"]`);
    cells.forEach(cell => {
        cell.classList.add('marked');

        const cid = Number(cell.dataset.cardId);
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        const marks = cardsMarks.get(cid);

        if (marks) {
            marks[r][c] = true; // Marca el número en la matriz interna del cartón

            // Verifica si este cartón ha ganado y no ha sido declarado ganador antes
            if (!winners.has(cid) && checkWin(marks)) {
                winners.add(cid); // Añade el cartón a la lista de ganadores
                showAlert('¡BINGO! Cartón #' + cid + ' (' + currentMode.toUpperCase() + ')');
                stopDraw(); // DETENER SORTEO AL DETECTAR UN GANADOR
            }
        }
    });
}

function checkWin(marks) {
    // Verifica si el cartón es un ganador según el modo actual
    switch (currentMode) {
        case 'vertical':
            for (let c = 0; c < 5; c++) {
                let colWin = true;
                for (let r = 0; r < 5; r++) {
                    if (!marks[r][c]) {
                        colWin = false;
                        break;
                    }
                }
                if (colWin) return true;
            }
            break;
        case 'horizontal':
            for (let r = 0; r < 5; r++) {
                let rowWin = true;
                for (let c = 0; c < 5; c++) {
                    if (!marks[r][c]) {
                        rowWin = false;
                        break;
                    }
                }
                if (rowWin) return true;
            }
            break;
        case 'diagonal':
            let mainDiagWin = true;
            let antiDiagWin = true;
            for (let i = 0; i < 5; i++) {
                if (!marks[i][i]) mainDiagWin = false; // Diagonal principal
                if (!marks[i][4 - i]) antiDiagWin = false; // Diagonal inversa
            }
            return mainDiagWin || antiDiagWin;
        case 'full':
        default: // Modo por defecto es "Cartón lleno"
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (!marks[r][c]) return false; // Si alguna celda no está marcada, no es cartón lleno
                }
            }
            return true; // Todas las celdas están marcadas
    }
    return false; // No se encontró un patrón ganador
}

function stopDraw() {
    clearInterval(drawTimer);
    drawTimer = null;
    showAlert('Sorteo detenido.');
}

// ---------- RESTO DE CONTROLES ----------
function resetGame() {
    stopDraw();
    remainingNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    winners.clear();
    // Reinicia las marcas de los cartones, dejando solo la celda FREE marcada si existe
    cardsMarks.forEach((marks, cid) => {
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                // La celda central (2,2) es FREE por defecto en muchos bingos
                marks[r][c] = (r === 2 && c === 2); // Asume que FREE está en (2,2)
            }
        }
    });
    // Remueve la clase 'marked' de todas las celdas, excepto las 'free' (si las hay)
    document.querySelectorAll('.cell.marked').forEach(el => {
        if (!el.classList.contains('free')) {
            el.classList.remove('marked');
        }
    });
    showAlert('Partida reiniciada. ¡A empezar de nuevo!');
}

function chooseMode(mode) {
    currentMode = mode;
    showAlert('Modo de juego seleccionado: ' + mode.toUpperCase());
}

function searchCard() {
    const val = Number(document.getElementById('search-input').value);
    if (!val) {
        showAlert('Por favor, introduce un número de cartón válido para buscar.');
        return;
    }
    const target = document.querySelector(`.card[data-id="${val}"]`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('flash'); // Añade una clase para un efecto visual temporal
        setTimeout(() => target.classList.remove('flash'), 1000); // Remueve la clase después de 1 segundo
    } else {
        showAlert('Cartón no encontrado. Puede que aún no se haya cargado (desplázate hacia abajo) o el ID sea incorrecto.');
    }
}

async function unreserveAll() {
    // Ya se verificó isAdmin en el event listener antes de llamar a esta función
    const body = { action: 'resetAll', secret: adminSecret };
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.ok) {
            reservedMap.clear(); // Limpia el mapa de reservas en el frontend
            // Remueve la clase 'reserved' de todos los cartones en la interfaz
            document.querySelectorAll('.card.reserved').forEach(el => {
                el.classList.remove('reserved');
                // Vuelve a añadir el event listener para reservar
                const cardId = Number(el.dataset.id);
                el.addEventListener('click', () => openReserveModal(cardId));
            });
            showAlert('Todas las reservas han sido liberadas con éxito.');
        } else {
            showAlert(json.error || 'Error al liberar las reservas.');
        }
    } catch (err) {
        console.error('Error al liberar reservas:', err);
        showAlert('Error al conectar con el servidor para liberar reservas.');
    }
}

function unlockPanel() {
    // Usamos prompt aquí ya que es una interacción de inicio de sesión/autenticación
    // y no una alerta de la aplicación. Sin embargo, si la CSP lo bloquea,
    // necesitarías un modal de input personalizado.
    const pwd = prompt(ADMIN_SECRET_PROMPT);
    if (pwd === 'Jrr035$$*') { // La contraseña debe coincidir con ADMIN_SECRET en tu Apps Script
        isAdmin = true;
        adminSecret = pwd;
        controlPanel.classList.remove('locked'); // Desbloquea la interfaz
        showAlert('Panel de control desbloqueado.');
    } else {
        showAlert('Contraseña incorrecta. Acceso denegado.');
    }
}

// ---------- LOCUCIÓN ----------
function announce(text) {
    // Verifica si la API de síntesis de voz está disponible
    if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        // Puedes configurar el idioma si lo deseas, por ejemplo: utter.lang = 'es-ES';
        speechSynthesis.speak(utter);
    } else {
        console.warn('La API de síntesis de voz no está disponible en este navegador.');
    }
}
