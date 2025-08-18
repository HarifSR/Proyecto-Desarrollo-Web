/***** Utilidad ya existente para mostrar/ocultar formularios *****/
function toggleForm(id) {
  const formularios = document.querySelectorAll("form");
  formularios.forEach(form => {
    if (form.id !== id) form.classList.add("hidden");
  });
  const selectedForm = document.getElementById(id);
  selectedForm.classList.toggle("hidden");
}

/***** Estado simulado *****/
const state = {
  logged: false,
  usuarios: [
    { user: 'admin', rol: 'Admin' },
    { user: 'ana', rol: 'Encuestador' },
    { user: 'luis', rol: 'Analista' },
  ],
  encuestas: [
    { id: 1, nombre: 'Higiene básica 2025', grupo: 'General', preguntas: 12 },
    { id: 2, nombre: 'Agua y enfermedades', grupo: 'Madres 6-24', preguntas: 15 },
  ],
  comunidades: [
    { dep: 'El Progreso', mun: 'Guastatoya', nom: 'Aldea A / COCODE A-1' },
    { dep: 'El Progreso', mun: 'Sansare', nom: 'Caserío B / COCODE B-2' },
  ],
  stats: { hoy: 18, com: 12, enc: 7, preg: 120 }
};

/***** Elementos base *****/
const elLogin = document.getElementById('screen-login');
const elApp   = document.getElementById('app-layout');
const screens = document.querySelectorAll('.screen');

/***** Router simple por data-screen *****/
document.querySelectorAll('.app-sidebar [data-screen]').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

function showScreen(id) {
  screens.forEach(s => s.classList.add('d-none'));
  document.getElementById(id).classList.remove('d-none');
  // inicializaciones por pantalla
  if (id === 'screen-dashboard') renderDashboard();
  if (id === 'screen-encuestas') renderEncuestas();
  if (id === 'screen-reportes') renderReportes();
  if (id === 'screen-comunidades') renderComunidades();
  if (id === 'screen-config') renderConfig();
}

/***** Login / Logout *****/
document.getElementById('btnLogin')?.addEventListener('click', () => {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const ok = (u === 'admin' && p === 'admin'); // mock
  const error = document.getElementById('loginError');
  if (!ok) {
    error.classList.remove('d-none');
    return;
  }
  error.classList.add('d-none');
  state.logged = true;
  elLogin.classList.add('d-none');
  elApp.classList.remove('d-none');
  showScreen('screen-dashboard');
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
  state.logged = false;
  elApp.classList.add('d-none');
  elLogin.classList.remove('d-none');
});

/***** Dashboard *****/
let chartLine;
function renderDashboard() {
  // stats
  document.getElementById('statHoy').textContent  = state.stats.hoy;
  document.getElementById('statCom').textContent  = state.stats.com;
  document.getElementById('statEnc').textContent  = state.stats.enc;
  document.getElementById('statPreg').textContent = state.stats.preg;

  // línea
  const ctx = document.getElementById('chartLine');
  if (chartLine) chartLine.destroy();
  chartLine = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
      datasets: [{
        label: 'Encuestas/día',
        data: [3,5,2,8,6,10,7]
      }]
    }
  });
}

/***** Gestión de encuestas *****/
const tblEncuestas = document.getElementById('tblEncuestas');
const boxFormEncuesta = document.getElementById('boxFormEncuesta');

document.getElementById('btnNuevaEncuesta')?.addEventListener('click', () => {
  boxFormEncuesta.classList.remove('d-none');
  document.getElementById('fNombre').value = '';
  document.getElementById('fGrupo').value = 'General';
  document.getElementById('fPregs').value = 10;
});

document.getElementById('btnCancelarEncuesta')?.addEventListener('click', () => {
  boxFormEncuesta.classList.add('d-none');
});

document.getElementById('btnGuardarEncuesta')?.addEventListener('click', () => {
  const nombre = document.getElementById('fNombre').value.trim();
  const grupo  = document.getElementById('fGrupo').value;
  const pregs  = parseInt(document.getElementById('fPregs').value, 10) || 1;
  if (!nombre) return alert('Escribe un nombre');
  const id = state.encuestas.length ? Math.max(...state.encuestas.map(e=>e.id))+1 : 1;
  state.encuestas.push({ id, nombre, grupo, preguntas: pregs });
  boxFormEncuesta.classList.add('d-none');
  renderEncuestas();
});

function renderEncuestas() {
  tblEncuestas.innerHTML = '';
  state.encuestas.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.nombre}</td>
      <td>${e.grupo}</td>
      <td>${e.preguntas}</td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary">Asignar</button>
        <button class="btn btn-sm btn-outline-primary">Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${e.id}">Eliminar</button>
      </td>`;
    tblEncuestas.appendChild(tr);
  });
  // eliminar
  tblEncuestas.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = +btn.dataset.del;
      state.encuestas = state.encuestas.filter(e => e.id !== id);
      renderEncuestas();
    });
  });
}

/***** Recolección de datos: Guardar (mock) *****/
function guardarFormulario(formId) {
  const form = document.getElementById(formId);
  // Aquí podrías serializar y enviar al backend
  alert(`Formulario ${formId} enviado (simulado).`);
}

/***** Reportes y análisis *****/
let chartPie, chartBar;
function renderReportes() {
  // Pie por grupo
  const ctxPie = document.getElementById('chartPie');
  if (chartPie) chartPie.destroy();
  chartPie = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: ['Embarazadas','Madres 0-6','Madres 6-24','General'],
      datasets: [{ data: [12, 9, 14, 7] }]
    }
  });
  // Barras por comunidad
  const ctxBar = document.getElementById('chartBar');
  if (chartBar) chartBar.destroy();
  chartBar = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Aldea A','Aldea B','Caserío C','Barrio D'],
      datasets: [{ label: 'Encuestas', data: [10, 6, 12, 4] }]
    }
  });
}
document.getElementById('btnAplicarFiltros')?.addEventListener('click', () => {
  // Aquí leerías filtros y re-generarías datasets con datos reales del backend
  renderReportes();
});

/***** Administración comunitaria *****/
const tblComunidades = document.getElementById('tblComunidades');
const boxFormComunidad = document.getElementById('boxFormComunidad');
document.getElementById('btnNuevaComunidad')?.addEventListener('click', ()=>{
  boxFormComunidad.classList.remove('d-none');
});
document.getElementById('btnCancelarComunidad')?.addEventListener('click', ()=>{
  boxFormComunidad.classList.add('d-none');
});
document.getElementById('btnGuardarComunidad')?.addEventListener('click', ()=>{
  const dep = document.getElementById('cDep').value.trim();
  const mun = document.getElementById('cMun').value.trim();
  const nom = document.getElementById('cNom').value.trim();
  if (!dep || !mun || !nom) return alert('Completa todos los campos');
  state.comunidades.push({dep,mun,nom});
  boxFormComunidad.classList.add('d-none');
  renderComunidades();
});

function renderComunidades() {
  tblComunidades.innerHTML = '';
  state.comunidades.forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.dep}</td>
      <td>${c.mun}</td>
      <td>${c.nom}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" data-del-com="${idx}">Eliminar</button>
      </td>`;
    tblComunidades.appendChild(tr);
  });
  tblComunidades.querySelectorAll('[data-del-com]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = +btn.dataset.delCom;
      state.comunidades.splice(i,1);
      renderComunidades();
    });
  });
}

/***** Configuración *****/
const tblUsuarios = document.getElementById('tblUsuarios');
function renderConfig() {
  // usuarios
  tblUsuarios.innerHTML = '';
  state.usuarios.forEach((u, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.user}</td>
      <td>${u.rol}</td>
      <td><button class="btn btn-sm btn-outline-danger" data-del-user="${idx}">Eliminar</button></td>
    `;
    tblUsuarios.appendChild(tr);
  });
  tblUsuarios.querySelectorAll('[data-del-user]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = +btn.dataset.delUser;
      state.usuarios.splice(i,1);
      renderConfig();
    });
  });
}
document.getElementById('btnAddUser')?.addEventListener('click', ()=>{
  const u = document.getElementById('uNombre').value.trim();
  const r = document.getElementById('uRol').value;
  if (!u) return alert('Ingresa el usuario');
  state.usuarios.push({user: u, rol: r});
  document.getElementById('uNombre').value = '';
  renderConfig();
});
document.getElementById('btnGuardarAjustes')?.addEventListener('click', ()=>{
  const ok = true; // simular guardado
  if (ok) {
    document.getElementById('ajustesMsg').classList.remove('d-none');
    setTimeout(()=>document.getElementById('ajustesMsg').classList.add('d-none'), 1200);
  }
});

/***** Inicial *****/
(function init() {
  // Carga opciones en filtros (ejemplo desde comunidades)
  const selCom = document.getElementById('filtroComunidad');
  if (selCom) {
    state.comunidades.forEach(c=>{
      const o = document.createElement('option');
      o.value = c.nom; o.textContent = c.nom;
      selCom.appendChild(o);
    });
  }
  // Muestra login al inicio
  elLogin.classList.remove('d-none');
})();
