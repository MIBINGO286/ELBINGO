/*  BINGO JOKER – Backend  (CORS incluido)  */
const SHEET = 'Hoja 1';              // nombre de tu pestaña
const HEADERS = ['ID','ESTADO','NOMBRE','APELLIDO','TELEFONO']; // fila 1

/* -------------- UTIL -------------- */
function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sheet() {
  return SpreadsheetApp.getActive().getSheetByName(SHEET);
}

function findRow(id) {
  const col = sheet().getRange('A2:A').getValues().flat();
  const idx = col.indexOf(Number(id));
  return idx >= 0 ? idx + 2 : null;
}

/* -------------- GET -------------- */
function doGet(e) {
  const { id } = e.parameter;
  if (!id) return out({ error: 'Falta id' });

  const row = findRow(id);
  if (!row) return out({ error: 'ID no existe' });

  const values = sheet().getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const data = Object.fromEntries(HEADERS.map((h, i) => [h.toLowerCase(), values[i]]));
  return out({ ok: true, data });
}

/* -------------- POST -------------- */
function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  const { id, nombre, apellido, telefono } = body;
  if (!id || !nombre || !apellido || !telefono) return out({ error: 'Datos incompletos' });

  const row = findRow(id);
  if (!row) return out({ error: 'ID no existe' });

  const rng = sheet().getRange(row, 2, 1, 4);
  rng.setValues([['RESERVADO', nombre, apellido, telefono]]);
  return out({ ok: true });
}
