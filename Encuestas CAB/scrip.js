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
    { id: 1, nombre: 'Higiene básica 2025', grupo: 'General',      preguntas: 12, activo: true },
  { id: 2, nombre: 'Agua y enfermedades', grupo: 'Madres 6-24',  preguntas: 15, activo: true },
  { id: 3, nombre: 'Conocimientos en maternidad', grupo: 'Embarazadas', preguntas: 10, activo: true }
  ],
  comunidades: [
    { dep: 'El Progreso', mun: 'Guastatoya', nom: 'Aldea A / COCODE A-1' },
    { dep: 'El Progreso', mun: 'Sansare', nom: 'Caserío B / COCODE B-2' },
  ],
  stats: { hoy: 18, com: 12, enc: 7, preg: 120 }
    ,
  semaforo: [
    {
      dep: 'El Progreso', mun: 'Guastatoya', com: 'Aldea A', grupo: 'Embarazadas',
      pregunta: '¿Cuándo hay que lavarse las manos?', promedio: 45, categoria: 'higiene'
    },
    {
      dep: 'El Progreso', mun: 'Sansare', com: 'Caserío B', grupo: 'Madres 1-6',
      pregunta: '¿El agua no desinfectada provoca enfermedades?', promedio: 30, categoria: 'agua'
    },
    {
      dep: 'El Progreso', mun: 'Guastatoya', com: 'Aldea A', grupo: 'Embarazadas',
      pregunta: '¿Conoce cuántos controles debe tener una mujer durante el embarazo?', promedio: 70, categoria: 'salud'
    },
    {
  dep: 'El Progreso', mun: 'Guastatoya', com: 'Aldea A', grupo: 'Embarazadas',
  pregunta: '¿Al cuánto tiempo dio pecho al bebé menor?', promedio: 100, categoria: 'lactancia'
},
{
  dep: 'El Progreso', mun: 'Sansare', com: 'Caserío B', grupo: 'Madres 1-6',
  pregunta: '¿Qué hace mientras alimenta a su hijo/a?', promedio: 62, categoria: 'lactancia'
},

{
  dep: 'El Progreso', mun: 'Guastatoya', com: 'Aldea A', grupo: 'Embarazadas',
  pregunta: '¿Conoce tipos de violencia en el hogar?', promedio: 100, categoria: 'violencia'
},
{
  dep: 'El Progreso', mun: 'Sansare', com: 'Caserío B', grupo: 'Madres 6-24',
  pregunta: '¿En qué situaciones se usa violencia con niños/as?', promedio: 48, categoria: 'violencia'
}
  ]

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
  if (id === 'screen-semaforo') renderSemaforo();

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

  if (!nombre) return alert('Escribe un nombre de encuesta');

  // 1) Tomar preguntas del constructor
  const preguntasDef = collectPreguntasFromUI();
  // 2) Fallback: si no agregaron ninguna, usa el número del input para reservar la cantidad (mock)
  const pregsInput   = parseInt(document.getElementById('fPregs').value, 10) || 0;
  const totalPregs   = preguntasDef.length > 0 ? preguntasDef.length : Math.max(pregsInput, 1);

  const id = state.encuestas.length ? Math.max(...state.encuestas.map(e=>e.id))+1 : 1;

  // Guardamos la encuesta con sus preguntas (y activo por defecto)
  state.encuestas.push({
    id,
    nombre,
    grupo,
    preguntas: totalPregs,   // número visible en la lista
    activo: true,            // usa tu switch actual
    preguntasDef             // <-- definición completa registrada
  });

  // Limpiar UI
  boxFormEncuesta.classList.add('d-none');
  document.getElementById('fNombre').value = '';
  document.getElementById('fPregs').value = 10;
  if (tbodyPreguntas) tbodyPreguntas.innerHTML = '';

  renderEncuestas();
});

/***** Constructor de preguntas (Gestión de encuestas) *****/
const tbodyPreguntas = document.getElementById('tbodyPreguntas');
const tplPregunta    = document.getElementById('tplPregunta');

function renumerarPreguntas() {
  if (!tbodyPreguntas) return;
  [...tbodyPreguntas.querySelectorAll('.q-row')].forEach((tr, i) => {
    tr.querySelector('.q-idx').textContent = i + 1;
  });
}

function agregarPregunta(prefill = {}) {
  if (!tplPregunta || !tbodyPreguntas) return;
  const node = tplPregunta.content.cloneNode(true);
  const tr   = node.querySelector('.q-row');

  // Prefill opcional
  tr.querySelector('.q-texto').value     = prefill.texto     || '';
  tr.querySelector('.q-categoria').value = prefill.categoria || 'higiene';
  tr.querySelector('.q-tipo').value      = prefill.tipo      || 'si_no';
  tr.querySelector('.q-opciones').value  = prefill.opciones  || '';

  // Mostrar/ocultar opciones según tipo
  const selTipo   = tr.querySelector('.q-tipo');
  const inpOp     = tr.querySelector('.q-opciones');
  const toggleOps = () => {
    inpOp.disabled = (selTipo.value !== 'opcion');
    if (selTipo.value !== 'opcion') inpOp.value = inpOp.value; // conserva, pero deshabilitado
  };
  selTipo.addEventListener('change', toggleOps);
  toggleOps();

  // Quitar fila
  tr.querySelector('.q-del').addEventListener('click', () => {
    tr.remove();
    renumerarPreguntas();
  });

  tbodyPreguntas.appendChild(node);
  renumerarPreguntas();
}

// Botones
document.getElementById('btnAgregarPregunta')?.addEventListener('click', () => agregarPregunta());
document.getElementById('btnLimpiarPreguntas')?.addEventListener('click', () => {
  if (!tbodyPreguntas) return;
  tbodyPreguntas.innerHTML = '';
  renumerarPreguntas();
});

// Lee todas las preguntas del constructor
function collectPreguntasFromUI() {
  if (!tbodyPreguntas) return [];
  const rows = [...tbodyPreguntas.querySelectorAll('.q-row')];
  return rows.map((tr, idx) => {
    const texto     = tr.querySelector('.q-texto').value.trim();
    const categoria = tr.querySelector('.q-categoria').value;
    const tipo      = tr.querySelector('.q-tipo').value;
    const opciones  = tr.querySelector('.q-opciones').value.trim();
    return {
      orden: idx + 1,
      texto,
      categoria,         // higiene | agua | salud | lactancia | violencia
      tipo,              // si_no | opcion | numerica
      opciones: tipo === 'opcion'
        ? opciones.split('|').map(s => s.trim()).filter(Boolean)
        : []
    };
  }).filter(p => p.texto.length > 0);
}


function renderEncuestas() {
  tblEncuestas.innerHTML = '';
  state.encuestas.forEach(e => {
    // seguridad por si faltara 'activo' en algún registro antiguo
    const activo = (e.activo !== false);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.nombre}</td>
      <td>${e.grupo}</td>
      <td>${e.preguntas}</td>

      <!-- ESTADO: switch -->
      <td>
        <div class="form-check form-switch m-0">
          <input class="form-check-input enc-act-toggle" type="checkbox"
                 role="switch" id="sw-${e.id}" data-id="${e.id}" ${activo ? 'checked' : ''}>
          <label class="form-check-label ms-2" for="sw-${e.id}">
            ${activo ? 'Activo' : 'Inactivo'}
          </label>
        </div>
      </td>

      <!-- ACCIONES: solo Asignar -->
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary">Asignar</button>
      </td>
    `;
    tblEncuestas.appendChild(tr);
  });

  // Evento: toggle activo/inactivo
  tblEncuestas.querySelectorAll('.enc-act-toggle').forEach(inp => {
    inp.addEventListener('change', () => {
      const id  = +inp.dataset.id;
      const row = state.encuestas.find(x => x.id === id);
      if (!row) return;
      row.activo = inp.checked;

      const label = inp.closest('.form-check').querySelector('.form-check-label');
      if (label) label.textContent = row.activo ? 'Activo' : 'Inactivo';
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

/***** Semáforo Municipal *****/
function renderSemaforo() {
  const tbody = document.getElementById('tblSemaforo');
  const selCat = document.getElementById('filtroCategoria');
  const selMun = document.getElementById('filtroMunicipio');
  if (!tbody) return;

  const cat = selCat ? selCat.value : 'todas';
  const mun = selMun ? selMun.value : 'todos';
  tbody.innerHTML = '';

  state.semaforo
    .filter(r => cat === 'todas' || r.categoria === cat)
     .filter(r => (mun === 'todos' || r.mun === mun))
    .forEach(r => {
      const color = r.promedio < 50 ? '🔴 Rojo' : (r.promedio < 75 ? '🟡 Amarillo' : '🟢 Verde');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.dep}</td>
        <td>${r.mun}</td>
        <td>${r.com}</td>
        <td>${r.grupo}</td>
        <td>${r.pregunta}</td>
        <td>${r.promedio}%</td>
        <td>${color}</td>
      `;
      tbody.appendChild(tr);
    });
}

// Botón de filtro
document.getElementById('btnFiltrarSemaforo')?.addEventListener('click', renderSemaforo);


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
      <td>
        <select  class"" name="select">
          <option value = "active"> activo</option>
          <option value = "inactive"> inactivo</option>
        </select>
      </td>
      <td><button class="btn btn-sm btn-outline-danger" data-del-user="${idx}">Eliminar</button></td>
      <td><button class="btn btn-sm btn-outline" ">editar</button></td>
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
