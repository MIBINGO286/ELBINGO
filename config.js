// config.js
// Archivo de configuración para la URL de la API y la contraseña del administrador.
export const CONFIG = {
  // URL base para la API de Google Apps Script que interactúa con Google Sheets.
  // Asegúrate de que esta URL sea la correcta y esté desplegada como aplicación web.
  API_URL: "https://script.google.com/macros/s/AKfycbx7gGTDc7fZbNekI0iY-oTb1SFRGORVIwDJ9QySiRXtaZBDweLMX78BkvpyXgX6ygox2A/exec",
  
  // Contraseña en texto plano para el acceso al panel de administrador.
  // ¡IMPORTANTE! En un entorno de producción real, nunca expongas contraseñas directamente en el código del cliente.
  // Considera un sistema de autenticación más segura (ej. Firebase Authentication, OAuth).
  SECRET: "Jrr035$$*", 
  
  // Hash MD5 de la contraseña (Jrr035$$*). No se utiliza actualmente en el script.js,
  // pero es buena práctica tener el hash si se implementa una verificación de hash en el futuro.
  // MD5 no es seguro para contraseñas modernas; considera algoritmos más robustos como SHA-256 o bcrypt.
  ADMIN_PASS_HASH: "e3cfbe83ca38063b52035cf88836b5c8" // MD5 de Jrr035$$*
};
