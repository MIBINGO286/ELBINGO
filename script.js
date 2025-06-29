// script.js
import { getData, saveVenta } from './sheetsApi.js';

let cartones = [];
let vendidos = new Set();
let bolas = [];

const cartonesContainer = document.getElementById('cartonesContainer');
const searchInput = document.getElementById('searchInput');
const currentBall = document.getElementById('currentBall');
const historyList = document.getElementById('historyList');

async function init() {
  const data = await getData();
  vendidos = new Set(data.vendidos);
  bolas = data.bolas;
  currentBall.textContent = `Bola actual: ${bolas.at(-1) || '--'}`;
  historyList.textContent = bolas.join(', ');
  const res = await fetch('./cartones.json');
  cartones = await res.json();
  renderCartones(50);
}

let loaded = 0;
function renderCartones(lote) {
  const frag = document.createDocumentFragment();
  for (let i = loaded; i < loaded + lote && i < cartones.length; i++) {
    const carton = cartones[i];
    const div = document.createElement('div');
    div.className = 'carton';
    if (vendidos.has(carton.id)) div.classList.add('vendido');
    div.innerHTML = `<span class="carton-id">#${carton.id}</span>` +
      carton.numeros.map(n => `<span class="bingo-cell${bolas.includes(n) ? ' marked' : ''}">${n}</span>`).join('') +
      (!vendidos.has(carton.id) ? `<button data-id="${carton.id}">Comprar</button>` : '');
    frag.appendChild(div);
  }
  cartonesContainer.appendChild(frag);
  loaded += lote;
}

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    renderCartones(50);
  }
});

cartonesContainer.addEventListener('click', async (e) => {
  if (e.target.tagName === 'BUTTON') {
    const id = e.target.dataset.id;
    const confirm = window.confirm(`¿Deseas comprar el cartón #${id}?`);
    if (confirm) {
      await saveVenta(id);
      window.open(`https://wa.me/584141234567?text=Hola%2C%20quiero%20comprar%20el%20cart%C3%B3n%20%23${id}`);
      e.target.parentElement.classList.add('vendido');
      e.target.remove();
    }
  }
});

searchInput.addEventListener('input', () => {
  const value = searchInput.value.trim();
  const carton = [...cartonesContainer.children].find(div => div.querySelector('.carton-id')?.textContent.includes(value));
  if (carton) carton.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

init();
