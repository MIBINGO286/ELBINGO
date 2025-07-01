
# BINGO JOKER 🎲

Versión completa del juego de bingo clásico con:

✅ Sorteo automático con voz  
✅ 1000 cartones únicos con scroll infinito  
✅ Reserva por WhatsApp  
✅ Conexión a Google Sheets como base de datos  
✅ Panel de control protegido con contraseña  
✅ Múltiples modalidades de juego: línea, columna, diagonal, cartón lleno  

---

## 🗂 Archivos incluidos

- `index.html` → Estructura de la página
- `style.css` → Estilo tipo casino
- `script.js` → Lógica completa del bingo
- `bingo_cards.json` → 1000 cartones únicos
- `backend.gs` → Código Apps Script para vincular con Google Sheets
- `README.md` → Guía de instalación y despliegue

---

## 🚀 Cómo instalar y usar

### 1. Crear hoja de cálculo en Google Sheets

1. Abre Google Sheets
2. Renombra tu hoja a: **Hoja 1**
3. Agrega encabezados en la fila 1:
   - A1: ID
   - B1: ESTADO
   - C1: NOMBRE
   - D1: APELLIDO
   - E1: TELEFONO
4. Llena del 1 al 1000 en la columna A

---

### 2. Subir `backend.gs` a Apps Script

1. Ve a **Extensiones > Apps Script**
2. Pega el contenido de `backend.gs`
3. Despliega como Web App:
   - Acceso: "Cualquiera, incluso anónimos"
4. Copia la URL `.exec` generada
5. Pégala en la variable `API_URL` dentro de `script.js`

---

### 3. Subir archivos a la web

1. Sube todo el contenido a GitHub o hosting
2. Abre `index.html` desde navegador
3. Prueba la experiencia de usuario, voz, botones, reservas

---

### 🔐 Datos del administrador

Contraseña para el panel: **Jrr035$$\***  
WhatsApp de reservas: **+58 426 6404042**

¡Listo para usar en ferias, rifas, asociaciones o eventos online! 🎉
