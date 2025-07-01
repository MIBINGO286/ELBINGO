const API_URL = 'https://script.google.com/macros/s/AKfycbwLxvJuwaHL_5tvMJt31VeDYoL5LsaVq8P51gPBnzIxLDK66IH6sUq_1MnGcFDZrsITlA/exec';

// Función para reservar cartón
async function reservarCarton(id, nombre, apellido, telefono) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, nombre, apellido, telefono })
    });
    const result = await response.json();
    if (result.ok) {
      alert('Cartón reservado con éxito!');
      // Aquí puedes actualizar UI si quieres
    } else {
      alert('Error: ' + (result.error || 'No se pudo reservar'));
    }
  } catch (error) {
    alert('Error de conexión o servidor');
    console.error(error);
  }
}

// Ejemplo: llamada cuando envían formulario (debes integrar con tu formulario real)
document.querySelector('#formReservar').addEventListener('submit', e => {
  e.preventDefault();
  const id = e.target.elements['cartonId'].value;
  const nombre = e.target.elements['nombre'].value;
  const apellido = e.target.elements['apellido'].value;
  const telefono = e.target.elements['telefono'].value;
  reservarCarton(id, nombre, apellido, telefono);
});
