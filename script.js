// URL de tu WebApp de Google Apps Script
const WEBAPP_URL  = 'https://script.google.com/macros/s/AKfycbxKH9xP-YZ6UXdTw9MtjeF9C19lMlXH0k-oMrbXiWqhrhoN0xJJPPpa6NOGFJo7x_5G/exec';
const SHEET_JSONP = 'https://opensheet.elk.sh/1YeHvkb5ag9hdL1VZTtXyi3PKwio7RWQ5tr-WaDKd52g/RESERVAS';
const WHATS_APP   = '584266404042';
const BLOQUE      = 50;

let cartones = [];
let vendidos = new Set();

const contenedor = document.getElementById('cartones-container');
const loader = document.getElementById('loader');
const modal = document.getElementById('modal');
const formRes = document.getElementById('form-reserva');
const spanNum = document.getElementById('carton-numero');
const inputID = document.getElementById('input-id');

// Cargar cartones desde JSON
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const r = await fetch('cartones.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    cartones = await r.json();
    cartones.sort((a, b) => a.id - b.id);
    pintarCartones();
  } catch (err) {
    console.error('Error al cargar cartones.json', err);
    loader.textContent = '⚠️ Error al cargar cartones';
  }

  // Obtener los cartones reservados
  jsonp(SHEET_JSONP, 'jsonpVendidos', data => {
    vendidos = new Set(data.filter(r => String(r.Estado).toUpperCase() === 'RESERVADO').map(r => String(r.ID)));
    refrescarCartonesVendidos();
  });
});

// Función para cargar los cartones en la interfaz
function pintarCartones() {
  const frag = document.createDocumentFragment();
  cartones.forEach(carton => {
    const a = document.createElement('article');
    a.className = 'carton';
    a.dataset.id = carton.id;
    const isReserved = vendidos.has(String(carton.id));
    a.classList.add(isReserved ? 'vendido' : '');
    a.innerHTML = `<h3>#${carton.id.toString().padStart(4, '0')}</h3>`;
    a.onclick = () => abrirModal(carton.id);
    frag.appendChild(a);
  });
  contenedor.appendChild(frag);
  if (cartones.length >= BLOQUE) loader.style.display = 'none';
}

// Función para abrir el modal de reserva
function abrirModal(id) {
  inputID.value = id;
  spanNum.textContent = id;
  modal.classList.remove('hidden');
}

// Función para cerrar el modal
function cerrarModal() {
  modal.classList.add('hidden');
  formRes.reset();
}

// Función de reserva (cuando un cartón es reservado)
formRes.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(formRes);
  const id = fd.get('ID');
  if (vendidos.has(id)) {
    alert('Ese cartón ya está reservado');
    return;
  }

  // Enviar la reserva al script de Google Apps (sin CORS)
  const iframe = document.createElement('iframe');
  iframe.name = 'hidden_iframe';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const form = document.createElement('form');
  form.action = WEBAPP_URL;
  form.method = 'POST';
  form.target = 'hidden_iframe';
  
  fd.forEach((value, key) => {
    const input = document.createElement('input');
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  
  document.body.appendChild(form);
  form.submit();

  // Marcar en la interfaz y en la base de datos
  vendidos.add(id);
  refrescarCartonesVendidos();

  // Enviar mensaje de WhatsApp
  const msg = encodeURIComponent(`Hola, quiero comprar el cartón ${id} y ya estoy por realizar el pago.`);
  window.open(`https://wa.me/${WHATS_APP}?text=${msg}`, '_blank');

  cerrarModal();
});

// Función para refrescar el estado de los cartones vendidos
function refrescarCartonesVendidos() {
  document.querySelectorAll('.carton').forEach(carton => {
    if (vendidos.has(carton.dataset.id)) {
      carton.classList.add('vendido');
    } else {
      carton.classList.remove('vendido');
    }
  });
}

// Función JSONP
function jsonp(url, cb, cbfn) {
  const script = document.createElement('script');
  window[cb] = (data) => { cbfn(data); delete window[cb]; script.remove(); };
  script.src = `${url}?callback=${cb}&_=${Date.now()}`;
  document.body.appendChild(script);
}
