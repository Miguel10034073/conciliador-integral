// Copias de seguridad automáticas de la configuración y Deshacer / Rehacer.
// - La configuración (tipos, conceptos, parámetros, saldos de extracto y partidas) se guarda en este navegador
//   y, poco después de cada cambio, en la carpeta de copias vinculada: «Configuración conciliador AAAA-MM-DD.json»
//   (se conservan las 7 copias diarias más recientes). Es el mismo formato de «Exportar configuración».
// - Cada cambio entra al historial de Deshacer / Rehacer (los últimos 40, también si se cierra la pestaña).
'use strict';

const Respaldo = (() => {
  const PASOS = 40, CONSERVAR = 7, CLAVE_HIST = 'conciliador.historial.v1', ESPERA = 1500;
  const nombreCopia = (dia) => `Configuración conciliador ${dia}.json`;
  const RE_COPIA = /^Configuración conciliador \d{4}-\d{2}-\d{2}\.json$/;
  const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const TECLA = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
  let app = null;            // { obtener(): config, aplicar(config) }
  let aplicando = false;     // al deshacer no se registra un paso nuevo

  // ---------- Almacén del navegador para la carpeta vinculada (localStorage no guarda carpetas) ----------
  let _db = null;
  const abrirDB = () => _db ? Promise.resolve(_db) : new Promise((ok, mal) => {
    const r = indexedDB.open('conciliador-integral', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('config');
    r.onsuccess = () => { _db = r.result; ok(_db); };
    r.onerror = () => mal(r.error);
  });
  const idb = async (modo, fn) => { const db = await abrirDB(); return new Promise((ok, mal) => { const t = db.transaction('config', modo); let res; const q = fn(t.objectStore('config')); if (q) q.onsuccess = () => { res = q.result; }; t.oncomplete = () => ok(res); t.onerror = () => mal(t.error); }); };
  const leer = (k) => idb('readonly', (s) => s.get(k)).catch(() => null);
  const escribirValor = (k, v) => idb('readwrite', (s) => s.put(v, k)).catch(() => {});

  // ---------- Historial: Deshacer / Rehacer ----------
  const H = { estados: [], pos: -1 };   // estados: [{ desc, fecha, config (texto) }]
  function guardarHist() {
    try { localStorage.setItem(CLAVE_HIST, JSON.stringify(H)); }
    catch { H.estados = H.estados.slice(-10); H.pos = H.estados.length - 1; try { localStorage.setItem(CLAVE_HIST, JSON.stringify(H)); } catch { /* sin espacio */ } }
  }
  function iniciarHist() {
    const actual = JSON.stringify(app.obtener());
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_HIST) || 'null');
      if (g && g.estados && g.estados[g.pos] && g.estados[g.pos].config === actual) { H.estados = g.estados; H.pos = g.pos; return; }
    } catch { /* historial dañado: empieza de nuevo */ }
    H.estados = [{ desc: 'Configuración al abrir', fecha: new Date().toISOString(), config: actual }]; H.pos = 0; guardarHist();
  }
  /* Registra un cambio (lo llama Config.guardar). */
  function registrar(desc) {
    if (!app || aplicando) return;
    const actual = JSON.stringify(app.obtener());
    if (H.estados[H.pos] && H.estados[H.pos].config === actual) return;
    H.estados.splice(H.pos + 1);
    H.estados.push({ desc: desc || 'Cambio en la configuración', fecha: new Date().toISOString(), config: actual });
    if (H.estados.length > PASOS + 1) H.estados.splice(0, H.estados.length - PASOS - 1);
    H.pos = H.estados.length - 1;
    guardarHist(); pintarBotones(); programarCopia();
  }
  function ir(paso) {
    const i = H.pos + paso;
    if (!app || i < 0 || i >= H.estados.length) return;
    const desc = H.estados[paso < 0 ? H.pos : i].desc;
    H.pos = i; guardarHist();
    aplicando = true;
    try { app.aplicar(JSON.parse(H.estados[i].config)); } finally { aplicando = false; }
    pintarBotones(); programarCopia();
    aviso((paso < 0 ? 'Se deshizo: ' : 'Se rehízo: ') + desc);
  }
  function pintarBotones() {
    const d = document.getElementById('botonDeshacer'), r = document.getElementById('botonRehacer');
    if (!d || !r) return;
    const atras = H.pos > 0 ? H.estados[H.pos] : null, adelante = H.estados[H.pos + 1];
    d.disabled = !atras; r.disabled = !adelante;
    d.title = atras ? `Deshacer: ${atras.desc} (${TECLA}Z)` : 'No hay cambios para deshacer';
    r.title = adelante ? `Rehacer: ${adelante.desc} (${TECLA}Y)` : 'No hay cambios para rehacer';
  }

  // ---------- Copias en la carpeta vinculada ----------
  const C = { carpeta: null, sucio: false, escribiendo: false, otraVez: false, error: '', ultima: null, t: null };
  const permiso = async () => C.carpeta && (await C.carpeta.queryPermission({ mode: 'readwrite' }).catch(() => 'denied')) === 'granted';
  function programarCopia(ms = ESPERA) { C.sucio = true; pintarEstado(); clearTimeout(C.t); C.t = setTimeout(escribirCopia, ms); }
  async function escribirCopia() {
    clearTimeout(C.t);
    if (C.escribiendo) { C.otraVez = true; return; }
    if (!C.sucio || !app) return;
    if (!(await permiso())) { C.error = C.carpeta ? 'falta el permiso sobre la carpeta de copias' : ''; pintarEstado(); return; }
    C.escribiendo = true; C.otraVez = false; pintarEstado();
    try {
      const nombre = nombreCopia(hoyISO());
      const w = await (await C.carpeta.getFileHandle(nombre, { create: true })).createWritable();
      await w.write(JSON.stringify(app.obtener(), null, 2)); await w.close();
      const diarias = [];
      for await (const [n, h] of C.carpeta.entries()) if (h.kind === 'file' && RE_COPIA.test(n)) diarias.push(n);
      diarias.sort();
      for (const n of diarias.slice(0, Math.max(0, diarias.length - CONSERVAR))) await C.carpeta.removeEntry(n).catch(() => {});
      C.sucio = C.otraVez; C.error = ''; C.ultima = new Date();
      await escribirValor('ultimaCopia', C.ultima.toISOString());
    } catch (e) {
      console.error(e);
      C.error = e.name === 'NotFoundError' ? 'la carpeta de copias ya no está donde estaba' : e.name === 'NotAllowedError' ? 'falta el permiso sobre la carpeta de copias' : String(e.message || e);
    }
    C.escribiendo = false; pintarEstado();
    if (C.sucio && !C.error) programarCopia(800);
  }
  async function vincularCarpeta() {
    if (!window.showDirectoryPicker) { alert('Este navegador no permite elegir carpetas. Use Chrome o Edge.'); return; }
    let hd;
    try { hd = await window.showDirectoryPicker({ id: 'conciliador-copias', mode: 'readwrite', startIn: 'documents' }); }
    catch (e) { if (e.name !== 'AbortError') alert('No se pudo usar esa carpeta: ' + e.message); return; }
    C.carpeta = hd; C.error = ''; await escribirValor('carpetaCopias', hd);
    aviso(`Carpeta de copias: «${hd.name}». La configuración se copia ahí sola.`);
    C.sucio = true; await escribirCopia();
    if (typeof app.alCambiarCarpeta === 'function') app.alCambiarCarpeta();
  }
  async function pedirPermiso() {
    if (!C.carpeta) return vincularCarpeta();
    const p = await C.carpeta.requestPermission({ mode: 'readwrite' }).catch(() => 'denied');
    if (p !== 'granted') { aviso('Sin permiso no se puede escribir la copia. La configuración sigue guardada en este navegador.', true); return; }
    C.error = ''; C.sucio = true; await escribirCopia();
  }
  /* Copias de la carpeta, de la más reciente a la más antigua. */
  async function listarCopias() {
    if (!(await permiso())) return [];
    const out = [];
    for await (const [n, h] of C.carpeta.entries()) if (h.kind === 'file' && /\.json$/i.test(n)) { const f = await h.getFile(); out.push({ nombre: n, file: f, mtime: f.lastModified }); }
    return out.sort((a, b) => b.mtime - a.mtime);
  }

  // ---------- Estado en la barra superior ----------
  const horaCorta = (d) => d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  function pintarEstado() {
    const el = document.getElementById('estadoCopia'); if (!el) return;
    let cls, texto, titulo, accion = '';
    if (!C.carpeta) { cls = 'p-gris'; texto = 'Sin carpeta de copias'; titulo = 'Elija la carpeta «Copias de seguridad» para que la configuración se copie sola'; accion = 'vincular'; }
    else if (C.error) { cls = 'p-alta'; texto = 'Copia sin actualizar'; titulo = C.error + '. Clic para reintentar.'; accion = 'permiso'; }
    else if (C.escribiendo) { cls = 'p-media'; texto = 'Guardando copia…'; titulo = 'Escribiendo la copia de la configuración'; }
    else if (C.sucio) { cls = 'p-media'; texto = 'Cambios por copiar'; titulo = 'La configuración ya está guardada en este navegador; la copia se escribe en un momento'; }
    else { cls = 'p-ok'; texto = 'Copia al día' + (C.ultima ? ' · ' + horaCorta(C.ultima) : ''); titulo = `Carpeta de copias: «${C.carpeta.name}»`; }
    el.className = 'pildora ' + cls; el.title = titulo; el.dataset.accion = accion;
    el.innerHTML = '<span class="punto"></span>'; el.append(texto);
  }
  function aviso(texto, error) {
    const d = document.createElement('div');
    d.className = 'aviso-flotante' + (error ? ' error' : ''); d.textContent = texto;
    document.body.append(d); setTimeout(() => d.remove(), error ? 6000 : 3200);
  }

  // ---------- Inicio ----------
  async function iniciar(opciones) {
    app = opciones;
    iniciarHist(); pintarBotones();
    document.getElementById('botonDeshacer').addEventListener('click', () => ir(-1));
    document.getElementById('botonRehacer').addEventListener('click', () => ir(1));
    document.getElementById('estadoCopia').addEventListener('click', (e) => {
      const a = e.currentTarget.dataset.accion;
      if (a === 'vincular') vincularCarpeta(); else if (a === 'permiso') pedirPermiso();
    });
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); ir(-1); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); ir(1); }
    });
    // Si se cierra con cambios sin copiar, el navegador avisa y la copia se escribe (es pequeña: tarda un instante)
    window.addEventListener('beforeunload', (e) => { if (C.sucio && C.carpeta) { escribirCopia(); e.preventDefault(); e.returnValue = ''; } });
    C.carpeta = await leer('carpetaCopias');
    const u = await leer('ultimaCopia'); if (u) C.ultima = new Date(u);
    pintarEstado();
    // Navegador nuevo (sin configuración guardada) y carpeta con copias: se carga la más reciente
    if (opciones.sinConfiguracion && (await permiso())) {
      const [ultima] = await listarCopias();
      if (ultima) {
        try { aplicando = true; app.aplicar(JSON.parse(await ultima.file.text())); aviso(`Configuración cargada de la copia «${ultima.nombre}».`); }
        catch (e) { aviso('No se pudo leer la copia más reciente: ' + e.message, true); }
        finally { aplicando = false; }
        iniciarHist(); pintarBotones();
      }
    }
  }

  return {
    iniciar, registrar, vincularCarpeta, pedirPermiso, listarCopias, escribirAhora: () => { C.sucio = true; return escribirCopia(); },
    get carpeta() { return C.carpeta; }, get ultima() { return C.ultima; }, get pendiente() { return C.sucio; }, get error() { return C.error; },
  };
})();
