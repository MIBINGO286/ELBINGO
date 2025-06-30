// sheetsApi.js
// Este módulo se encarga de toda la comunicación con el Google Apps Script
// que actúa como backend para Google Sheets.

// URL base de tu Google Apps Script desplegado como aplicación web.
const BASE_URL = '[https://script.google.com/macros/s/AKfycbwLf2p_I86ZAg_u3hQpkkcDKQ0zI4r480EwCmmA-CaLSLV7OAyjZVtqRJ_w2XGGRxylYw/exec](https://script.google.com/macros/s/AKfycbwLf2p_I86ZAg_u3hQpkkcDKQ0zI4r480EwCmmA-CaLSLV7OAyjZVtqRJ_w2XGGRxylYw/exec)';

/**
 * Obtiene los datos actuales del juego (cartones vendidos, bolas extraídas, ganadores)
 * desde Google Sheets.
 * @returns {Object} Un objeto con las listas de vendidos, bolas y ganadores.
 */
export async function getData() {
  try {
    // Realiza una solicitud GET a la API con la acción 'getData'.
    const res = await fetch(`${BASE_URL}?action=getData`);
    
    // Verifica si la respuesta HTTP es exitosa.
    if (!res.ok) { // Si la respuesta no es 200 OK
        throw new Error(`HTTP error! status: ${res.status}. Error al obtener datos de Sheets.`);
    }
    
    // Parsea la respuesta JSON.
    const data = await res.json();
    
    // Retorna los datos, asegurando que las propiedades sean arrays vacíos si no existen.
    return {
      vendidos: data.vendidos || [],
      bolas: data.bolas || [],
      ganadores: data.ganadores || [],
    };
  } catch (e) {
    // Captura y registra cualquier error durante la obtención de datos.
    console.error('Error al obtener datos de Sheets:', e);
    // Retorna valores predeterminados en caso de error para evitar fallos en la UI.
    return { vendidos: [], bolas: [], ganadores: [] };
  }
}

/**
 * Guarda o elimina una venta de cartón en Google Sheets.
 * @param {string} id El ID del cartón.
 * @param {boolean} [remove=false] Si es true, la venta se elimina; si es false, se guarda.
 */
export async function saveVenta(id, remove = false) {
  try {
    // Realiza una solicitud GET a la API con la acción 'saveVenta', el ID del cartón
    // y el indicador 'remove'.
    const res = await fetch(`${BASE_URL}?action=saveVenta&id=${id}&remove=${remove}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}. Error al guardar/eliminar venta.`);
    }
    // Opcional: Podrías querer leer la respuesta del script si devuelve confirmación.
  } catch (e) {
    console.error('Error al guardar/eliminar venta:', e);
  }
}

/**
 * Guarda una bola extraída en Google Sheets.
 * @param {number} bola El número de la bola extraída.
 */
export async function saveBola(bola) {
  try {
    // Realiza una solicitud GET a la API con la acción 'saveBola' y el número de la bola.
    const res = await fetch(`${BASE_URL}?action=saveBola&bola=${bola}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}. Error al guardar bola.`);
    }
  } catch (e) {
    console.error('Error al guardar bola:', e);
  }
}

/**
 * Guarda un cartón ganador en Google Sheets.
 * @param {string} id El ID del cartón ganador.
 * @param {string} modalidad La modalidad de victoria (Línea, Columna, Cartón lleno).
 */
export async function saveGanador(id, modalidad) {
  try {
    // Realiza una solicitud GET a la API con la acción 'saveGanador', el ID del cartón
    // y la modalidad de victoria.
    const res = await fetch(`${BASE_URL}?action=saveGanador&id=${id}&modalidad=${modalidad}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}. Error al guardar ganador.`);
    }
  } catch (e) {
    console.error('Error al guardar ganador:', e);
  }
}

/**
 * Reinicia la partida en Google Sheets, borrando bolas, ventas y ganadores.
 */
export async function resetGame() {
  try {
    // Realiza una solicitud GET a la API con la acción 'resetGame'.
    const res = await fetch(`${BASE_URL}?action=resetGame`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}. Error al reiniciar partida.`);
    }
  } catch (e) {
    console.error('Error al reiniciar partida:', e);
  }
}
