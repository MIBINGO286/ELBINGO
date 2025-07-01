
const SHEET_NAME = "Hoja 1";

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const { id, nombre, apellido, telefono } = e.parameter;
  if (!id || !nombre) return ContentService.createTextOutput("Faltan datos");
  const data = ss.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      ss.getRange(i + 1, 2).setValue("RESERVADO");
      ss.getRange(i + 1, 3).setValue(nombre);
      ss.getRange(i + 1, 4).setValue(apellido);
      ss.getRange(i + 1, 5).setValue(telefono);
      break;
    }
  }
  return ContentService.createTextOutput("Reservado");
}
