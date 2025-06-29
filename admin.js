// admin.js
import { getData, saveBola, saveGanador, saveVenta, resetGame } from './sheetsApi.js';
import { CONFIG } from './config.js'; // Importar CONFIG para la contraseña

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
const salesCountDisplay = document.createElement('p'); // Elemento para el contador de ventas
salesList.before(salesCountDisplay); // Lo insertamos antes de la lista de ventas

const winnersList = document.getElementById('winnersList');

let bolas = [];
let vendidos = new Set();
let ganadores = [];
let cartones = [];
let intervalId = null;
let currentIndex = 0;

loginBtn.addEventListener('click', () => {
    // Usar la contraseña del archivo de configuración
    if (passInput.value === CONFIG.SECRET) { // O puedes usar CONFIG.ADMIN_PASS_HASH y comparar un hash
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
    // Asegúrate de que los IDs de vendidos sean strings para la comparación consistente
    vendidos = new Set(data.vendidos.map(id => String(id)));
    ganadores = data.ganadores || [];

    try {
        const res = await fetch('./cartones.json');
        const loadedCartones = await res.json();
        // Normaliza los IDs de cartones a string y prepara la lista de números planos
        cartones = loadedCartones.map(carton => ({
            id: String(carton.id),
            matriz: carton.matriz,
            numeros: carton.matriz.flat() // Añade una versión plana de los números para checkFull y otras comprobaciones
        }));
    } catch (error) {
        console.error('Error al cargar cartones.json:', error);
        alert('No se pudieron cargar los cartones. Consulta la consola para más detalles.');
        return; // Detener la inicialización si los cartones no se cargan
    }

    renderVentas();
    renderGanadores();
    currentIndex = bolas.length; // Sincroniza el índice de la bola actual
    updateModalidadesUI(); // Asegura que los checkboxes se muestren como están

    // Mueve los event listeners de los botones de control aquí para que solo se añadan una vez
    startBtn.addEventListener('click', () => {
        if (intervalId) return; // Evita múltiples intervalos
        intervalId = setInterval(extraerBola, 3000); // Velocidad de extracción cada 3 segundos
        console.log('Sorteo iniciado.');
    });

    pauseBtn.addEventListener('click', () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
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
            renderGanadores();
            renderVentas(); // Volver a renderizar las ventas para actualizar el contador
            alert('Partida reiniciada correctamente.');
        }
    });
}

function renderVentas() {
    salesList.innerHTML = '';
    const vendidosArray = Array.from(vendidos).sort((a, b) => parseInt(a) - parseInt(b)); // Ordenar numéricamente

    salesCountDisplay.textContent = `Total de cartones vendidos: ${vendidosArray.length}`;

    if (vendidosArray.length === 0) {
        salesList.textContent = 'No hay cartones vendidos aún.';
        return;
    }

    vendidosArray.forEach(id => {
        const div = document.createElement('div');
        div.className = 'sold-carton-item'; // Clase para estilos si es necesario
        div.textContent = `Cartón #${id}`;
        const btn = document.createElement('button');
        btn.textContent = 'Quitar';
        btn.classList.add('remove-sale-btn'); // Clase para estilos del botón
        btn.addEventListener('click', async () => {
            const confirmRemove = window.confirm(`¿Deseas quitar el cartón #${id} de la lista de vendidos?`);
            if (confirmRemove) {
                vendidos.delete(id); // Eliminar del Set local
                await saveVenta(id, true); // true significa remover
                renderVentas(); // Volver a renderizar la lista para reflejar el cambio
                // Nota: Esto solo quita de la lista de vendidos. No "desmarca" el cartón en la vista del jugador si ya se cargó.
                // Para eso, necesitarías recargar la página del jugador o implementar una comunicación en tiempo real.
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
        div.className = 'winner-item'; // Clase para estilos si es necesario
        div.textContent = `Cartón #${id} - Ganador: ${modalidad}`;
        winnersList.appendChild(div);
    });
}

function updateModalidadesUI() {
    // Por defecto, todas las modalidades están activas al iniciar el panel.
    // Si quisieras persistir el estado de estas checkboxes, necesitarías guardarlas en Sheets también.
    chkLinea.checked = true;
    chkColumna.checked = true;
    chkFull.checked = true;
}

async function extraerBola() {
    if (currentIndex >= 75) {
        clearInterval(intervalId);
        intervalId = null;
        alert('Se han extraído todas las bolas. El juego ha terminado.');
        return;
    }
    let bolaNueva;
    const availableBalls = Array.from({ length: 75 }, (_, i) => i + 1).filter(b => !bolas.includes(b));

    if (availableBalls.length === 0) {
        clearInterval(intervalId);
        intervalId = null;
        alert('No quedan bolas disponibles para extraer.');
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableBalls.length);
    bolaNueva = availableBalls[randomIndex];

    bolas.push(bolaNueva);
    currentIndex++;
    await saveBola(bolaNueva); // Guardar la bola en Sheets
    console.log(`Bola extraída: ${bolaNueva}. Total de bolas: ${bolas.length}`);

    // Notificar al cliente sobre la nueva bola (idealmente con WebSockets o un polling más frecuente)
    // Por ahora, el cliente debe hacer polling o recargar para ver la nueva bola.
    checkGanadores(); // Verificar si hay nuevos ganadores con la nueva bola
    renderGanadores(); // Actualizar la lista de ganadores en la interfaz de admin

    // También actualiza la bola actual y el historial en la interfaz del cliente si estuviera activa.
    // Esto es un placeholder para una actualización real en el cliente.
    document.getElementById('currentBall') && (document.getElementById('currentBall').textContent = `Bola actual: ${bolaNueva}`);
    document.getElementById('historyList') && (document.getElementById('historyList').textContent = bolas.join(', '));
}

function checkGanadores() {
    const modalidadesActivas = {
        linea: chkLinea.checked,
        columna: chkFull.checked, // Nota: el checkbox con id "chkColumna" debe corresponder a la modalidad de columna
        full: chkColumna.checked // Nota: el checkbox con id "chkFull" debe corresponder a la modalidad de full
    };
    // Pequeño ajuste: Asumiendo que `chkColumna` es para columna y `chkFull` para cartón lleno.
    // Si los IDs en tu HTML fueran `chkColumna` y `chkFull` al revés, necesitarías ajustar aquí.
    // Para mayor claridad, el HTML tiene `chkColumna` y `chkFull`.

    // Copiamos la lista de ganadores actual para evitar que un cartón que ya ganó en este ciclo
    // sea evaluado de nuevo para la misma modalidad en el mismo ciclo.
    // Sin embargo, si un cartón puede ganar "Línea" y "Cartón Lleno" en la misma bola, esta lógica lo permitirá.

    cartones.forEach(carton => {
        // Solo revisamos cartones vendidos y que no hayan ganado *todas* las modalidades posibles aún
        const yaGanoFull = ganadores.some(g => g.id === carton.id && g.modalidad === 'Cartón lleno');
        if (!vendidos.has(carton.id) || yaGanoFull) return;

        let ganoEnEsteCiclo = false;

        // Comprobar Línea
        if (modalidadesActivas.linea && !ganadores.some(g => g.id === carton.id && g.modalidad === 'Línea')) {
            if (checkLinea(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Línea' });
                saveGanador(carton.id, 'Línea');
                console.log(`¡Cartón #${carton.id} ha ganado la Línea!`);
                ganoEnEsteCiclo = true;
            }
        }

        // Comprobar Columna
        // Asegúrate de que chkColumna realmente controla la verificación de la columna
        if (chkColumna.checked && !ganadores.some(g => g.id === carton.id && g.modalidad === 'Columna')) {
             if (checkColumna(carton)) {
                 ganadores.push({ id: carton.id, modalidad: 'Columna' });
                 saveGanador(carton.id, 'Columna');
                 console.log(`¡Cartón #${carton.id} ha ganado la Columna!`);
                 ganoEnEsteCiclo = true;
             }
         }

        // Comprobar Cartón lleno (Full)
        // Asegúrate de que chkFull realmente controla la verificación de cartón lleno
        if (chkFull.checked && !yaGanoFull) {
            if (checkFull(carton)) {
                ganadores.push({ id: carton.id, modalidad: 'Cartón lleno' });
                saveGanador(carton.id, 'Cartón lleno');
                console.log(`¡Cartón #${carton.id} ha ganado el Cartón Lleno!`);
                // Si gana full, ya no necesita ser revisado más
                ganoEnEsteCiclo = true;
            }
        }
    });
}

function checkLinea(carton) {
    // La matriz de carton contiene las filas, cada fila es un array de números
    for (let r = 0; r < carton.matriz.length; r++) {
        // Verificar si todos los números de la fila actual están en las bolas extraídas
        if (carton.matriz[r].every(n => bolas.includes(n))) {
            return true;
        }
    }
    return false;
}

function checkColumna(carton) {
    // La matriz de carton: carton.matriz[fila][columna]
    // Iterar sobre cada columna
    for (let c = 0; c < carton.matriz[0].length; c++) {
        let colCompleta = true;
        // Iterar sobre cada fila en la columna actual
        for (let r = 0; r < carton.matriz.length; r++) {
            // Si un número de la columna no está en las bolas extraídas, la columna no está completa
            if (!bolas.includes(carton.matriz[r][c])) {
                colCompleta = false;
                break;
            }
        }
        if (colCompleta) return true; // Si la columna está completa, retornar true
    }
    return false;
}

function checkFull(carton) {
    // `carton.numeros` es un array plano de todos los números del cartón
    return carton.numeros.every(n => bolas.includes(n));
}

// Inicializar el panel de administración al cargar si ya tiene la contraseña
// Esta es una consideración de UX/seguridad. Por ahora, se requiere el login siempre.
// Si se desea que persista la sesión, se necesitaría localStorage o similar.
// initAdmin(); // Esto se llama después del login
