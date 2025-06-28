
function reservar(id,card){
  const nombre=document.getElementById('nombre').value.trim();
  const apellido=document.getElementById('apellido').value.trim();
  const telefono=document.getElementById('telefono').value.trim();
  if(!nombre||!apellido||!telefono){alert('Completa todos los campos');return;}
  const msg=encodeURIComponent(`Hola ya realicé el pago, mi cartón es el número ${id}.`);
  window.location.href='https://wa.me/584266404042?text='+msg;
}
