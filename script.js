
// Ejemplo de lógica básica de bingo
document.getElementById("start").onclick = () => alert("Iniciar sorteo automático");
document.getElementById("stop").onclick = () => alert("Detener sorteo");
document.getElementById("reset").onclick = () => alert("Reiniciar juego");

window.onload = () => {
  const container = document.getElementById("cartones");
  for (let i = 0; i < 50; i++) {
    const carton = document.createElement("div");
    carton.className = "carton";
    carton.innerHTML = `<strong>Cartón #${cartones[i].numero}</strong>`;
    container.appendChild(carton);
  }
};
