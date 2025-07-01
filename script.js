const API_URL =
  'https://script.google.com/macros/s/AKfycbwLxvJuwaHL_5tvMJt31VeDYoL5LsaVq8P51gPBnzIxLDK66IH6sUq_1MnGcFDZrsITlA/exec';

const WHATSAPP_PHONE = '584266404042';   // número para redirección
const INTERVALO_MS   = 3000;             // 3 seg entre bolas

/* --------------------- RESERVA --------------------- */
async function reservarCarton(id, nombre, apellido, telefono) {
  try {
    const res = await fetch(API_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ id, nombre, apellido, telefono })
    });
    const json = await res.json();

    if (json.ok) {
      alert('✅ Cartón reservado con éxito');
      const msg  = `Hola, deseo reservar el cartón Nº${id} a nombre de ${nombre} ${apellido}. Teléfono: ${telefono}`;
      const link = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
      window.open(link, '_blank');
    } else {
      alert('❌ Error: ' + (json.error || 'No se pudo reservar'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ Error de conexión con el servidor');
  }
}

/* --------------------- FORMULARIO --------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formReservar');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id       = form.cartonId.value.trim();
      const nombre   = form.nombre.value.trim();
      const apellido = form.apellido.value.trim();
      const telefono = form.telefono.value.trim();
      if (id && nombre && apellido && telefono) {
        reservarCarton(id, nombre, apellido, telefono);
      } else {
        alert('Completa todos los campos antes de reservar');
      }
    });
  }
});

/* --------------------- SORTEO AUTOMÁTICO --------------------- */
let bolsa        = Array.from({ length: 75 }, (_, i) => i + 1);
let timer        = null;
const panelNums  = document.getElementById('numeros-sorteados');
const btnIniciar = document.getElementById('btnIniciar');
const btnDetener = document.getElementById('btnDetener');

function letraPara(num) {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

function anunciar(letra, num) {
  const texto = `${letra} ${num}`;
  const voz   = new SpeechSynthesisUtterance(texto);
  voz.lang    = 'es-VE';
  speechSynthesis.speak(voz);
}

function mostrarEnPantalla(letra, num) {
  if (!panelNums) return;
  const div   = document.createElement('div');
  div.className = 'numero';
  div.textContent = `${letra}${num}`;
  panelNums.appendChild(div);
}

function sortearNumero() {
  if (bolsa.length === 0) {
    clearInterval(timer);
    alert('🎉 ¡Se terminaron los números!');
    return;
  }
  const idx   = Math.floor(Math.random() * bolsa.length);
  const num   = bolsa.splice(idx, 1)[0];
  const letra = letraPara(num);
  anunciar(letra, num);
  mostrarEnPantalla(letra, num);
}

function iniciarSorteo() {
  if (timer) clearInterval(timer);
  sortearNumero();                       // primero inmediato
  timer = setInterval(sortearNumero, INTERVALO_MS);
}

function detenerSorteo() {
  clearInterval(timer);
  timer = null;
}

if (btnIniciar) btnIniciar.addEventListener('click', iniciarSorteo);
if (btnDetener) btnDetener.addEventListener('click', detenerSorteo);

/* --------------------- FIN SCRIPT --------------------- */
