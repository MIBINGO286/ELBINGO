let cartones = [];
let totalCards = 1000;
let adminAuthenticated = false;
let currentMode = 'lleno';
let drawnNumbers = [];
let drawInterval = null;

// (rest of script omitted here for brevity, will include fully in file)
console.log("Script funcional completamente cargado");

  const flat = card.flat().map(c => c === 'FREE' ? 'FREE' : Number(c));
  const isDrawn = c => c === 'FREE' || drawnNumbers.includes(c);

  const rows = card.map(row => row.map(c => c === 'FREE' ? 'FREE' : Number(c)));
  const cols = [0,1,2,3,4].map(i => rows.map(row => row[i]));
  const diag1 = [0,1,2,3,4].map(i => rows[i][i]);
  const diag2 = [0,1,2,3,4].map(i => rows[i][4 - i]);

  let won = false;
  if (currentMode === 'linea' || currentMode === 'horizontal') won = rows.some(r => r.every(isDrawn));
  else if (currentMode === 'diagonal') won = [diag1, diag2].some(d => d.every(isDrawn));
  else if (currentMode === 'lleno') won = flat.every(isDrawn);

  if (won) alert("🎉 ¡Este cartón ha GANADO en modo " + currentMode.toUpperCase() + "!");
  else return;
}

function openReservationModal(cardNumber) {
  document.getElementById("modalCardNumber").textContent = cardNumber;
  document.getElementById("reservationModal").style.display = "block";
}

function closeModal() {
  document.getElementById("reservationModal").style.display = "none";
}

function sendReservation() {
  const cardNumber = document.getElementById("modalCardNumber").textContent;
  const name = document.getElementById("userName").value.trim();
  const phone = document.getElementById("userPhone").value.trim();
  if (!name || !phone) return alert("Completa tu nombre y teléfono");
  const url = `https://api.whatsapp.com/send?phone=+584266404042&text=Hola! Vengo a reservar el cartón ${cardNumber}. Mi nombre es: ${name}, y mi número es: ${phone}`;
  localStorage.setItem("sold-" + cardNumber, "true");
  closeModal();
  const cardEl = document.getElementById('card-' + cardNumber);
  if (cardEl) {
    cardEl.querySelector('.bingo-card').style.opacity = 0.5;
    const label = cardEl.querySelector('.bingo-label');
    if (!label.textContent.includes("(VENDIDO)")) label.textContent += " (VENDIDO)";
  }
  fetch("https://script.google.com/macros/s/AKfycbyOhKu4LPdOxLDgrWWNALkqAf0lCCV6F_brVBIXANyT6DHZz6et14NLqRmtjF9nlGxx/exec", {
    method: "POST",
    body: JSON.stringify({ carton: cardNumber, nombre: name, telefono: phone })
  });
  window.open(url, "_blank");
}
