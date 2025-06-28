
let cartones = [];
let cartonSeleccionado = null;
const apiURL = "https://script.google.com/macros/s/AKfycbwxj48OJYjiPrCdcn3PE2nyFeTosEWHysULmHGcxTKDTdaUzxb8-Eg8yQMw8AsB2HotjQ/exec";

document.addEventListener("DOMContentLoaded", () => {
  fetch('cartones.json')
    .then(res => res.json())
    .then(data => {
      cartones = data;
      renderizarCartones(data.slice(0, 50)); // primeros 50
    });
});

function renderizarCartones(lista) {
  const cont = document.getElementById('cartones-container');
  cont.innerHTML = "";
  lista.forEach(carton => {
    const div = document.createElement('div');
    div.className = 'carton';
    div.innerHTML = \`
      <h3>Cartón #\${carton.numero}</h3>
      <div class="numeros">
        \${['B','I','N','G','O'].map(l => carton.numeros[l].map(n => \`<div>\${n}</div>\`).join('')).join('')}
      </div>
      <button onclick="abrirCompra('\${carton.numero}')">Comprar</button>
    \`;
    cont.appendChild(div);
  });
}

function abrirCompra(numero) {
  cartonSeleccionado = numero;
  document.getElementById("numero-carton").innerText = numero;
  document.getElementById("modal-compra").style.display = "block";
}

function cerrarModal() {
  document.getElementById("modal-compra").style.display = "none";
}

function reservarCarton() {
  const nombre = document.getElementById("nombre").value;
  const apellido = document.getElementById("apellido").value;
  const telefono = document.getElementById("telefono").value;

  const mensaje = \`Hola, quiero reservar el cartón #\${cartonSeleccionado} a nombre de \${nombre} \${apellido}. Teléfono: \${telefono}\`;
  const url = \`https://wa.me/584266404042?text=\${encodeURIComponent(mensaje)}\`;
  window.open(url, '_blank');

  // Enviar datos al Google Sheets
  fetch(apiURL, {
    method: "POST",
    body: JSON.stringify({
      numero: cartonSeleccionado,
      nombre: nombre,
      apellido: apellido,
      telefono: telefono
    }),
    headers: { "Content-Type": "application/json" }
  }).then(res => res.text())
    .then(msg => {
      alert("Cartón reservado: " + msg);
    });

  cerrarModal();
}

function desbloquearPanel() {
  const clave = document.getElementById("clave-admin").value;
  if (clave === "Jrr035$$*") {
    document.getElementById("admin-panel").style.display = "block";
  } else {
    alert("Contraseña incorrecta");
  }
}

function buscarCarton() {
  const filtro = document.getElementById("buscador").value.padStart(3, '0');
  const encontrados = cartones.filter(c => c.numero.includes(filtro));
  renderizarCartones(encontrados);
}

function eliminarReservas() {
  if (confirm("¿Estás seguro de que quieres quitar TODAS las reservas?")) {
    fetch(apiURL + "?limpiar=true")
      .then(res => res.text())
      .then(msg => alert("Reservas eliminadas: " + msg));
  }
}

function iniciarSorteo() { alert("Sorteo iniciado (próxima función)"); }
function detenerSorteo() { alert("Sorteo detenido (próxima función)"); }
function reiniciarPartida() { alert("Partida reiniciada (próxima función)"); }
function cambiarModo(modo) { alert("Modo cambiado a: " + modo); }
