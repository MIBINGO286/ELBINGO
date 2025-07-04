/***********************  CONFIG ***********************/
const CARTONES_JSON_URL = 'cartones.json'; // URL o ruta al archivo cartones.json
const WHATS_APP = '584266404042'; // Número de WhatsApp

/*******************  VARIABLES GLOBALES *******************/
let cartones = [];  // Array de cartones disponibles
let vendidos = new Set();  // Set de cartones reservados

/*******************  FUNCIONES PARA CARGAR CARTONES *******************/
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

/*******************  FUNCIONES PARA MOSTRAR CARTONES *******************/
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

/*******************  FUNCION PARA RESERVAR CARTÓN *******************/
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

  // Actualizar visualización
  mostrarCartones();

  // Enviar mensaje de WhatsApp
  const mensaje = `Hola, he reservado el cartón #${carton.ID}.\nNombre: ${nombre} ${apellido}\nTeléfono: ${telefono}`;
  window.open(`https://wa.me/${WHATS_APP}?text=${encodeURIComponent(mensaje)}`, '_blank');

  // Actualizar el archivo cartones.json
  actualizarCartones();
}

/*******************  FUNCION PARA ACTUALIZAR cartones.json *******************/
async function actualizarCartones() {
  try {
    const response = await fetch(CARTONES_JSON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cartones)  // Enviar la versión actualizada de los cartones
    });

    if (!response.ok) {
      throw new Error('Error al actualizar el archivo cartones.json');
    }
  } catch (error) {
    console.error('Error al actualizar cartones:', error);
  }
}

/*******************  INIT *******************/
window.addEventListener('DOMContentLoaded', cargarCartones);
