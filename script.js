let cartones = [];
let numerosCantados = [];
let intervalo;
let panelDesbloqueado = false;
const contraseña = "Jrr035$$*";

const cargarCartones = async () => {
  const res = await fetch("cartones.json");
  cartones = await res.json();
  mostrarCartones();
};

const mostrarCartones = () => {
  const contenedor = document.getElementById("cartones");
  contenedor.innerHTML = "";
  cartones.forEach(carton => {
    const div = document.createElement("div");
    div.className = "carton";
    div.innerHTML = `
      <div class="carton-id">#${String(carton.id).padStart(3, "0")}</div>
      <div class="bingo-label">BINGO</div>
      <div class="carton-grid">
        ${carton.numeros.map(n => `<div class="carton-num" data-num="${n}">${n}</div>`).join("")}
      </div>`;
    div.onclick = () => abrirReserva(carton.id);
    if (carton.reservado) div.classList.add("reservado");
    contenedor.appendChild(div);
  });
};

const abrirReserva = (id) => {
  document.getElementById("modalCompra").classList.remove("hidden");
  document.getElementById("cartonSeleccionado").textContent = id;
};

document.getElementById("closeModal").onclick = () => {
  document.getElementById("modalCompra").classList.add("hidden");
};

document.getElementById("btnReservar").onclick = () => {
  const nombre = document.getElementById("nombre").value;
  const apellido = document.getElementById("apellido").value;
  const telefono = document.getElementById("telefono").value;
  const id = document.getElementById("cartonSeleccionado").textContent;
  const msg = `Hola, ya realicé el pago. Mi cartón es el número ${id}. Datos: ${nombre} ${apellido}, Tel: ${telefono}`;
  const link = `https://wa.me/584266404042?text=${encodeURIComponent(msg)}`;
  window.open(link, "_blank");
  document.getElementById("modalCompra").classList.add("hidden");
};

document.getElementById("desbloquearPanel").onclick = () => {
  const clave = document.getElementById("claveAdmin").value;
  if (clave === contraseña) {
    document.getElementById("panel-admin").classList.remove("hidden");
    panelDesbloqueado = true;
    alert("Panel desbloqueado");
  } else {
    alert("Contraseña incorrecta");
  }
};

document.getElementById("iniciarSorteo").onclick = () => {
  if (intervalo) return;
  intervalo = setInterval(sacarNumero, 3000);
};

document.getElementById("detenerSorteo").onclick = () => {
  clearInterval(intervalo);
  intervalo = null;
};

document.getElementById("reiniciarPartida").onclick = () => {
  location.reload();
};

const sacarNumero = () => {
  let numero;
  do {
    numero = Math.floor(Math.random() * 75) + 1;
  } while (numerosCantados.includes(numero));
  numerosCantados.push(numero);
  mostrarNumero(numero);
  marcarEnCartones(numero);
};

const mostrarNumero = (n) => {
  const letra = "BINGO"[Math.floor((n - 1) / 15)];
  document.getElementById("letraNumero").textContent = letra;
  document.getElementById("valorNumero").textContent = n;
  const cantados = document.getElementById("cantados");
  const span = document.createElement("span");
  span.textContent = `${letra}${n} `;
  cantados.appendChild(span);

  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(`${letra} ${n}`);
  utter.lang = "es-ES";
  synth.speak(utter);
};

const marcarEnCartones = (n) => {
  const casillas = document.querySelectorAll(`.carton-num[data-num="${n}"]`);
  casillas.forEach(c => c.classList.add("marked"));
};

document.getElementById("buscarCarton").oninput = (e) => {
  const val = e.target.value.trim();
  document.querySelectorAll(".carton").forEach(carton => {
    carton.style.display = val && !carton.innerHTML.includes(val) ? "none" : "";
  });
};

window.onload = cargarCartones;
