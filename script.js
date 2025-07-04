const CARTONES_JSON_URL = '1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4'; // Reemplaza con la URL de tu archivo cartones.json
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxHSaYZatIzKTfYmk421iKeM90RytSf7vkd7ewAm7nKB4BvGtO5KU-1iL8mx39aONI9ZA/exec'; // URL de tu WebApp de Google Apps Script para actualizar el estado del cartón

let cartones = [];
let vendidos = new Set();

async function cargarCartones() {
  try {
    const response = await fetch(CARTONES_JSON_URL);
    const data = await response.json();
    cartones = data;
    mostrarCartones();
  } catch (error) {
    console.error('Error al cargar cartones:', error);
  }
}

function mostrarCartones() {
  const contenedor = document.getElementById('cartones-container');
  contenedor.innerHTML = '';  // Limpiar contenedor

  cartones.forEach(carton => {
    const divCarton = document.createElement('div');
    divCarton.className = 'carton';
    divCarton.dataset.id = carton.ID;

    const grid = JSON.parse(carton.GRID);
    const gridHtml = grid.map(fila => {
      return `<div class="fila">${fila.map(celda => `<span class="celda">${celda === 'FREE' ? '★' : celda}</span>`).join('')}</div>`;
    }).join('');

    divCarton.innerHTML = `<h3>Cartón #${carton.ID}</h3><div class="grid">${gridHtml}</div>`;
    divCarton.onclick = () => reservarCarton(carton);

    if (carton.ESTADO === 'RESERVADO') {
      divCarton.classList.add('reservado');
    }

    contenedor.appendChild(divCarton);
  });
}

function reservarCarton(carton) {
  if (carton.ESTADO === 'RESERVADO') {
    alert('Este cartón ya está reservado.');
    return;
  }

  const nombre = prompt('Ingrese su nombre:');
  const apellido = prompt('Ingrese su apellido:');
  const telefono = prompt('Ingrese su teléfono:');

  // Marcar cartón como reservado
  carton.ESTADO = 'RESERVADO';
  vendidos.add(carton.ID);

  // Actualizar el archivo cartones.json (usando la WebApp)
  const data = {
    ID: carton.ID,
    Nombre: nombre,
    Apellido: apellido,
    Telefono: telefono
  };

  fetch(WEBAPP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(response => response.text())
    .then(result => {
      alert(result);
      mostrarCartones();
    }).catch(error => {
      console.error('Error al realizar la reserva:', error);
    });
}

window.addEventListener('DOMContentLoaded', cargarCartones);

