// script.js - Lógica completa para BINGO JOKER

// Variables globales let numerosDisponibles = Array.from({ length: 75 }, (_, i) => i + 1); let numerosExtraidos = []; let intervalo = null; let modoJuego = "horizontal"; // Puede ser 'horizontal', 'vertical', 'diagonal', 'lleno' let cartonesGanadores = [];

// Inicializar evento al cargar window.onload = () => { cargarCartonesIniciales(); configurarControles(); configurarScroll(); };

// Cargar primeros 50 cartones function cargarCartonesIniciales() { const contenedor = document.getElementById("cartones"); for (let i = 0; i < 50 && i < cartones.length; i++) { const carton = crearCarton(cartones[i]); contenedor.appendChild(carton); } }

// Crear estructura HTML de un cartón function crearCarton(data) { const div = document.createElement("div"); div.className = "carton"; div.id = carton-${data.numero}; div.innerHTML = <div class='encabezado'>Cartón #${data.numero}</div>;

const tabla = document.createElement("table"); tabla.dataset.numero = data.numero; ["B", "I", "N", "G", "O"].forEach((col, idx) => { const columna = data.numeros[col]; for (let fila = 0; fila < 5; fila++) { if (!tabla.rows[fila]) tabla.insertRow(); const celda = tabla.rows[fila].insertCell(); const valor = columna[fila]; celda.textContent = valor; celda.dataset.valor = valor; celda.dataset.col = col; celda.dataset.fila = fila; if (valor === "FREE") celda.classList.add("free", "marcado"); } });

div.appendChild(tabla);

const boton = document.createElement("button"); boton.textContent = "Comprar"; boton.onclick = () => mostrarFormularioCompra(data.numero); boton.className = "btn-comprar"; div.appendChild(boton);

return div; }

// Mostrar formulario de compra function mostrarFormularioCompra(numero) { const nombre = prompt("Nombre completo:"); const telefono = prompt("Teléfono:"); if (!nombre || !telefono) return alert("Faltan datos");

const mensaje = Hola, deseo reservar el cartón #${numero}.\nNombre: ${nombre}\nTeléfono: ${telefono}; const enlace = https://wa.me/584266404042?text=${encodeURIComponent(mensaje)}; window.open(enlace);

const boton = document.querySelector(#carton-${numero} .btn-comprar); boton.textContent = "Reservado ✅"; boton.disabled = true; // Aquí puedes hacer la llamada a Google Sheets si lo deseas }

// Configurar botones de control function configurarControles() { document.getElementById("btn-iniciar").onclick = iniciarSorteo; document.getElementById("btn-detener").onclick = detenerSorteo; document.getElementById("btn-reiniciar").onclick = reiniciarPartida;

document.getElementById("modo-horizontal").onclick = () => cambiarModo("horizontal"); document.getElementById("modo-vertical").onclick = () => cambiarModo("vertical"); document.getElementById("modo-diagonal").onclick = () => cambiarModo("diagonal"); document.getElementById("modo-lleno").onclick = () => cambiarModo("lleno"); }

// Cambiar modo de juego function cambiarModo(modo) { modoJuego = modo; alert(Modo cambiado a: ${modo}); }

// Iniciar sorteo automático function iniciarSorteo() { if (intervalo) return; intervalo = setInterval(() => { if (numerosDisponibles.length === 0) return detenerSorteo(); const index = Math.floor(Math.random() * numerosDisponibles.length); const numero = numerosDisponibles.splice(index, 1)[0]; numerosExtraidos.push(numero); anunciarNumero(numero); marcarNumeroEnCartones(numero); verificarGanador(); }, 3000); }

// Detener sorteo function detenerSorteo() { clearInterval(intervalo); intervalo = null; }

// Reiniciar partida function reiniciarPartida() { numerosDisponibles = Array.from({ length: 75 }, (_, i) => i + 1); numerosExtraidos = []; cartonesGanadores = []; detenerSorteo(); document.querySelectorAll("td").forEach(celda => celda.classList.remove("marcado")); const modal = document.getElementById("modal-ganador"); if (modal) modal.remove(); }

// Anunciar con voz function anunciarNumero(num) { const letras = ["B", "I", "N", "G", "O"]; let letra = letras[Math.floor((num - 1) / 15)]; const utterance = new SpeechSynthesisUtterance(${letra} ${num}); speechSynthesis.speak(utterance); }

// Marcar número en todos los cartones function marcarNumeroEnCartones(num) { document.querySelectorAll(".carton td").forEach(celda => { if (celda.textContent == num) { celda.classList.add("marcado"); } }); }

// Verificar ganador según modo actual function verificarGanador() { const todosCartones = document.querySelectorAll(".carton table"); todosCartones.forEach(tabla => { const filas = tabla.rows; let gana = false; switch (modoJuego) { case "horizontal": for (let i = 0; i < 5; i++) { let completa = true; for (let j = 0; j < 5; j++) { if (!filas[i].cells[j].classList.contains("marcado")) completa = false; } if (completa) gana = true; } break; case "vertical": for (let j = 0; j < 5; j++) { let completa = true; for (let i = 0; i < 5; i++) { if (!filas[i].cells[j].classList.contains("marcado")) completa = false; } if (completa) gana = true; } break; case "diagonal": let d1 = true, d2 = true; for (let i = 0; i < 5; i++) { if (!filas[i].cells[i].classList.contains("marcado")) d1 = false; if (!filas[i].cells[4 - i].classList.contains("marcado")) d2 = false; } if (d1 || d2) gana = true; break; case "lleno": let todoMarcado = true; for (let i = 0; i < 5; i++) { for (let j = 0; j < 5; j++) { if (!filas[i].cells[j].classList.contains("marcado")) todoMarcado = false; } } if (todoMarcado) gana = true; break; }

if (gana && !cartonesGanadores.includes(tabla.dataset.numero)) {
  detenerSorteo();
  cartonesGanadores.push(tabla.dataset.numero);
  mostrarGanador(tabla);
}

}); }

// Mostrar el cartón ganador en una ventana modal function mostrarGanador(tabla) { const modal = document.createElement("div"); modal.id = "modal-ganador"; modal.style.position = "fixed"; modal.style.top = 0; modal.style.left = 0; modal.style.width = "100%"; modal.style.height = "100%"; modal.style.background = "rgba(0,0,0,0.8)"; modal.style.display = "flex"; modal.style.justifyContent = "center"; modal.style.alignItems = "center"; modal.style.zIndex = 9999;

const contenedor = document.createElement("div"); contenedor.style.background = "white"; contenedor.style.padding = "20px"; contenedor.style.borderRadius = "10px"; contenedor.style.textAlign = "center";

const titulo = document.createElement("h2"); titulo.textContent = "¡Cartón Ganador!";

const tablaClone = tabla.cloneNode(true); tablaClone.style.margin = "20px auto";

const btnConfirmar = document.createElement("button"); btnConfirmar.textContent = "Confirmar Ganador y Reiniciar"; btnConfirmar.onclick = () => { reiniciarPartida(); modal.remove(); }; btnConfirmar.style.marginTop = "20px";

contenedor.appendChild(titulo); contenedor.appendChild(tablaClone); contenedor.appendChild(btnConfirmar); modal.appendChild(contenedor); document.body.appendChild(modal); }

// Scroll progresivo function configurarScroll() { window.addEventListener("scroll", () => { const scrollBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 10; if (scrollBottom) cargarMasCartones(); }); }

let cartonesCargados = 50; function cargarMasCartones() { const contenedor = document.getElementById("cartones"); for (let i = cartonesCargados; i < cartonesCargados + 50 && i < cartones.length; i++) { const carton = crearCarton(cartones[i]); contenedor.appendChild(carton); } cartonesCargados += 50; }

  
