// Bingo Joker JS
const CARTONES_URL='cartones.json';
const WEBAPP_URL='https://script.google.com/macros/s/AKfycbwfDVDNqvy-JHMU6Xi2EblwwCuDAU_uazEz0tuebXWxqdoPLVLyAjpktlUQuKNLX6Rk/exec';
const ADMIN_PASS='Jrr035$$*';

let cartones=[], mostrados=0;
const BATCH=50;
let numeros=[...Array(75).keys()].map(n=>n+1);
let intervalo=null;

function $(id){return document.getElementById(id);}

function cargarCartones(){
 fetch(CARTONES_URL)
 .then(r=>r.json())
 .then(data=>{cartones=data; mostrarMas();})
 .catch(e=>{
   console.error('No se pudo cargar cartones',e);
   $('cartones').textContent='Error cargando cartones.';
 });
}

function mostrarMas(){
 const cont=$('cartones');
 const trozo=cartones.slice(mostrados,mostrados+BATCH);
 trozo.forEach(c=>cont.appendChild(crearCard(c)));
 mostrados+=trozo.length;
}

function crearCard(c){
 const card=document.createElement('div');
 card.className='carton';
 card.dataset.id=c.id;
 const header=document.createElement('div');
 header.className='carton-id';
 header.textContent='#'+c.id;
 const table=document.createElement('table');
 c.carton.forEach(fila=>{
  const tr=document.createElement('tr');
  fila.forEach(cell=>{
    const td=document.createElement('td');
    td.textContent=cell;
    tr.appendChild(td);
  });
  table.appendChild(tr);
 });
 card.append(header,table);
 card.addEventListener('click',()=>abrirModal(c.id,card));
 return card;
}

// Modal
function abrirModal(id,card){
 if(card.classList.contains('reservado')) return;
 $('cartonSeleccionado').textContent='#'+id;
 $('modalCompra').classList.remove('hidden');
 $('btnReservar').onclick=()=>reservar(id,card);
}
function cerrarModal(){
 $('modalCompra').classList.add('hidden');
 ['nombre','apellido','telefono'].forEach(i=>$ (i).value='');
}
$('closeModal').onclick=cerrarModal;
window.onclick=e=>{if(e.target.id==='modalCompra') cerrarModal();};

// Reservar
function reservar(id,card){
 const nombre=$('nombre').value.trim();
 const apellido=$('apellido').value.trim();
 const telefono=$('telefono').value.trim();
 if(!nombre||!apellido||!telefono){alert('Completa todos los campos');return;}
 fetch(WEBAPP_URL,{
  method:'POST',
  body:JSON.stringify({action:'reservar',carton:id,nombre,apellido,telefono}),
  headers:{'Content-Type':'application/json'}
 }).then(r=>r.text()).then(t=>{
   if(t.includes('Reservado')){
     card.classList.add('reservado');
     cerrarModal();
     const msg=`Hola, deseo reservar el cartón #${id} para BINGO JOKER.%0A${nombre} ${apellido}%0ATel: ${telefono}`;
     window.open('https://wa.me/584266404042?text='+msg,'_blank');
   }else alert(t);
 });
}

// Scroll Lazy
window.addEventListener('scroll',()=>{
 if(window.innerHeight+window.scrollY>=document.body.offsetHeight-300){
   mostrarMas();
 }
});

// Buscador
$('buscarCarton').addEventListener('change',()=>{
 const val=$('buscarCarton').value.padStart(3,'0');
 const el=document.querySelector(`.carton[data-id="${val}"]`);
 if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
});

// Admin
$('desbloquearPanel').onclick=()=>{
 if($('claveAdmin').value===ADMIN_PASS){
   $('panel-admin').classList.remove('hidden');
   $('loginPanel').classList.add('hidden');
 }else alert('Contraseña incorrecta');
};

// Sorteo
function letra(n){if(n<=15)return'B';if(n<=30)return'I';if(n<=45)return'N';if(n<=60)return'G';return'O';}
function hablar(texto){
 const utt=new SpeechSynthesisUtterance(texto);
 const voces=speechSynthesis.getVoices();
 const male=voces.find(v=>v.lang.startsWith('es')&&v.name.toLowerCase().includes('male'));
 if(male)utt.voice=male;
 speechSynthesis.speak(utt);
}
function extraerNumero(){
 if(!numeros.length){detener();return;}
 const pos=Math.floor(Math.random()*numeros.length);
 const num=numeros.splice(pos,1)[0];
 $('letraNumero').textContent=letra(num);
 $('valorNumero').textContent=num;
 hablar(`${letra(num)} ${num}`);
}
function iniciar(){ if(intervalo)return; extraerNumero(); intervalo=setInterval(extraerNumero,3000);}
function detener(){clearInterval(intervalo);intervalo=null;}
function reiniciar(){detener();numeros=[...Array(75).keys()].map(n=>n+1);$('letraNumero').textContent='';$('valorNumero').textContent='';}
$('iniciarSorteo').onclick=iniciar;
$('detenerSorteo').onclick=detener;
$('reiniciarPartida').onclick=reiniciar;

// Liberar todos
$('liberarTodos').onclick=()=>{
 if(!confirm('¿Seguro?'))return;
 fetch(WEBAPP_URL,{method:'POST',body:JSON.stringify({action:'liberar_todos'}),headers:{'Content-Type':'application/json'}})
 .then(r=>r.text()).then(t=>{
   if(t.includes('Todos liberados')){
     document.querySelectorAll('.carton.reservado').forEach(c=>c.classList.remove('reservado'));
   }else alert(t);
 });
};

speechSynthesis.onvoiceschanged=()=>{};
cargarCartones();
