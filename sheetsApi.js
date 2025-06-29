import { CONFIG } from './config.js';

async function apiPost(path, payload) {
  const res = await fetch(`${CONFIG.API_URL}?secret=${CONFIG.SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, payload })
  });
  return await res.text();
}

async function apiGet(path){
  const res = await fetch(`${CONFIG.API_URL}?secret=${CONFIG.SECRET}&path=${path}`);
  return await res.json();
}

export async function registrarVenta(idCarton, comprador = "WhatsApp") {
  return apiPost('sale/add', { idCarton, comprador });
}
export async function quitarVenta(idCarton) {
  return apiPost('sale/remove', { idCarton });
}
export async function registrarBola(partidaID, bola) {
  return apiPost('draw/add', { partidaID, bola });
}
export async function registrarGanador(partidaID, idCarton, modalidad) {
  return apiPost('winner/add', { partidaID, idCarton, modalidad });
}
export async function obtenerVentas(){
  return apiGet('sales');
}
export async function obtenerBolas(){
  return apiGet('draws');
}
export async function obtenerGanadores(){
  return apiGet('winners');
}
