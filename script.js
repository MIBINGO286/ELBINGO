/*********************** CONFIG ***********************/
const WEBAPP_URL  = 'https://script.google.com/macros/s/AKfycbxKH9xP-YZ6UXdTw9MtjeF9C19lMlXH0k-oMrbXiWqhrhoN0xJJPPpa6NOGFJo7x_5G/exec';
const SHEET_URL   = 'https://opensheet.elk.sh/1YeHvkb5ag9hdL1VZTtXyi3PKwio7RWQ5tr-WaDKd52g/RESERVAS'; // ← tu hoja
const BLOQUE      = 50; // Cantidad de cartones a cargar por bloque
const WHATS_APP   = '584266404042'; // Número de WhatsApp (no usado en este script, pero mantenido)
const PANEL_PASS  = 'joker123'; // Contraseña para el panel de control (ojo: esto es inseguro en frontend)

/******************* VARIABLES GLOBALES *******************/
let cartones = []; // Almacena todos los cartones disponibles
let vendidos = new Set(); // Almacena los IDs de los cartones vendidos/reservados
let pintados = 0; // Contador de cartones renderizados
// Variables de sorteo (no relacionadas con el problema de reserva, pero mantenidas)
let drawn    = new Set();
let remainingBalls = Array.from({length:75},(_,i)=>i+1);
let drawInterval = null;

/******************* REFERENCIAS DOM *******************/
const contenedor     = document.getElementById('cartones-container');
const loader         = document.getElementById('loader');
const modal          = document.getElementById('modal');
const formRes        = document.getElementById('form-reserva');
const spanNum        = document.getElementById('carton-numero');
const inputID        = document.getElementById('input-id');
const msgReserva     = document.getElementById('msg-reserva');
const btnReservar    = document.getElementById('btn-reservar'); // Referencia al botón de reserva

// Referencias del panel de control (asumiendo que están en tu HTML)
const panel          = document.getElementById('panel');
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const btnUnlock      = document.getElementById('btn-unlock');
const passwordInput  = document.getElementById('password-input');
const panelContent   = document.getElementById('panel-content');

// Referencias de sorteo
const btnStartDraw = document.getElementById('btn-start-draw');
const btnStopDraw  = document.getElementById('btn-stop-draw');
const currentBall  = document.getElementById('current-ball');
const historyList  = document.getElementById('history');
const btnRestart   = document.getElementById('btn-restart');

// Referencias de búsqueda y unreservar
const searchInput    = document.getElementById('search-input');
const inputUnreserve = document.getElementById('input-unreserve');
const btnUnreserve   = document.getElementById('btn-unreserve');


/* ---------- INIT ---------- */
// Se ejecuta cuando el DOM está completamente cargado
window.addEventListener('DOMContentLoaded', async () => {
  try {
    cartones = await fetch('cartones.json').then(r => r.json());
    await actualizarVendidos(); // Cargar los cartones ya reservados desde la hoja
    ordenarCartones();
    pintarBloque(); // Pintar el primer bloque de cartones
    observarScroll(); // Iniciar el observador para cargar más cartones al hacer scroll
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    alert("Hubo un error al cargar los cartones. Por favor, recarga la página.");
  }
});

/* ---------- HELPERS ---------- */
function ordenarCartones() {
  cartones.sort((a,b)=>a.id-b.id);
}

function letterFor(n){
  if(n<=15) return 'B';
  if(n<=30) return 'I';
  if(n<=45) return 'N';
  if(n<=60) return 'G';
  return 'O';
}

/* ---------- RESERVAS ---------- */
// Obtiene la lista de cartones reservados de Google Sheets a través de OpenSheet
async function actualizarVendidos(){
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Filtra y mapea solo los IDs de cartones que están en estado 'RESERVADO'
    vendidos = new Set(data.filter(r => String(r.Estado).toUpperCase() === 'RESERVADO').map(r => String(r.ID)));

    // Actualiza el DOM para reflejar los cambios en el estado de los cartones
    contenedor.querySelectorAll('.carton').forEach(carta => {
      const cartonId = carta.dataset.id;
      if (vendidos.has(cartonId)) {
        carta.classList.add('vendido');
        carta.onclick = null; // Deshabilita el clic para cartones vendidos
      } else {
        carta.classList.remove('vendido');
        carta.onclick = () => abrirModal(cartonId); // Habilita el clic para cartones disponibles
      }
    });

  } catch(e) {
    console.warn('Error al obtener datos de la hoja de cálculo (actualizarVendidos):', e);
    // Podrías mostrar un mensaje al usuario si esto falla críticamente
  }
}

// Crea el elemento HTML para un cartón
function crearCarton({id, grid}){
  const art = document.createElement('article');
  art.className = 'carton';
  art.dataset.id = id; // Almacena el ID del cartón en un atributo de datos
  art.innerHTML = `<h3>#${id.toString().padStart(4,'0')}</h3>
    <div class="grid">
      ${grid.flat().map(c=>`<div class="cell">${c==='FREE'?'★':c}</div>`).join('')}
    </div>`;
  
  // Si el cartón ya está en la lista de vendidos (obtenida al inicio), lo marca
  if (vendidos.has(String(id))) {
    art.classList.add('vendido');
    art.onclick = null; // No permite hacer clic en cartones vendidos
  } else {
    art.onclick = () => abrirModal(id); // Permite abrir el modal de reserva
  }
  return art;
}

// Pinta un bloque de cartones en el contenedor
function pintarBloque(){
  const frag = document.createDocumentFragment();
  for(let i=pintados; i<pintados+BLOQUE && i<cartones.length; i++){
    frag.appendChild(crearCarton(cartones[i]));
  }
  pintados += BLOQUE;
  contenedor.appendChild(frag);
  // Oculta el loader si ya se pintaron todos los cartones
  if(pintados >= cartones.length) loader.style.display = 'none';
}

// Observa el scroll para cargar más cartones cuando el usuario llega al final
function observarScroll(){
  const sentinel = document.createElement('div'); // Elemento "centinela" al final del contenedor
  sentinel.id = 'scroll-sentinel'; // Añade un ID para posible depuración CSS
  contenedor.appendChild(sentinel);
  
  // Crea un IntersectionObserver para detectar cuando el centinela es visible
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && pintados < cartones.length) {
      // Si el centinela es visible y aún quedan cartones por pintar
      pintarBloque(); // Pinta el siguiente bloque de cartones
    }
  }, {
    root: null, // El viewport como área de observación
    threshold: 0.1 // Disparar cuando el 10% del centinela es visible
  }).observe(sentinel); // Empieza a observar el centinela
}

// Muestra el modal de reserva
function abrirModal(id){
  inputID.value = id;
  spanNum.textContent = id;
  msgReserva.classList.add('hidden'); // Oculta mensajes previos
  modal.classList.remove('hidden'); // Muestra el modal
  btnReservar.disabled = false; // Asegura que el botón esté habilitado al abrir
}

// Oculta el modal de reserva y reinicia el formulario
function cerrarModal(){
  modal.classList.add('hidden');
  formRes.reset();
  btnReservar.disabled = false; // Asegura que el botón esté habilitado para futuras reservas
}
window.cerrarModal = cerrarModal; // Hace que la función sea accesible globalmente (para onclick en HTML)

// Maneja el envío del formulario de reserva
formRes.addEventListener('submit', async (e) => {
  e.preventDefault(); // Evita el envío tradicional del formulario
  
  const fd = new FormData(formRes); // Recoge los datos del formulario

  const cartonId = fd.get('ID');

  /* Validación local: Rápida comprobación si ya está marcado como vendido */
  if(vendidos.has(cartonId)) {
    alert(`El cartón #${cartonId} ya fue reservado o vendido. Por favor, elige otro.`);
    btnReservar.disabled = false; // Re-habilita el botón
    cerrarModal(); // Cierra el modal ya que el cartón no está disponible
    return;
  }

  /* Deshabilitar botón para evitar múltiples envíos */
  btnReservar.disabled = true;

  /* Enviar datos al Google Apps Script (backend) */
  try {
    const response = await fetch(WEBAPP_URL, { method:'POST', body: fd });
    // Es crucial leer la respuesta del servidor para saber si la operación fue exitosa
    const message = await response.text(); 

    console.log("Respuesta del servidor GAS:", message); // Para depuración

    if (message.includes('RESERVADO exitosamente')) {
      // Si la reserva fue exitosa según el servidor:
      vendidos.add(cartonId); // Añade el ID al conjunto local de vendidos
      const carta = contenedor.querySelector(`.carton[data-id="${cartonId}"]`);
      if(carta) {
        carta.classList.add('vendido'); // Añade la clase visual
        carta.onclick = null; // Deshabilita el clic en el cartón ahora reservado
      }
      msgReserva.textContent = '✅ ¡Reserva enviada!';
      msgReserva.classList.remove('hidden');
      setTimeout(cerrarModal, 1200); // Cierra el modal después de un breve mensaje
    } else {
      // Si el servidor indica que hubo un problema (ej. ya estaba reservado por otro)
      alert('Error al reservar: ' + message);
      btnReservar.disabled = false; // Re-habilita el botón
      cerrarModal(); // Cierra el modal para que el usuario pueda intentar de nuevo
      // Es buena idea re-actualizar la lista de vendidos si hubo un conflicto
      await actualizarVendidos(); 
    }
  } catch(err) {
    console.error('Error en la solicitud Fetch de reserva:', err);
    alert('Error de conexión o al procesar la reserva. Intenta nuevamente.');
    btnReservar.disabled = false; // Re-habilita el botón
    cerrarModal(); // Cierra el modal
  }
});

/* ---------- PANEL DE CONTROL ---------- */
// Muestra/oculta el panel de control
btnTogglePanel.addEventListener('click', ()=> panel.classList.toggle('hidden'));

/* Desbloqueo simple con contraseña (¡ADVERTENCIA: Esto es inseguro para un entorno real!) */
btnUnlock.addEventListener('click', ()=>{
  if(passwordInput.value === PANEL_PASS){ // Utiliza la constante PANEL_PASS
    panelContent.classList.remove('hidden'); // Muestra el contenido del panel
    passwordInput.value=''; // Limpia la contraseña
  } else {
    alert('Contraseña incorrecta');
  }
});

/* ---------- SORTEO AUTOMÁTICO (Funcionalidad de sorteo, no relacionada con reservas) ---------- */
function drawBall(){
  if(remainingBalls.length===0){
    stopDraw();
    alert('¡Ya no quedan bolas!');
    return;
  }
  const idx = Math.floor(Math.random()*remainingBalls.length);
  const num = remainingBalls.splice(idx,1)[0];
  const letra = letterFor(num);
  currentBall.textContent = `${letra} - ${num}`;
  const li = document.createElement('li');
  li.textContent = `${letra}${num}`;
  historyList.prepend(li);
}

function startDraw(){
  if(drawInterval) return;
  drawBall(); /* primera bola inmediata */
  drawInterval = setInterval(drawBall, 4000); // Saca una bola cada 4 segundos
  btnStartDraw.disabled = true;
  btnStopDraw.disabled  = false;
}
function stopDraw(){
  clearInterval(drawInterval);
  drawInterval = null;
  btnStartDraw.disabled = false;
  btnStopDraw.disabled  = true;
}
btnStartDraw.addEventListener('click', startDraw);
btnStopDraw .addEventListener('click', stopDraw);

/* Reiniciar partida de bingo */
btnRestart.addEventListener('click', ()=>{
  if(confirm('¿Reiniciar partida de bingo (sorteo de bolas)? Esto no afecta las reservas de cartones.')){
    stopDraw();
    remainingBalls = Array.from({length:75},(_,i)=>i+1); // Restablece las bolas
    historyList.innerHTML=''; // Limpia el historial
    currentBall.textContent=''; // Limpia la bola actual
  }
});

/* ---------- UNRESERVAR / LIBERAR CARTÓN ---------- */
btnUnreserve.addEventListener('click', async () => {
  const idToUnreserve = inputUnreserve.value.trim();
  if(!idToUnreserve) {
    alert('Por favor, ingresa el ID del cartón a liberar.');
    return;
  }

  // Confirmación antes de liberar
  if (!confirm(`¿Estás seguro de que deseas liberar el cartón #${idToUnreserve}?`)) {
      return;
  }

  const fd = new FormData();
  fd.append('ID', idToUnreserve);
  fd.append('Estado', 'LIBRE'); // Enviar el estado "LIBRE" al backend

  try {
    const response = await fetch(WEBAPP_URL, { method:'POST', body: fd });
    const message = await response.text();

    console.log("Respuesta de liberación del servidor GAS:", message); // Para depuración

    if (message.includes('LIBERADO exitosamente')) {
      // Si la liberación fue exitosa según el servidor:
      vendidos.delete(idToUnreserve); // Elimina el ID del conjunto local de vendidos
      const carta = contenedor.querySelector(`.carton[data-id="${idToUnreserve}"]`);
      if(carta) {
        carta.classList.remove('vendido'); // Remueve la clase visual
        carta.onclick = () => abrirModal(idToUnreserve); // Habilita el clic nuevamente
      }
      alert('Cartón liberado: ' + message);
    } else {
      // Si el servidor indica que hubo un problema al liberar
      alert('Error al liberar cartón: ' + message);
    }
  } catch(err) {
    console.error('Error en la solicitud Fetch (liberar):', err);
    alert('Error de conexión o al liberar el cartón. Intenta nuevamente.');
  } finally {
      inputUnreserve.value = ''; // Limpia el campo después de intentar liberar
  }
});

/* ---------- BUSCADOR DE CARTONES ---------- */
searchInput.addEventListener('input', ()=>{
  const q = searchInput.value.trim().toLowerCase(); // Obtiene el valor y lo pone en minúsculas
  contenedor.querySelectorAll('.carton').forEach(card=>{
    // Compara el ID del cartón con la consulta de búsqueda
    card.style.display = card.dataset.id.toLowerCase().startsWith(q) ? 'block' : 'none';
  });
});
      
