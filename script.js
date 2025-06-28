/* BINGO JOKER — script.js */
/* -----------------------------------------------------------
   Esta versión incluye:
   - Sorteo con voz masculina (español)
   - Lista de números cantados persistente
   - Marcado automático de celdas en los cartones
   - Detección automática de ganador (Vertical, Horizontal,
     Diagonal y Cartón Lleno)
   - Panel de control protegido
   - Reserva de cartón -> WhatsApp con mensaje:
       "Hola ya realicé el pago, mi cartón es el número XXX."
----------------------------------------------------------- */

const CARTONES_URL = "cartones.json";
const WEBAPP_URL   = "https://script.google.com/macros/s/AKfycbwfDVDNqvy-JHMU6Xi2EblwwCuDAU_uazEz0tuebXWxqdoPLVLyAjpktlUQuKNLX6Rk/exec";
const ADMIN_PASS   = "Jrr035$$*";

/* ---------- variables globales ---------- */
let cartones   = [];            // array con datos de cartones
let mostrados  = 0;             // cuántos cartones se han pintado
const BATCH    = 50;            // cuántos cartones cargamos por lote

let numeros = [...Array(75).keys()].map(n => n + 1);  // 1-75
let intervalo = null;

let cantadosNums = JSON.parse(localStorage.getItem("cantadosNums") || "[]"); // [12,53,…]
let cantadosEtiq = JSON.parse(localStorage.getItem("cantadosEtiq") || "[]"); // ["B12","G53",…]
let ganadores    = JSON.parse(localStorage.getItem("ganadores")    || "[]"); // ["042","759",…]

let currentMode  = "vertical";  // vertical | horizontal | diagonal | cartonLleno

/* ---------- utilidades DOM y voz ---------- */
const $ = id => document.getElementById(id);

function letra(n) {
  if (n <= 15)  return "B";
  if (n <= 30)  return "I";
  if (n <= 45)  return "N";
  if (n <= 60)  return "G";
  return "O";
}

function hablar(texto) {
  const voces = speechSynthesis.getVoices();
  const male  = voces.find(v => v.lang.startsWith("es") && v.name.toLowerCase().includes("male"))
             || voces.find(v => v.lang.startsWith("es"));
  const u = new SpeechSynthesisUtterance(texto);
  if (male) u.voice = male;
  speechSynthesis.speak(u);
}

/* ---------- lista de números cantados ---------- */
function renderCantados() {
  const cont = $("cantados");
  cont.innerHTML = "";
  cantadosEtiq.forEach(lbl => {
    const span = document.createElement("span");
    span.textContent = lbl;
    cont.appendChild(span);
  });
}

/* ---------- carga y render de cartones ---------- */
async function cargarCartones() {
  cartones = await (await fetch(CARTONES_URL)).json();
  mostrarMas();
}

function mostrarMas() {
  const grid = $("cartones");
  const lote = cartones.slice(mostrados, mostrados + BATCH);
  lote.forEach(c => grid.appendChild(crearCard(c)));
  mostrados += lote.length;
}

function crearCard(c) {
  const card = document.createElement("div");
  card.className = "carton";
  card.dataset.id = c.id;
  if (ganadores.includes(c.id)) card.classList.add("carton-victoria");

  const header = document.createElement("div");
  header.className = "carton-id";
  header.innerHTML =
    `<div class="bingo-label">B&nbsp;I&nbsp;N&nbsp;G&nbsp;O</div>
     <div class="carton-num">#${c.id}</div>`;

  const table = document.createElement("div");
  table.className = "carton-grid";

  c.carton.flat().forEach((cell, idx) => {
    const td = document.createElement("div");
    td.className = "carton-num";
    td.textContent = cell;
    if (cell !== "FREE" && cantadosNums.includes(Number(cell))) {
      td.classList.add("marked");
    }
    table.appendChild(td);
  });

  card.append(header, table);
  card.addEventListener("click", () => abrirModal(c.id, card));
  return card;
}

/* ---------- modal de reserva ---------- */
function abrirModal(id, card) {
  if (card.classList.contains("reservado")) return;
  $("cartonSeleccionado").textContent = "#" + id;
  $("modalCompra").classList.remove("hidden");
  $("btnReservar").onclick = () => reservar(id, card);
}
function cerrarModal() {
  $("modalCompra").classList.add("hidden");
  ["nombre","apellido","telefono"].forEach(f => $(f).value = "");
}
$("closeModal").onclick = cerrarModal;
window.onclick = e => { if (e.target.id === "modalCompra") cerrarModal(); };

async function reservar(id, card) {
  const nombre   = $("nombre").value.trim();
  const apellido = $("apellido").value.trim();
  const telefono = $("telefono").value.trim();
  if (!nombre || !apellido || !telefono) {
    alert("Completa todos los campos");
    return;
  }
  try {
    const r = await fetch(WEBAPP_URL, {
      method : "POST",
      body   : JSON.stringify({ action:"reservar", carton:id, nombre, apellido, telefono }),
      headers: { "Content-Type":"application/json" }
    });
    const txt = await r.text();
    if (txt.toLowerCase().includes("reservado")) {
      card.classList.add("reservado");
      cerrarModal();
      const msg = encodeURIComponent(`Hola ya realicé el pago, mi cartón es el número ${id}.`);
      location.href = "https://wa.me/584266404042?text=" + msg;
    } else {
      alert(txt);
    }
  } catch (err) {
    alert("Error conectando al servidor.");
  }
}

/* ---------- sorteo ---------- */
function marcarNumeroEnDOM(num) {
  document.querySelectorAll(".carton-num").forEach(td => {
    if (td.textContent == num) td.classList.add("marked");
  });
}

function extraerNumero() {
  if (!numeros.length) { detenerSorteo(); return; }
  const idx = Math.floor(Math.random() * numeros.length);
  const num = numeros.splice(idx,1)[0];

  $("letraNumero").textContent = letra(num);
  $("valorNumero").textContent = num;
  hablar(`${letra(num)} ${num}`);

  // Guardar en arrays
  cantadosNums.unshift(num);
  cantadosEtiq.unshift(`${letra(num)}${num}`);
  cantadosNums = cantadosNums.slice(0,75);
  cantadosEtiq = cantadosEtiq.slice(0,75);
  localStorage.setItem("cantadosNums", JSON.stringify(cantadosNums));
  localStorage.setItem("cantadosEtiq", JSON.stringify(cantadosEtiq));
  renderCantados();

  marcarNumeroEnDOM(num);
  detectarGanadores();
}

function iniciarSorteo() {
  if (intervalo) return;
  extraerNumero();
  intervalo = setInterval(extraerNumero, 3000);
}
function detenerSorteo() {
  clearInterval(intervalo);
  intervalo = null;
}
function reiniciarPartida() {
  detenerSorteo();
  numeros = [...Array(75).keys()].map(n => n + 1);
  $("letraNumero").textContent = "";
  $("valorNumero").textContent = "";
  cantadosNums = [];
  cantadosEtiq = [];
  ganadores = [];
  localStorage.clear();
  renderCantados();
  document.querySelectorAll(".marked").forEach(td => td.classList.remove("marked"));
  document.querySelectorAll(".carton-victoria").forEach(c => c.classList.remove("carton-victoria"));
}

/* ---------- detección de ganador ---------- */
function comprobador(fila, col) {
  return (fila === 2 && col === 2)              // FREE central
         || cantadosNums.includes(Number(this[fila][col]));
}
function esGanador(carton) {
  // carton: matriz 5x5
  const celda = (r,c) => carton[r][c];
  const ok = (r,c) => (r===2&&c===2) || cantadosNums.includes(Number(celda(r,c)));

  if (currentMode === "vertical") {
    return [...Array(5).keys()].some(c => [...Array(5).keys()].every(r => ok(r,c)));
  }
  if (currentMode === "horizontal") {
    return [...Array(5).keys()].some(r => [...Array(5).keys()].every(c => ok(r,c)));
  }
  if (currentMode === "diagonal") {
    const main = [...Array(5).keys()].every(i => ok(i,i));
    const anti = [...Array(5).keys()].every(i => ok(i,4-i));
    return main || anti;
  }
  // cartón lleno
  return [...Array(5).keys()].every(r => [...Array(5).keys()].every(c => ok(r,c)));
}

function detectarGanadores() {
  cartones.forEach(c => {
    if (ganadores.includes(c.id)) return;           // ya cantado
    if (esGanador(c.carton)) {
      ganadores.push(c.id);
      localStorage.setItem("ganadores", JSON.stringify(ganadores));
      const cardEl = document.querySelector(`.carton[data-id="${c.id}"]`);
      if (cardEl) cardEl.classList.add("carton-victoria");
      const modoTxt = currentMode === "cartonLleno" ? "cartón lleno" : currentMode;
      hablar(`¡Cartón ${c.id} ganador en ${modoTxt}!`);
      alert(`¡Cartón #${c.id} ha ganado (${modoTxt})!`);
    }
  });
}

/* ---------- buscador y scroll ---------- */
$("buscarCarton").addEventListener("change", () => {
  const id = $("buscarCarton").value.padStart(3,"0");
  const card = document.querySelector(`.carton[data-id="${id}"]`);
  if (card) card.scrollIntoView({ behavior:"smooth", block:"center" });
});
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) mostrarMas();
});

/* ---------- panel admin ---------- */
$("desbloquearPanel").onclick = () => {
  if ($("claveAdmin").value === ADMIN_PASS) {
    $("panel-admin").classList.remove("hidden");
    $("loginPanel").classList.add("hidden");
  } else {
    alert("Contraseña incorrecta");
  }
};

$("iniciarSorteo").onclick   = iniciarSorteo;
$("detenerSorteo").onclick   = detenerSorteo;
$("reiniciarPartida").onclick= reiniciarPartida;

/* ---------- liberar todos los cartones reservados ---------- */
$("liberarTodos").onclick = async () => {
  if (!confirm("¿Seguro que desea liberar todos los cartones?")) return;
  try {
    const r   = await fetch(WEBAPP_URL, {
      method : "POST",
      body   : JSON.stringify({ action:"liberar_todos" }),
      headers: { "Content-Type":"application/json" }
    });
    const txt = await r.text();
    if (txt.toLowerCase().includes("liberados")) {
      document.querySelectorAll(".carton.reservado").forEach(c => c.classList.remove("reservado"));
    } else {
      alert(txt);
    }
  } catch (err) {
    alert("Error conectando al servidor");
  }
};

/* ---------- modos de juego ---------- */
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(
    mode === "cartonLleno" ? "modoCartonLleno" :
    "modo" + mode.charAt(0).toUpperCase() + mode.slice(1)
  );
  btn.classList.add("active");
}
["vertical","horizontal","diagonal","cartonLleno"].forEach(m => {
  const id = m === "cartonLleno" ? "modoCartonLleno" : "modo" + m.charAt(0).toUpperCase() + m.slice(1);
  document.getElementById(id).onclick = () => setMode(m);
});

/* ---------- iniciar ---------- */
speechSynthesis.onvoiceschanged = () => {};
renderCantados();
cargarCartones();
