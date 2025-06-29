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
  vendidos = new Set(data.vendidos.map(id => String(id))); // Asegúrate de que los IDs sean strings para la comparación
  bolas = data.bolas;
  currentBall.textContent = `Bola actual: ${bolas.at(-1) || '--'}`;
  historyList.textContent = bolas.join(', ');

  try {
    const res = await fetch('./cartones.json');
    cartones = await res.json();
    // Ajusta la matriz de números para el formato correcto si es necesario
    cartones = cartones.map(carton => ({
        id: String(carton.id), // Asegura que el ID sea string
        matriz: carton.matriz,
        numeros: carton.matriz.flat() // Asegura que 'numeros' contenga todos los números planos
    }));
    renderCartones(50);
  } catch (error) {
    console.error('Error al cargar cartones.json:', error);
    alert('No se pudieron cargar los cartones. Por favor, recarga la página.');
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

    // Verificar si el cartón está vendido
    if (vendidos.has(carton.id)) {
      div.classList.add('vendido');
    }

    // Generar el HTML para los números del cartón
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
  loaded = endIndex; // Actualiza 'loaded' al final del lote procesado
}


window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
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
        parentDiv.classList.add('vendido'); // Marcar como vendido visualmente
        e.target.remove(); // Quitar el botón de comprar
        window.open(`https://wa.me/584141234567?text=Hola%2C%20quiero%20comprar%20el%20cart%C3%B3n%20%23${id}`, '_blank');
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
      // Opcional: resaltar el cartón encontrado
      cartonElement.style.border = '3px solid #00f';
      setTimeout(() => {
        cartonElement.style.border = ''; // Quitar el resaltado después de un tiempo
      }, 2000);
    } else {
      console.log('Cartón no encontrado.'); // Puedes mostrar esto en la UI si quieres
    }
  }
});


init();
