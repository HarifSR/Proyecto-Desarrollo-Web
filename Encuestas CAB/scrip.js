/*************************
 * Auth DEMO sin backend *
 *************************/
const USERS = [
  { email: 'admin@cab.test', pass: '123456', role: 'admin', nombre: 'Administrador' },
  { email: 'usuario@cab.test', pass: '123456', role: 'usuario', nombre: 'Usuario' }
];

const LS_AUTH_KEY = 'cab.auth';
const LS_RESP_KEY = 'cab.respuestas';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function setScreen(screenId) {
  // Oculta todas y muestra una
  $$('#screen-login, #screen-user, #screen-admin').forEach(s => s.classList.add('hidden'));
  $(screenId).classList.remove('hidden');
}

function getAuth() {
  try { return JSON.parse(localStorage.getItem(LS_AUTH_KEY)) || null; }
  catch { return null; }
}
function setAuth(obj) {
  localStorage.setItem(LS_AUTH_KEY, JSON.stringify(obj));
}
function clearAuth() {
  localStorage.removeItem(LS_AUTH_KEY);
}

function getRespuestas() {
  try { return JSON.parse(localStorage.getItem(LS_RESP_KEY)) || []; }
  catch { return []; }
}
function pushRespuesta(registro) {
  const data = getRespuestas();
  data.push(registro);
  localStorage.setItem(LS_RESP_KEY, JSON.stringify(data));
}

/*****************************************
 * Mostrar/ocultar formularios de encuesta
 * (mantengo tu función original)        *
 *****************************************/
function toggleForm(id) {
  // Ocultar todos los formularios primero
  const formularios = document.querySelectorAll("form");
  formularios.forEach(form => {
    if (form.id !== id) {
      form.classList.add("hidden");
    }
  });

  // Mostrar u ocultar el formulario seleccionado
  const selectedForm = document.getElementById(id);
  selectedForm.classList.toggle("hidden");
}

/***************
 * Serializador *
 ***************/
function serializeForm(form) {
  const data = {};
  const fd = new FormData(form);

  // Agrupamos múltiples valores (checkbox[]) y valores simples (radio/text)
  for (const [key, value] of fd.entries()) {
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      if (!Array.isArray(data[k])) data[k] = [];
      data[k].push(value);
    } else {
      // si ya existía (poco probable salvo radios), lo sobrescribe con el último
      data[key] = value;
    }
  }
  return data;
}

/******************
 * Login / Logout *
 ******************/
function handleLoginSubmit(e) {
  e.preventDefault();
  const email = $('#loginEmail').value.trim().toLowerCase();
  const pass = $('#loginPass').value;

  const found = USERS.find(u => u.email === email && u.pass === pass);
  if (!found) {
    alert('Credenciales incorrectas.');
    return;
  }
  setAuth({ email: found.email, role: found.role, nombre: found.nombre, ts: Date.now() });
  routeByRole();
}

function routeByRole() {
  const auth = getAuth();
  const nav = $('#app-nav');
  if (!auth) {
    nav.classList.add('hidden');
    setScreen('#screen-login');
    return;
  }
  $('#whoami').textContent = `${auth.nombre} (${auth.role})`;
  nav.classList.remove('hidden');

  if (auth.role === 'admin') {
    setScreen('#screen-admin');
    renderAdmin();
  } else {
    setScreen('#screen-user');
  }
}

function logout() {
  clearAuth();
  routeByRole();
}

/***********************
 * Guardado de encuestas
 ***********************/
function onEncuestaSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const encuestaId = form.dataset.encuesta || form.id || 'desconocida';
  const auth = getAuth();
  if (!auth) { alert('Tu sesión expiró. Inicia sesión de nuevo.'); routeByRole(); return; }

  const payload = serializeForm(form);
  const registro = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    encuesta: encuestaId,
    usuario: auth.email,
    fechaGuardado: new Date().toISOString(),
    respuestas: payload
  };
  pushRespuesta(registro);
  alert('¡Respuestas guardadas!');
  form.reset();

  // Si el admin está viendo panel, refrescamos
  if (auth.role === 'admin') renderAdmin();
}

/*********************
 * Panel de Admin (KPIs)
 * Calcula métricas unificando
 * nombres distintos entre encuestas
 *********************/
function normalizeYesNo(v) {
  if (!v && v !== 0) return null;
  const t = String(v).trim().toLowerCase();
  if (['si','sí','yes','true','1'].includes(t)) return 'Sí';
  if (['no','false','0'].includes(t)) return 'No';
  return v; // deja el valor como venga
}

function normalizeTipoEncuesta(v) {
  if (!v) return null;
  const t = String(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // sin acentos
    .toLowerCase().trim();

  if (t.includes('embarazada')) return 'Embarazada';
  // “Madre de niño/a menor de meses” / “Madre menor meses”
  if (t.includes('menor')) return 'Madre de niño/a menor de meses';
  // “Madre de niño/a de 6 a 24 meses” / “Madre 6 a 24 meses”
  if (t.includes('6 a 24')) return 'Madre de niño/a de 6 a 24 meses';
  // fallback: intenta mapear por proximidad
  if (t.includes('6') && t.includes('24')) return 'Madre de niño/a de 6 a 24 meses';
  return v;
}




function computeStats() {
  const rows = getRespuestas();
  const porEncuesta = { encuesta1: 0, encuesta2: 0, encuesta3: 0 };

  let aguaSi = 0, aguaNo = 0;
  let clorarSi = 0, clorarNo = 0;
  let ctrlSi = 0, ctrlNo = 0;

  const AGUA_KEYS = ['agua_enferma', 'agua_enferma2'];
  const CLORAR_KEYS = ['deacuerdo_clorar', 'deacuerdo_clorar2', 'acuerdo_clorar'];
  const CONTROLES_KEYS = ['controles_embarazo', 'controles_embarazo2', 'controles'];

  // --- Tipo de encuesta (unificado)
  const TIPO_KEYS = ['tipo_encuesta', 'tipo_encuesta2'];
  const tipoLabels = [
    'Embarazada',
    'Madre de niño/a menor de meses',
    'Madre de niño/a de 6 a 24 meses'
  ];
  const tipoCounts = {
    'Embarazada': 0,
    'Madre de niño/a menor de meses': 0,
    'Madre de niño/a de 6 a 24 meses': 0
  };
  let tipoTotal = 0;

  rows.forEach(r => {
    if (porEncuesta[r.encuesta] != null) porEncuesta[r.encuesta]++;

    // Agua
    for (const k of AGUA_KEYS) {
      if (r.respuestas[k] != null) {
        const v = normalizeYesNo(r.respuestas[k]);
        if (v === 'Sí') aguaSi++; else if (v === 'No') aguaNo++;
        break;
      }
    }
    // Clorar
    for (const k of CLORAR_KEYS) {
      if (r.respuestas[k] != null) {
        const v = normalizeYesNo(r.respuestas[k]);
        if (v === 'Sí') clorarSi++; else if (v === 'No') clorarNo++;
        break;
      }
    }
    // Controles prenatales (saber el mínimo)
    for (const k of CONTROLES_KEYS) {
      if (r.respuestas[k] != null) {
        const v = normalizeYesNo(r.respuestas[k]);
        if (v === 'Sí') ctrlSi++; else if (v === 'No') ctrlNo++;
        break;
      }
    }
    // Tipo de encuesta
    for (const k of TIPO_KEYS) {
      if (r.respuestas[k] != null) {
        const norm = normalizeTipoEncuesta(r.respuestas[k]);
        if (tipoCounts[norm] != null) {
          tipoCounts[norm]++;
          tipoTotal++;
        }
        break;
      }
    }
  });

  return {
    total: rows.length,
    porEncuesta,
    agua: { si: aguaSi, no: aguaNo },
    clorar: { si: clorarSi, no: clorarNo },
    controles: { si: ctrlSi, no: ctrlNo },
    tipo: {
      labels: tipoLabels,
      data: [tipoCounts['Embarazada'], tipoCounts['Madre de niño/a menor de meses'], tipoCounts['Madre de niño/a de 6 a 24 meses']],
      total: tipoTotal
    }
  };
}


/****************
 * Render Admin *
 ****************/
let chartAgua, chartClorar, chartControles, chartEncuestas, chartTipo;

function renderAdmin() {
  const s = computeStats();

  // KPIs
  $('#statTotal').textContent = s.total;
  $('#statE1').textContent = s.porEncuesta.encuesta1;
  $('#statE2').textContent = s.porEncuesta.encuesta2;
  $('#statE3').textContent = s.porEncuesta.encuesta3;

  const common = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };

  // Agua
  const ctxAgua = $('#chartAgua');
  if (ctxAgua) {
    chartAgua && chartAgua.destroy();
    chartAgua = new Chart(ctxAgua, {
      type: 'pie',
      data: { labels: ['Sí', 'No'], datasets: [{ data: [s.agua.si, s.agua.no] }] },
      options: common
    });
  }

  // Clorar
  const ctxClorar = $('#chartClorar');
  if (ctxClorar) {
    chartClorar && chartClorar.destroy();
    chartClorar = new Chart(ctxClorar, {
      type: 'doughnut',
      data: { labels: ['Sí', 'No'], datasets: [{ data: [s.clorar.si, s.clorar.no] }] },
      options: common
    });
  }

  // Controles
  const ctxCtrl = $('#chartControles');
  if (ctxCtrl) {
    chartControles && chartControles.destroy();
    chartControles = new Chart(ctxCtrl, {
      type: 'pie',
      data: { labels: ['Sí', 'No'], datasets: [{ data: [s.controles.si, s.controles.no] }] },
      options: common
    });
  }

  // NUEVO: Barras de % por tipo de encuesta
  const ctxTipos = $('#chartTipos');
  if (ctxTipos) {
    chartTipos && chartTipos.destroy();
    const pct = (n, d) => d ? Math.round((n * 1000) / d) / 10 : 0; // 1 decimal
    const pEmbarazada = pct(s.tipos.embarazada, s.tipos.total);
    const pMenor      = pct(s.tipos.menor,      s.tipos.total);
    const p6a24       = pct(s.tipos.seis24,     s.tipos.total);

    chartTipos = new Chart(ctxTipos, {
      type: 'bar',
      data: {
        labels: [
          'Embarazada',
          'Madre de niño/a menor de meses',
          'Madre de niño/a de 6 a 24 meses'
        ],
        datasets: [{ label: 'Porcentaje', data: [pEmbarazada, pMenor, p6a24] }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.raw}%` }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (v) => v + '%' }
          }
        }
      }
    });
  }

    // --- Distribución por Tipo de encuesta (porcentajes en tooltip)
  const ctxTipo = $('#chartTipo');
  chartTipo && chartTipo.destroy();
  chartTipo = new Chart(ctxTipo, {
    type: 'doughnut',
    data: {
      labels: s.tipo.labels,
      datasets: [{ data: s.tipo.data }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = (ctx.dataset.data || []).reduce((a, b) => a + b, 0) || 1;
              const val = ctx.parsed;
              const pct = (val * 100 / total).toFixed(1);
              return `${ctx.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });

}


/************
 * Listeners *
 ************/
window.addEventListener('DOMContentLoaded', () => {
  // Login
  const fLogin = $('#formLogin');
  if (fLogin) fLogin.addEventListener('submit', handleLoginSubmit);
  $('#btnLogout').addEventListener('click', logout);

  // Encuestas (todas las forms con class encuesta-form)
  $$('.encuesta-form').forEach(f => f.addEventListener('submit', onEncuestaSubmit));

  // Ruta inicial
  routeByRole();
});
