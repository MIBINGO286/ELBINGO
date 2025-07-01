const SHEET='Hoja 1';           // cambia si tu pestaña se llama distinto

function _out(o){return ContentService.createTextOutput(JSON.stringify(o))
  .setMimeType(ContentService.MimeType.JSON)
  .setHeader('Access-Control-Allow-Origin','*')
  .setHeader('Access-Control-Allow-Methods','GET, POST')
  .setHeader('Access-Control-Allow-Headers','Content-Type');}

function _sheet(){return SpreadsheetApp.getActive().getSheetByName(SHEET);}
function _row(id){
  const col=_sheet().getRange('A2:A').getValues().flat();
  const i=col.indexOf(Number(id));
  return i<0?null:i+2;
}

// GET ?list=1  -> devuelve ids reservados
function doGet(e){
  if(e.parameter.list){
    const rows=_sheet().getRange('A2:B').getValues();
    const res=rows.filter(r=>r[1]==='RESERVADO').map(r=>r[0]);
    return _out({reservados:res});
  }
  return _out({ok:true});
}

// POST reserva
function doPost(e){
  const {id,nombre,apellido,telefono}=JSON.parse(e.postData.contents||'{}');
  if(!id||!nombre||!apellido||!telefono) return _out({error:'datos incompletos'});
  const r=_row(id); if(!r) return _out({error:'ID no existe'});
  _sheet().getRange(r,2,1,4).setValues([['RESERVADO',nombre,apellido,telefono]]);
  return _out({ok:true});
}
