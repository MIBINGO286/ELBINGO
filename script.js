/***********************  CONFIG ***********************/
const SHEET_JSONP = 'https://opensheet.elk.sh/1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4/CARTONES'; // URL de la hoja CARTONES

/*******************  VARIABLES GLOBALES *******************/
let cartones   = [];
let vendidos   = new Set();
let pintados   = 0;
let drawn      = new Set();

/*******************  INIT *******************/
window.addEventListener('DOMContentLoaded', async () => {
  // Obtén los cartones desde la API de OpenSheet
  const response = await fetch(SHEET_JSONP);
  const data = await response.json();
  console.log(data); // Verifica que los datos se están obteniendo correctamente

  cartones = data.map(carton => {
    return {
      id: carton.ID,
      grid: JSON.parse(carton.GRID),  // Aquí parseamos el GRID correctamente
      estado: carton.ESTADO || 'LIBRE'
    };
  });

  cartones.sort((a, b) => a.id - b.id);
  pintarBloque();
  observarScroll();
});

/*******************  FUNCIONES PARA CARTONES *******************/
function crearCarton({ id, grid, estado }) {
  const a = document.createElement('article');
  a.className = 'carton';
  a.dataset.id = id;
  const gridHtml = grid.flat().map(n => {
    const marked = (n !== 'FREE' && drawn.has(n)) ? 'marked' : '';
    return `<div class="cell ${marked}" data-num="${n}">${n === 'FREE' ? '★' : n}</div>`;
  }).join('');
  a.innerHTML = `<h3>#${id.toString().padStart(4, '0')}</h3><div class="grid">${gridHtml}</div>`;

  if (estado === 'RESERVADO') {
    a.classList.add('vendido');
  } else {
    a.onclick = () => abrirModal(id);
  }

  return a;
}

function pintarBloque() {
  const frag = document.createDocumentFragment();
  for (let i = pintados; i < pintados + 50 && i < cartones.length; i++) frag.appendChild(crearCarton(cartones[i]));
  pintados += 50;
  contenedor.appendChild(frag);
  if (pintados >= cartones.length) loader.style.display = 'none';
}

function observarScroll() {
  const sent = document.createElement('div');
  contenedor.appendChild(sent);
  new IntersectionObserver(e => { if (e[0].isIntersecting) pintarBloque(); }).observe(sent);
}
