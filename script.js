
let numerosExtraidos = [];
let intervalo = null;
let modoJuego = "horizontal";

document.addEventListener("DOMContentLoaded", () => {
  cargarCartones();
});

function cargarCartones() {
  const contenedor = document.getElementById("cartones-container");
  cartones.forEach(carton => {
    const div = document.createElement("div");
    div.className = "carton";
    div.innerHTML = "<div class='carton-numero'>Cartón " + carton.numero + "</div>" +
      "<table class='carton-tabla'>" + ["B","I","N","G","O"].map((col, c) => {
        return "<tr>" + carton.numeros[col].map((num, r) => {
          const val = (num === "FREE") ? "★" : num;
          return "<td id='C" + carton.numero + "-" + val + "'>" + val + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</table>";
    contenedor.appendChild(div);
  });
}

function desbloquearPanel() {
  const clave = document.getElementById("clave").value;
  if (clave === "Jrr035$$*") {
    document.getElementById("controles").style.display = "block";
  } else {
    alert("Clave incorrecta");
  }
}

function iniciarPartida() {
  if (intervalo) return;
  modoJuego = document.getElementById("modo").value;
  let disponibles = Array.from({length: 75}, (_, i) => i + 1).filter(n => !numerosExtraidos.includes(n));
  intervalo = setInterval(() => {
    if (disponibles.length === 0) {
      detenerPartida();
      return;
    }
    const i = Math.floor(Math.random() * disponibles.length);
    const numero = disponibles.splice(i, 1)[0];
    numerosExtraidos.push(numero);
    decirNumero(numero);
    marcarNumero(numero);
    verificarGanador();
  }, 3000);
}

function detenerPartida() {
  clearInterval(intervalo);
  intervalo = null;
}

function reiniciarPartida() {
  location.reload();
}

function decirNumero(num) {
  let letra = num <= 15 ? "B" : num <= 30 ? "I" : num <= 45 ? "N" : num <= 60 ? "G" : "O";
  let msg = new SpeechSynthesisUtterance(`${letra} ${num}`);
  speechSynthesis.speak(msg);
}

function marcarNumero(num) {
  document.querySelectorAll(`[id$="-${num}"]`).forEach(td => {
    td.classList.add("resaltado");
  });
}

function verificarGanador() {
  if (numerosExtraidos.length >= 10) {
    detenerPartida();
    const modal = document.getElementById("ganador-modal");
    modal.style.display = "block";
    document.getElementById("contenido-ganador").innerHTML = `
      <h2>🎉 ¡Ganador detectado!</h2>
      <p>Este es un ejemplo simulado</p>
      <button onclick="reiniciarPartida()">Confirmar</button>
    `;
  }
}
