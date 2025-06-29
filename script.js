import { registrarVenta, obtenerBolas } from './sheetsApi.js';

let allCartones = [];
let displayed = 0;
const batchSize = 50;
let drawnBalls = [];

async function cargarCartones() {
  const res = await fetch('cartones.json');
  allCartones = await res.json();
  mostrarSiguientes();
}

function mostrarSiguientes() {
  const container = document.getElementById("cartonesContainer");
  const limite = Math.min(displayed + batchSize, allCartones.length);

  for (let i = displayed; i < limite; i++) {
    const carton = allCartones[i];
    const div = document.createElement("div");
    div.className = "carton";
    div.setAttribute("data-id", carton.id);
    div.innerHTML = `
      <h2>#${carton.id}</h2>
      <table>
        ${carton.rows.map(row =>
          `<tr>${row.map(num => `<td>${num}</td>`).join('')}</tr>`
        ).join('')}
      </table>
      <button class="btn" onclick="comprarCarton('${carton.id}')">Comprar</button>
    `;
    container.appendChild(div);
  }

  displayed = limite;
  resaltarNumeros();
}

window.comprarCarton = async function(id) {
  window.open(`https://wa.me/584141234567?text=Hola%2C%20quiero%20comprar%20el%20cartón%20%23${id}`, '_blank');
  await registrarVenta(id);
  const card = document.querySelector(`[data-id='${id}']`);
  if (card) {
    card.classList.add('vendido');
    const btn = card.querySelector('.btn');
    btn.innerText = "VENDIDO";
    btn.disabled = true;
  }
}

function buscarCarton() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;
  const carton = allCartones.find(c => c.id === query.padStart(3, '0'));
  if (carton) {
    document.getElementById("cartonesContainer").innerHTML = '';
    displayed = 0;
    allCartones = [carton];
    mostrarSiguientes();
  } else {
    alert("Cartón no encontrado");
  }
}

document.getElementById("searchInput").addEventListener("change", buscarCarton);
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    mostrarSiguientes();
  }
});

function actualizarBolasUI(){
  document.getElementById("currentBall").innerText = "Bola actual: " + (drawnBalls[drawnBalls.length-1] || "--");
  document.getElementById("historyList").innerText = drawnBalls.join(', ');
  resaltarNumeros();
}

async function fetchDrawsLoop(){
  const data = await obtenerBolas();
  drawnBalls = data.slice(1).map(r => r[1]); // columna bola
  actualizarBolasUI();
  setTimeout(fetchDrawsLoop, 5000);
}

function resaltarNumeros(){
  if(drawnBalls.length===0) return;
  document.querySelectorAll('#cartonesContainer td').forEach(td=>{
    if(drawnBalls.includes(Number(td.textContent))){
      td.classList.add('marked');
    }
  });
}

cargarCartones();
fetchDrawsLoop();
