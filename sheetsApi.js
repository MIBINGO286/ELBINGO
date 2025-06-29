// sheetsApi.js

const BASE_URL = 'https://script.google.com/macros/s/AKfycbwLf2p_I86ZAg_u3hQpkkcDKQ0zI4r480EwCmmA-CaLSLV7OAyjZVtqRJ_w2XGGRxylYw/exec';

export async function getData() {
  try {
    const res = await fetch(`${BASE_URL}?action=getData`);
    const data = await res.json();
    return {
      vendidos: data.vendidos || [],
      bolas: data.bolas || [],
      ganadores: data.ganadores || [],
    };
  } catch (e) {
    console.error('Error al obtener datos de Sheets:', e);
    return { vendidos: [], bolas: [], ganadores: [] };
  }
}

export async function saveVenta(id, remove = false) {
  try {
    await fetch(`${BASE_URL}?action=saveVenta&id=${id}&remove=${remove}`);
  } catch (e) {
    console.error('Error al guardar venta:', e);
  }
}

export async function saveBola(bola) {
  try {
    await fetch(`${BASE_URL}?action=saveBola&bola=${bola}`);
  } catch (e) {
    console.error('Error al guardar bola:', e);
  }
}

export async function saveGanador(id, modalidad) {
  try {
    await fetch(`${BASE_URL}?action=saveGanador&id=${id}&modalidad=${modalidad}`);
  } catch (e) {
    console.error('Error al guardar ganador:', e);
  }
}

export async function resetGame() {
  try {
    await fetch(`${BASE_URL}?action=resetGame`);
  } catch (e) {
    console.error('Error al reiniciar partida:', e);
  }
}
