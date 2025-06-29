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
// Create the main container for the admin panel dynamically
const adminPanelContainer = document.createElement('div');
adminPanelContainer.id = 'adminPanelContainer';
adminPanelContainer.style.display = 'none'; // Hidden by default
document.body.insertBefore(adminPanelContainer, document.querySelector('footer')); // Insert before the footer
// Define the inner HTML of the administration panel
// NOTE: The 'modal' wrapper has been removed to simplify the structure.
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
// --- GET REFERENCES TO ADMIN PANEL ELEMENTS AFTER THEY ARE CREATED ---
// It is crucial to get these references after adminPanelContainer.innerHTML has been set.
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
let currentIndex = 0; // To keep a count of extracted balls from 0 to 74 (for 75 balls)
let gameActive = false; // State to control if the draw is in progress
// --- Main game functions ---
async function init() {
console.log('Initializing application...');
const data = await getData(); // Get initial data from Google Sheets
vendidos = new Set(data.vendidos.map(id => String(id))); // Ensure IDs are strings
bolas = data.bolas;
ganadores = data.ganadores || []; // Ensure winners is an array
// Update UI for current ball and history
currentBall.textContent = Bola actual: ${bolas.at(-1) || '--'};
historyList.textContent = bolas.join(', ');
try {
const res = await fetch('./cartones.json');
if (!res.ok) {
throw new Error(HTTP error! status: ${res.status});
}
const loadedCartones = await res.json();
cartones = loadedCartones.map(carton => ({
id: String(carton.id),
matriz: carton.matriz,
numeros: carton.matriz.flat() // Flatten the matrix for easy checking
}));
console.log('Cartones loaded:', cartones.length);
renderCartones(50); // Render an initial batch of cards
markAllExistingBalls(); // Mark already extracted balls on cards at startup
} catch (error) {
console.error('Error loading cartones.json:', error);
showCustomAlert('No se pudieron cargar los cartones. Por favor, recarga la página o verifica el archivo cartones.json.');
}
// If there are already balls and no winners, assume the game is paused
if (bolas.length > 0 && ganadores.length === 0) {
// We do not start the interval automatically, the admin must do it.
// But if there was a raffle in progress before reloading, the admin will resume it.
currentIndex = bolas.length; // Synchronize the next ball index
} else if (ganadores.length > 0) {
// If there are already winners, the game is over.
startBtn.disabled = true;
pauseBtn.disabled = true;
}
}
let loaded = 0; // Counter for rendered cards
function renderCartones(lote) {
const frag = document.createDocumentFragment();
const endIndex = Math.min(loaded + lote, cartones.length);
for (let i = loaded; i < endIndex; i++) {
const carton = cartones[i];
const div = document.createElement('div');
div.className = 'carton';
// Ensures the card ID has 3 digits, padding with leading zeros
div.dataset.id = String(carton.id).padStart(3, '0');
// Add 'vendido' class if the card has already been sold
if (vendidos.has(div.dataset.id)) {
div.classList.add('vendido');
}
// Generate the HTML for the card numbers
const numerosHtml = carton.matriz.flat().map(n =>
// If n is 0 (free space) or is already in the extracted balls, it is marked
<span class="bingo-cell${n === 0 || bolas.includes(n) ? ' marked' : ''}">${n === 0 ? '★' : n}</span>
).join(''); // '★' for the central free space
div.innerHTML = <span class="carton-id">#${div.dataset.id}</span> <div class="bingo-numbers">${numerosHtml}</div> ${!vendidos.has(div.dataset.id) ?<button data-id="${div.dataset.id}">Comprar</button>: ''};
frag.appendChild(div);
}
cartonesContainer.appendChild(frag);
loaded = endIndex;
}
// Function to mark all existing balls on cards when the page loads
function markAllExistingBalls() {
bolas.forEach(bola => {
const cells = document.querySelectorAll('.bingo-cell');
cells.forEach(cell => {
// Make sure only numbers are compared, not '★'
if (parseInt(cell.textContent) === bola) {
cell.classList.add('marked');
}
});
});
}
// Load more cards when scrolling near the end of the page
window.addEventListener('scroll', () => {
// Only load more cards if the admin panel is NOT visible
if (adminPanelContainer.style.display !== 'block' && window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
renderCartones(50);
}
});
// Listener for the "Comprar" button on the cards
cartonesContainer.addEventListener('click', async (e) => {
if (e.target.tagName === 'BUTTON' && e.target.textContent === 'Comprar') {
const id = e.target.dataset.id;
// Use a custom modal instead of window.confirm
showCustomConfirm(¿Deseas comprar el cartón #${id}?, async () => {
try {
await saveVenta(id); // Save the sale in Google Sheets
vendidos.add(id); // Add the card to the local sold Set
const parentDiv = e.target.parentElement;
parentDiv.classList.add('vendido'); // Visually mark the card as sold
e.target.remove(); // Remove the buy button
window.open(https://wa.me/584141234567?text=Hola%2C%20quiero%20comprar%20el%20cart%C3%B3n%20%23${id}, '_blank');
// If the admin panel is open, update the sales list
if (adminPanel.style.display === 'block') {
renderVentas();
}
} catch (error) {
console.error('Error processing purchase:', error);
showCustomAlert('No se pudo completar la compra. Inténtalo de nuevo.');
}
});
}
});
// Listener for the card search bar
searchInput.addEventListener('input', () => {
const value = searchInput.value.trim().toLowerCase();
// Format the search value to always have 3 digits if it's a number
const formattedValue = value.length > 0 && !isNaN(value) ? String(parseInt(value)).padStart(3, '0') : value;
// If there is a value in the search
if (formattedValue.length > 0) {
const cartonElement = [...cartonesContainer.children].find(div =>
div.dataset.id && div.dataset.id.includes(formattedValue)
);
if (cartonElement) {
cartonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
// Highlight the found card
cartonElement.style.border = '3px solid #00f';
setTimeout(() => {
cartonElement.style.border = '2px solid #e3c200'; // Return to original color
}, 2000);
} else {
console.log('Card not found.');
// Optional: show a message to the user if the card is not found
}
} else {
// If the search is empty, reset the border of all cards
[...cartonesContainer.children].forEach(div => div.style.border = '2px solid #e3c200');
}
});
// --- Admin Panel Functions ---
// Listener to open the admin panel
openAdminBtn.addEventListener('click', () => {
gameInfoSection.style.display = 'none'; // Hide game info
cartonesContainer.style.display = 'none'; // Hide cards
adminPanelContainer.style.display = 'block'; // Show admin panel container
// Logic to display login gate or panel directly
if (sessionStorage.getItem('adminLoggedIn') === 'true') { // Use sessionStorage to maintain session
loginGate.style.display = 'none';
adminPanel.style.display = 'block';
initAdminPanelData(); // Initialize admin data
} else {
loginGate.style.display = 'block';
adminPanel.style.display = 'none';
loginMsg.textContent = '';
passInput.value = '';
passInput.focus();
}
});
// Listener to close the admin panel
closeAdminBtn.addEventListener('click', () => {
adminPanelContainer.style.display = 'none'; // Hide admin panel
gameInfoSection.style.display = 'block'; // Show game info
cartonesContainer.style.display = 'grid'; // Show cards (return to main view)
// We do not log out, we only hide the panel
});
// Listener for the admin login button
loginBtn.addEventListener('click', async () => {
// Direct use of CONFIG.SECRET as password
if (passInput.value === CONFIG.SECRET) {
sessionStorage.setItem('adminLoggedIn', 'true'); // Save login status
loginGate.style.display = 'none';
adminPanel.style.display = 'block';
await initAdminPanelData(); // Load and render panel data
} else {
loginMsg.textContent = 'Contraseña incorrecta';
loginMsg.style.color = 'red';
passInput.value = ''; // Clear field
}
});
// Function to initialize/update data in the administration panel
async function initAdminPanelData() {
console.log('Loading data for admin panel...');
const data = await getData();
bolas = data.bolas;
vendidos = new Set(data.vendidos.map(id => String(id)));
ganadores = data.ganadores || [];
// Ensure cards are loaded if they are not already
if (cartones.length === 0) {
try {
const res = await fetch('./cartones.json');
if (!res.ok) {
throw new Error(HTTP error! status: ${res.status});
}
const loadedCartones = await res.json();
cartones = loadedCartones.map(carton => ({
id: String(carton.id),
matriz: carton.matriz,
numeros: carton.matriz.flat()
}));
console.log('Cards loaded in admin panel:', cartones.length);
} catch (error) {
console.error('Error loading cartones.json for admin:', error);
showCustomAlert('No se pudieron cargar los cartones en el panel admin.');
return;
}
}
renderVentas();     // Update list of sold cards
renderGanadores();  // Update list of winners
currentIndex = bolas.length; // Synchronize current ball index
updateModalidadesUI(); // Ensure checkboxes are synchronized
// Update button status on panel load
if (intervalId) { // If the draw is active
startBtn.disabled = true;
pauseBtn.disabled = false;
gameActive = true;
} else { // If the draw is paused or not started
startBtn.disabled = false;
pauseBtn.disabled = true;
gameActive = false;
}
// Disable buttons if there are already winners
if (ganadores.length > 0) {
startBtn.disabled = true;
pauseBtn.disabled = true;
}
}
// Renders the list of sold cards in the administration panel
function renderVentas() {
salesList.innerHTML = '';
const vendidosArray = Array.from(vendidos).sort((a, b) => parseInt(a) - parseInt(b));
soldCartonsCount.textContent = vendidosArray.length; // Update the counter
if (vendidosArray.length === 0) {
salesList.textContent = 'No hay cartones vendidos aún.';
return;
}
vendidosArray.forEach(id => {
const div = document.createElement('div');
div.className = 'sold-carton-item';
div.textContent = Cartón #${id};
const btn = document.createElement('button');
btn.textContent = 'Quitar';
btn.classList.add('remove-sale-btn');
btn.addEventListener('click', async () => {
// Use custom modal for confirmation
showCustomConfirm(¿Deseas quitar el cartón #${id} de la lista de vendidos?, async () => {
try {
vendidos.delete(id); // Delete from local Set
await saveVenta(id, true); // Send remove action to Sheets
renderVentas(); // Re-render the sales list
// Update the visual status of the card in the main view if visible
const cartonDiv = document.querySelector(.carton[data-id="${id}"]);
if (cartonDiv) {
cartonDiv.classList.remove('vendido');
// If a buy button does not exist, create and add it
if (!cartonDiv.querySelector('button[data-id]')) {
const newButton = document.createElement('button');
newButton.dataset.id = id;
newButton.textContent = 'Comprar';
cartonDiv.appendChild(newButton);
}
}
} catch (error) {
console.error('Error removing sale:', error);
showCustomAlert('No se pudo quitar el cartón. Inténtalo de nuevo.');
}
});
});
div.appendChild(btn);
salesList.appendChild(div);
});
}
// Renders the list of winners in the administration panel
function renderGanadores() {
winnersList.innerHTML = '';
if (ganadores.length === 0) {
winnersList.textContent = 'No hay ganadores aún.';
return;
}
ganadores.forEach(({ id, modalidad }) => {
const div = document.createElement('div');
div.className = 'winner-item';
// Format the winner ID to 3 digits
div.textContent = Cartón #${String(id).padStart(3, '0')} - Ganador: ${modalidad};
// Highlight the winning card in the main view
const winnerCartonDiv = document.querySelector(.carton[data-id="${String(id).padStart(3, '0')}"]);
if (winnerCartonDiv) {
winnerCartonDiv.classList.add('winner'); // Add a CSS class for highlighting
// Ensure the winning card is visible and scrolled into view if the admin panel is closed
if (adminPanelContainer.style.display !== 'block') {
winnerCartonDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
}
winnersList.appendChild(div);
});
}
// Synchronizes the state of the modality checkboxes (can be modified by the admin)
function updateModalidadesUI() {
// For now, they are always checked, but this is where the state could be loaded from Sheets
chkLinea.checked = true;
chkColumna.checked = true; // Renamed to Column to be clearer
chkFull.checked = true;
}
// Listener to start the automatic draw
startBtn.addEventListener('click', () => {
if (intervalId) return; // Prevent multiple intervals
if (ganadores.length > 0) {
showCustomAlert('The game already has winners. Please reset to play again.');
return;
}
intervalId = setInterval(extraerBola, 3000); // Extract ball every 3 seconds
startBtn.disabled = true;
pauseBtn.disabled = false;
gameActive = true;
console.log('Draw started.');
});
// Listener to pause the draw
pauseBtn.addEventListener('click', () => {
if (intervalId) {
clearInterval(intervalId);
intervalId = null;
startBtn.disabled = false;
pauseBtn.disabled = true;
gameActive = false;
console.log('Draw paused.');
}
});
// Listener to reset the game
resetBtn.addEventListener('click', async () => {
// Use custom modal for confirmation
showCustomConfirm('¿Estás seguro de reiniciar la partida? Esto borrará todas las bolas, ventas y ganadores.', async () => {
if (intervalId) {
clearInterval(intervalId); // Stop any active draw
intervalId = null;
}
try {
await resetGame(); // Call the function to reset in Google Sheets
// Reset all frontend state variables
bolas = [];
ganadores = [];
vendidos = new Set();
currentIndex = 0;
gameActive = false;
// Update main game UI
currentBall.textContent = Bola actual: --;
historyList.textContent = '';
// Force reload and re-render of all cards
loaded = 0;
cartonesContainer.innerHTML = ''; // Clear container
// Remove 'marked' and 'winner' class from all number spans and cards
document.querySelectorAll('.bingo-cell.marked').forEach(cell => cell.classList.remove('marked'));
document.querySelectorAll('.carton.vendido').forEach(carton => carton.classList.remove('vendido'));
document.querySelectorAll('.carton.winner').forEach(carton => carton.classList.remove('winner'));
await init(); // Re-initialize the application to load the clean state
// Update admin panel UI
renderGanadores();
renderVentas();
// Reset button states
startBtn.disabled = false;
pauseBtn.disabled = true;
showCustomAlert('Partida reiniciada correctamente.');
} catch (error) {
console.error('Error restarting game:', error);
showCustomAlert('Error al reiniciar la partida. Inténtalo de nuevo.');
}
});
});
// Extracts a new ball and updates game state
async function extraerBola() {
if (bolas.length >= 75) { // All balls have been extracted
clearInterval(intervalId);
intervalId = null;
gameActive = false;
startBtn.disabled = true;
pauseBtn.disabled = true;
showCustomAlert('Se han extraído todas las bolas. El juego ha terminado.');
return;
}
let bolaNueva;
// Generate a list of all possible balls (1 to 75)
const allPossibleBalls = Array.from({ length: 75 }, (_, i) => i + 1);
// Filter out balls that have not yet been extracted
const availableBalls = allPossibleBalls.filter(b => !bolas.includes(b));
if (availableBalls.length === 0) { // In case no balls are left (although 75 is the limit)
clearInterval(intervalId);
intervalId = null;
gameActive = false;
startBtn.disabled = true;
pauseBtn.disabled = true;
showCustomAlert('No quedan bolas disponibles para extraer. El juego ha terminado.');
return;
}
// Select a random ball from the available ones
const randomIndex = Math.floor(Math.random() * availableBalls.length);
bolaNueva = availableBalls[randomIndex];
bolas.push(bolaNueva); // Add the ball to history
currentIndex++; // Increment the index
await saveBola(bolaNueva); // Save the ball in Google Sheets
// Update UI for current ball and history
currentBall.textContent = Bola actual: ${bolaNueva};
historyList.textContent = bolas.join(', ');
historyList.scrollTop = historyList.scrollHeight; // Scroll to the end of history
markBolaInCartones(bolaNueva); // Mark the ball on visible cards
// Check for new winners and update the list
const newWinnersFound = checkGanadores();
renderGanadores();
// Stop the draw if a winner is found
if (newWinnersFound) {
clearInterval(intervalId);
intervalId = null;
gameActive = false;
startBtn.disabled = true;
pauseBtn.disabled = true;
showCustomAlert('¡Hemos encontrado un ganador! La extracción automática se ha detenido.');
}
}
// Marks a specific ball on all visible cards
function markBolaInCartones(bola) {
// Selects all bingo cells on the page
const cells = document.querySelectorAll('.bingo-cell');
cells.forEach(cell => {
// Convert cell text to number for comparison
if (parseInt(cell.textContent) === bola) {
cell.classList.add('marked'); // Add 'marked' class
}
});
}
// Checks if any sold card has won according to active modalities
function checkGanadores() {
let newWinnerFoundThisTurn = false;
const modalidadesActivas = {
linea: chkLinea.checked,
columna: chkColumna.checked,
full: chkFull.checked
};
cartones.forEach(carton => {
// Only check sold cards that are not already winners in a modality
if (!vendidos.has(carton.id)) return;
// Check Line
if (modalidadesActivas.linea && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Línea')) {
if (checkLinea(carton)) {
ganadores.push({ id: carton.id, modalidad: 'Línea' });
saveGanador(carton.id, 'Línea');
console.log(¡Cartón #${carton.id} ha ganado la Línea!);
newWinnerFoundThisTurn = true;
}
}
// Check Column
if (modalidadesActivas.columna && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Columna')) {
if (checkColumna(carton)) {
ganadores.push({ id: carton.id, modalidad: 'Columna' });
saveGanador(carton.id, 'Columna');
console.log(¡Cartón #${carton.id} ha ganado la Columna!);
newWinnerFoundThisTurn = true;
}
}
// Check Full (Full House)
if (modalidadesActivas.full && !ganadores.some(g => String(g.id) === carton.id && g.modalidad === 'Cartón lleno')) {
if (checkFull(carton)) {
ganadores.push({ id: carton.id, modalidad: 'Cartón lleno' });
saveGanador(carton.id, 'Cartón lleno');
console.log(¡Cartón #${carton.id} ha ganado el Cartón Lleno!);
newWinnerFoundThisTurn = true;
}
}
});
return newWinnerFoundThisTurn;
}
// Function to check if there is a complete line on a card
function checkLinea(carton) {
// Iterate over each row of the card matrix (assuming 5x5)
for (let r = 0; r < 5; r++) {
let rowComplete = true;
for (let c = 0; c < 5; c++) {
const numberInCell = carton.matriz[r][c];
// If the cell is 0 (free space), it is considered marked.
// Otherwise, it must be in the list of extracted balls.
if (numberInCell !== 0 && !bolas.includes(numberInCell)) {
rowComplete = false;
break;
}
}
if (rowComplete) return true;
}
return false;
}
// Function to check if there is a complete column on a card
function checkColumna(carton) {
// Iterate over each column of the card matrix (assuming 5x5)
for (let c = 0; c < 5; c++) {
let colComplete = true;
for (let r = 0; r < 5; r++) {
const numberInCell = carton.matriz[r][c];
// If the cell is 0 (free space), it is considered marked.
// Otherwise, it must be in the list of extracted balls.
if (numberInCell !== 0 && !bolas.includes(numberInCell)) {
colComplete = false;
break;
}
}
if (colComplete) return true;
}
return false;
}
// Function to check if the entire card is full (Full House)
function checkFull(carton) {
// Checks if all numbers on the card (including 0 if it's free space)
// are in the list of extracted balls.
return carton.numeros.every(n => n === 0 || bolas.includes(n));
}
// --- Custom Modal Implementation (Replacement for alert/confirm) ---
function showCustomAlert(message) {
const alertModal = document.createElement('div');
alertModal.className = 'custom-modal';
alertModal.innerHTML = <div class="custom-modal-content"> <p>${message}</p> <button class="custom-modal-ok">OK</button> </div>;
document.body.appendChild(alertModal);
alertModal.querySelector('.custom-modal-ok').addEventListener('click', () => {
document.body.removeChild(alertModal);
});
}
function showCustomConfirm(message, onConfirm) {
const confirmModal = document.createElement('div');
confirmModal.className = 'custom-modal';
confirmModal.innerHTML = <div class="custom-modal-content"> <p>${message}</p> <button class="custom-modal-yes">Sí</button> <button class="custom-modal-no">No</button> </div>;
document.body.appendChild(confirmModal);
confirmModal.querySelector('.custom-modal-yes').addEventListener('click', () => {
document.body.removeChild(confirmModal);
onConfirm();
});
confirmModal.querySelector('.custom-modal-no').addEventListener('click', () => {
document.body.removeChild(confirmModal);
});
}
// Initialize the main application on page load
init();
