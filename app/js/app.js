/* Guía de Flora de las Lomas de Lima — lógica de la app
   Sin dependencias, sin red. Los datos llegan en window.GUIA. */
(function () {
'use strict';

var G = window.GUIA, ICO = window.ICONOS || {};
var $  = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ---------- iconos ---------- */
function svgIcono(nombre, clase) {
  var cuerpo = ICO[nombre];
  if (!cuerpo) return '';
  return '<svg class="ico ' + (clase || '') + '" viewBox="0 0 256 256" ' +
         'aria-hidden="true" focusable="false">' + cuerpo + '</svg>';
}
function pintarIconos(raiz) {
  $$('[data-ico]', raiz).forEach(function (el) {
    if (el.dataset.pintado) return;
    el.innerHTML = svgIcono(el.dataset.ico) + el.innerHTML;
    el.dataset.pintado = '1';
  });
}

/* ---------- texto ---------- */
function sinTildes(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function esc(s) {
  return (s || '').replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

/* ---------- índice de búsqueda ---------- */
var nombreLoma = {};
G.lomas.forEach(function (l) { nombreLoma[l.id] = l.nombre; });

G.especies.forEach(function (e) {
  e._b = sinTildes([
    e.comun, e.cientifico, e.autoria, e.familia, e.grupo,
    (e.colores || []).join(' '), e.color,
    (e.sinonimos || []).join(' '),
    e.habitats.join(' '),
    e.lomas.map(function (id) { return nombreLoma[id]; }).join(' '),
    e.n
  ].join(' '));
});

/* ---------- sugerencias: qué es lo que estás escribiendo ----------
   «amarillo» es un color, «Malvaceae» una familia y «Amancaes» una loma, pero
   el buscador los trataba a los tres como texto suelto. La lista dice de qué
   tipo es cada coincidencia y aplica el filtro en vez de dejarlo en el cajón.
   Se arma una sola vez con lo que ya está en memoria: 244 entradas, no
   descarga nada y no se nota en el arranque. */
var MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'setiembre septiembre', 'octubre',
                   'noviembre', 'diciembre'];
var ORDEN_SUG = { 'Especie': 0, 'Sinónimo': 1, 'Color': 2, 'Loma': 3,
                  'Familia': 4, 'Grupo': 5, 'Hábitat': 6, 'En flor': 7 };
var SUG = [];
(function () {
  function meter(o) {
    o._k = sinTildes([o.et, o.sub, o.oculto].join(' '));
    SUG.push(o);
  }
  G.colores.forEach(function (c) {
    meter({ tipo: 'Color', punto: c.hex, et: c.nombre, n: c.n, f: 'color', v: c.nombre });
  });
  G.lomas.forEach(function (l) {
    meter({ tipo: 'Loma', ico: 'map-pin', et: l.nombre, n: l.nEsp,
            sub: l.sectores ? l.sectores.split(';').join(' · ') : '',
            f: 'loma', v: l.id });
  });
  G.familias.forEach(function (f) {
    meter({ tipo: 'Familia', ico: 'leaf', et: f.nombre, n: f.n, f: 'familia', v: f.nombre });
  });
  G.grupos.forEach(function (g) {
    meter({ tipo: 'Grupo', ico: 'plant', et: g.nombre, n: g.n, f: 'grupo', v: g.nombre });
  });
  G.habitats.forEach(function (h) {
    meter({ tipo: 'Hábitat', ico: 'drop', et: h.nombre, n: h.n, f: 'habitat', v: h.nombre });
  });
  G.meses.forEach(function (m, i) {
    meter({ tipo: 'En flor', ico: 'calendar-blank', et: m, oculto: MESES_LARGO[i],
            f: 'mes', v: i + 1 });
  });
  G.especies.forEach(function (e) {
    meter({ tipo: 'Especie', ico: 'flower-lotus', et: e.comun, sub: e.cientifico,
            cursiva: true, id: e.id });
    // los sinonimos no vienen de la guia: salen de datos/propio/sinonimos.csv
    (e.sinonimos || []).forEach(function (s) {
      meter({ tipo: 'Sinónimo', ico: 'flower-lotus', et: s,
              sub: 'hoy ' + e.cientifico + ' · ' + e.comun, cursiva: true, id: e.id });
    });
  });
})();

function sugerir(txt) {
  var k = sinTildes(txt).trim();
  if (k.length < 2) return [];
  var hallados = [];
  for (var i = 0; i < SUG.length; i++) {
    var p = SUG[i]._k.indexOf(k);
    if (p < 0) continue;
    // 0 empieza por lo escrito, 1 empieza una palabra, 2 cae en medio de una
    var r = p === 0 ? 0 : SUG[i]._k.charAt(p - 1) === ' ' ? 1 : 2;
    hallados.push({ s: SUG[i], r: r, p: p });
  }
  hallados.sort(function (a, b) {
    return a.r - b.r || ORDEN_SUG[a.s.tipo] - ORDEN_SUG[b.s.tipo] || a.p - b.p;
  });
  return hallados.slice(0, 8).map(function (x) { return x.s; });
}

var sugActual = [], sugSel = -1;

function pintarSug() {
  var caja = $('#sug');
  if (!sugActual.length) { cerrarSug(); return; }
  caja.innerHTML = sugActual.map(function (s, i) {
    var marca = s.punto
        ? '<span class="punto" style="background:' + s.punto + '"></span>'
        : svgIcono(s.ico);
    var sub = s.sub
        ? '<small>' + (s.cursiva ? '<i>' + esc(s.sub) + '</i>' : esc(s.sub)) + '</small>'
        : '';
    return '<button type="button" role="option" aria-selected="false" data-sug="' + i + '">' +
        '<span class="sug-ico">' + marca + '</span>' +
        '<span class="sug-txt"><b>' + esc(s.et) + '</b>' + sub + '</span>' +
        '<span class="sug-tipo">' + esc(s.tipo) +
          (s.n != null ? ' · ' + s.n : '') + '</span>' +
      '</button>';
  }).join('');
  caja.hidden = false;
  $('#q').setAttribute('aria-expanded', 'true');
  sugSel = -1;
}

function cerrarSug() {
  $('#sug').hidden = true;
  $('#sug').innerHTML = '';
  $('#q').setAttribute('aria-expanded', 'false');
  sugActual = []; sugSel = -1;
}

function moverSug(i) {
  var n = sugActual.length;
  if (!n) return;
  sugSel = (i + n) % n;
  $$('#sug [data-sug]').forEach(function (b, j) {
    b.setAttribute('aria-selected', j === sugSel ? 'true' : 'false');
    if (j === sugSel) b.scrollIntoView({ block: 'nearest' });
  });
}

function elegirSug(i) {
  var s = sugActual[i];
  if (!s) return;
  cerrarSug();
  if (s.id) { $('#q').blur(); abrirFicha(s.id); return; }
  var v = s.f === 'mes' ? +s.v : s.v;
  if (F[s.f].indexOf(v) < 0) F[s.f].push(v);
  F.q = ''; $('#q').value = ''; $('#limpiar').classList.add('oculto');
  $('#q').blur();
  render();
}

/* ---------- estado ---------- */
var ALT_MIN = 100, ALT_MAX = 1000;
var F = { q: '', color: [], grupo: [], mes: [], loma: [], habitat: [], familia: [],
          altModo: 'todas', altitud: 550, altDesde: ALT_MIN, altHasta: ALT_MAX };

/* «Todas» es una opción, no una posición del deslizador. Antes la cota
   arrancaba en mitad de la barra diciendo «sin filtrar», y al volver a ese
   mismo punto ya significaba 550: el mismo sitio, dos cosas distintas. */
function altActiva() {
  if (F.altModo === 'cota') return true;
  if (F.altModo === 'rango') return F.altDesde > ALT_MIN || F.altHasta < ALT_MAX;
  return false;
}

function activos() {
  return F.color.length + F.grupo.length + F.mes.length + F.loma.length +
         F.habitat.length + F.familia.length + (altActiva() ? 1 : 0);
}
function alterna(lista, valor) {
  var i = lista.indexOf(valor);
  if (i < 0) lista.push(valor); else lista.splice(i, 1);
}

function coloresDe(e) {
  return (e.colores && e.colores.length) ? e.colores : (e.color ? [e.color] : []);
}

function filtrar() {
  var q = sinTildes(F.q).trim();
  var term = q ? q.split(/\s+/) : [];
  return G.especies.filter(function (e) {
    for (var i = 0; i < term.length; i++) if (e._b.indexOf(term[i]) < 0) return false;
    // basta con que coincida cualquiera de sus colores: una flor entre
    // blanca y amarilla debe salir en las dos busquedas
    if (F.color.length && !coloresDe(e).some(function (c) {
          return F.color.indexOf(c) >= 0; })) return false;
    if (F.grupo.length   && F.grupo.indexOf(e.grupo) < 0) return false;
    if (F.familia.length && F.familia.indexOf(e.familia) < 0) return false;
    if (F.mes.length     && !F.mes.some(function (m) { return e.flor.indexOf(m) >= 0; })) return false;
    if (F.loma.length    && !F.loma.some(function (l) { return e.lomas.indexOf(l) >= 0; })) return false;
    if (F.habitat.length && !F.habitat.some(function (h) { return e.habitats.indexOf(h) >= 0; })) return false;
    if (altActiva()) {
      var min = e.altitud[0], max = e.altitud[1];
      if (min == null || max == null) return false;
      if (F.altModo === 'cota') {
        if (F.altitud < min || F.altitud > max) return false;      // la cota cae dentro
      } else {
        if (max < F.altDesde || min > F.altHasta) return false;    // los tramos se solapan
      }
    }
    return true;
  });
}

/* Con un color activo, delante las que lo tienen como principal: las otras
   coinciden por un detalle (el centro amarillo de una flor blanca, por
   ejemplo) y son menos probables. */
function ordenar(lista) {
  if (!F.color.length) return lista;
  return lista.slice().sort(function (a, b) {
    var pa = F.color.indexOf(a.color) >= 0 ? 0 : 1;
    var pb = F.color.indexOf(b.color) >= 0 ? 0 : 1;
    return pa - pb || a.n - b.n;
  });
}

/* ---------- tarjetas ---------- */
function tarjeta(e) {
  var foto = e.fotos[0] ? 'img/' + e.fotos[0] : '';
  var marcas = '';
  if (e.endemico) marcas += '<span class="marca-p">ENDÉMICA</span>';
  if (e.amenaza)  marcas += '<span class="marca-p vu">' + esc(e.amenaza) + '</span>';
  var puntos = coloresDe(e).slice(0, 3).map(function (c) {
    return '<span class="punto" title="' + esc(c) + '" style="background:' +
           colorHex(c) + '"></span>';
  }).join('');
  return '<button class="tarjeta" data-id="' + e.id + '">' +
      '<div class="foto">' +
        (foto ? '<img loading="lazy" decoding="async" src="' + foto + '" alt="' + esc(e.comun) + '">' : '') +
        (marcas ? '<div class="marcas">' + marcas + '</div>' : '') +
      '</div>' +
      '<div class="cuerpo">' +
        '<div class="comun">' + esc(e.comun) + '</div>' +
        '<div class="cient">' + esc(e.cientifico) + '</div>' +
        '<div class="pie">' +
          (puntos ? '<span class="puntos">' + puntos + '</span>' : '') +
          '<span>' + esc(e.familia) + '</span>' +
        '</div>' +
      '</div>' +
    '</button>';
}

function colorHex(nombre) {
  for (var i = 0; i < G.colores.length; i++) if (G.colores[i].nombre === nombre) return G.colores[i].hex;
  return '';
}

var ultimo = [];
function render() {
  var r = ordenar(filtrar());
  ultimo = r;
  $('#rejilla').innerHTML = r.map(tarjeta).join('');
  $('#vacio').classList.toggle('oculto', r.length > 0);
  ultimoN = r.length;
  pintarCuenta();
  var tot = G.especies.length;
  $('#btn-aplicar').textContent = r.length === tot
      ? 'Ver las ' + tot
      : 'Ver ' + r.length + (r.length === 1 ? ' resultado' : ' resultados');
  pintarActivos();
  sincronizarChips();
  mirarBarra();
}

/* Las fichas de lo puesto. Llevan data-f/data-v, asi que las quita el mismo
   manejador que ya destildaba las fichas del panel. */
var TOPE_CHIPS = 8, chipsAbiertos = false, compacto = false;

function pintarActivos() {
  var f = [];
  // la busqueda tambien es un filtro puesto, y asi «Quitar todo» tiene sitio
  // aunque lo unico activo sea el texto
  if (F.q) {
    f.push({ ico: 'magnifying-glass', et: '“' + F.q + '”', tipo: 'Búsqueda',
             quita: 'quita-q' });
  }
  F.color.forEach(function (v) {
    f.push({ marca: '<span class="punto" style="background:' + colorHex(v) + '"></span>',
             et: v, tipo: 'Color', f: 'color', v: v });
  });
  F.loma.forEach(function (v) {
    f.push({ ico: 'map-pin', et: nombreLoma[v] || v, tipo: 'Loma', f: 'loma', v: v });
  });
  F.familia.forEach(function (v) {
    f.push({ ico: 'leaf', et: v, tipo: 'Familia', f: 'familia', v: v });
  });
  F.grupo.forEach(function (v) {
    f.push({ ico: 'plant', et: v, tipo: 'Grupo', f: 'grupo', v: v });
  });
  F.habitat.forEach(function (v) {
    f.push({ ico: 'drop', et: v, tipo: 'Hábitat', f: 'habitat', v: v });
  });
  F.mes.slice().sort(function (a, b) { return a - b; }).forEach(function (v) {
    f.push({ ico: 'calendar-blank', et: 'En flor en ' + G.meses[v - 1],
             tipo: 'Floración', f: 'mes', v: v });
  });

  var caja = $('#activos');
  // con doce lomas puestas la fila se comia dos lineas y empujaba la rejilla
  if (f.length <= TOPE_CHIPS) chipsAbiertos = false;
  // el tope vale en los dos modos: arriba ahorra filas que habria que pasar
  // antes de llegar a las tarjetas, y apretada alarga la fila que se desliza
  // en vez de crear otra
  var sobran = (!chipsAbiertos && f.length > TOPE_CHIPS) ? f.length - TOPE_CHIPS : 0;
  var html = (sobran ? f.slice(0, TOPE_CHIPS) : f).map(function (x) {
    var senas = x.quita ? 'id="' + x.quita + '"'
                        : 'data-f="' + x.f + '" data-v="' + esc('' + x.v) + '"';
    return '<button class="chip" ' + senas + ' ' +
        'title="' + esc(x.tipo + ': ' + x.et) + '" ' +
        'aria-label="Quitar el filtro ' + esc(x.tipo + ': ' + x.et) + '">' +
        (x.marca || svgIcono(x.ico)) + esc(x.et) + svgIcono('x', 'quita') + '</button>';
  }).join('');

  if (altActiva()) {
    var txt = F.altModo === 'cota'
        ? F.altitud + ' msnm'
        : F.altDesde + '–' + F.altHasta + ' msnm';
    html += '<button class="chip" id="quita-alt" title="Altitud: ' + txt + '" ' +
        'aria-label="Quitar el filtro de altitud">' +
        svgIcono('mountains') + txt + svgIcono('x', 'quita') + '</button>';
  }

  if (sobran) {
    html += '<button class="chip todo" id="mas-chips">+' + sobran + ' más</button>';
  } else if (chipsAbiertos) {
    html += '<button class="chip todo" id="menos-chips">Ver menos</button>';
  }
  if (html) {
    html += '<button class="chip todo" id="quita-todo">' + svgIcono('x', 'quita') +
            'Quitar todo</button>';
  }
  caja.innerHTML = html;
  caja.classList.toggle('oculto', !html);
}

$('#activos').addEventListener('click', function (ev) {
  if (ev.target.closest('#mas-chips')) { chipsAbiertos = true; pintarActivos(); }
  else if (ev.target.closest('#menos-chips')) { chipsAbiertos = false; pintarActivos(); }
  else if (ev.target.closest('#quita-alt')) quitarAltitud();
  else if (ev.target.closest('#quita-q')) quitarBusqueda();
  else if (ev.target.closest('#quita-todo')) { quitarBusqueda(true); limpiarTodo(); }
});

function quitarBusqueda(callado) {
  F.q = ''; $('#q').value = ''; $('#limpiar').classList.add('oculto');
  cerrarSug();
  if (!callado) render();             // limpiarTodo ya repinta por su cuenta
}

/* ---------- la barra que se queda arriba al bajar ---------- */
var ultimoN = 0;
function pintarCuenta() {
  var tot = G.especies.length, n = ultimoN;
  $('#cuenta').textContent = compacto
      ? (n === tot ? '' + tot : n + '/' + tot)
      : (n === tot ? tot + ' especies' : n + ' de ' + tot + ' especies');
}

/* La cabecera es pegajosa y su alto cambia con el tema, el tamaño del texto y
   el ancho, asi que se mide en vez de darlo por sabido. */
function medirCabecera() {
  var cab = $('.cab');
  if (cab) {
    document.documentElement.style.setProperty('--alto-cab', cab.offsetHeight + 'px');
  }
}
if (window.ResizeObserver) new ResizeObserver(medirCabecera).observe($('.cab'));

function mirarBarra() {
  var barra = $('#barra-filtros');
  var hay = activos() > 0 || !!F.q;
  var tope = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--alto-cab')) || 0;
  /* Contra su sitio en el documento, no contra su posicion en pantalla: una
     vez fija su borde coincide con el de la cabecera igual que arriba del
     todo, asi que mirar la pantalla decia «fija» siempre. Los 6 px de holgura
     evitan que parpadee justo en el limite. */
  // del hueco, que se queda en el flujo: la barra, ya fija, devolveria su
  // propio top y el umbral se cumpliria siempre
  var desde = $('#barra-hueco').offsetTop - tope;
  var toca = hay && (compacto ? window.scrollY > desde - 6
                              : window.scrollY > desde + 6);
  if (toca === compacto) return;
  var hueco = $('#barra-hueco');
  // del hueco y no de la barra: asi entran tambien los margenes que se
  // escapan por fuera, y el documento no cambia de alto ni un pixel
  if (toca) hueco.style.height = hueco.offsetHeight + 'px';   // medir antes
  compacto = toca;
  barra.classList.toggle('compacta', compacto);
  if (!toca) hueco.style.height = '';
  pintarCuenta();
  pintarActivos();
}

/* Directo, sin requestAnimationFrame: el navegador ya limita los eventos de
   desplazamiento a uno por fotograma, y son dos lecturas y un cambio de clase
   solo cuando hace falta. Con rAF, ademas, no se actualizaba nada mientras la
   pagina no estuviera pintandose. */
window.addEventListener('scroll', mirarBarra, { passive: true });
window.addEventListener('resize', function () { medirCabecera(); mirarBarra(); });

/* ---------- filtros: interfaz ---------- */
function chip(texto, activo, extra) {
  return '<button class="chip" aria-pressed="' + (activo ? 'true' : 'false') + '" ' +
         (extra || '') + '>' + texto + '</button>';
}

function pintarFiltros() {
  $('#f-color').innerHTML = G.colores.map(function (c) {
    return chip('<span class="punto" style="background:' + c.hex + '"></span>' +
                esc(c.nombre) + ' <span class="cuenta">' + c.n + '</span>',
                F.color.indexOf(c.nombre) >= 0,
                'data-f="color" data-v="' + esc(c.nombre) + '"');
  }).join('');

  $('#f-grupo').innerHTML = G.grupos.map(function (g) {
    return chip(esc(g.nombre) + ' <span class="cuenta">' + g.n + '</span>',
                F.grupo.indexOf(g.nombre) >= 0,
                'data-f="grupo" data-v="' + esc(g.nombre) + '"');
  }).join('');

  $('#f-mes').innerHTML = G.meses.map(function (m, i) {
    return chip(m, F.mes.indexOf(i + 1) >= 0, 'data-f="mes" data-v="' + (i + 1) + '"');
  }).join('');

  // alfabetico: G.lomas viene en el orden de la leyenda del libro, que aqui
  // no dice nada a quien busca su loma
  $('#f-loma').innerHTML = G.lomas.slice().sort(function (a, b) {
    return a.nombre.localeCompare(b.nombre, 'es');
  }).map(function (l) {
    return chip(esc(l.nombre) + ' <span class="cuenta">' + l.nEsp + '</span>',
                F.loma.indexOf(l.id) >= 0,
                'data-f="loma" data-v="' + l.id + '"');
  }).join('');

  $('#f-habitat').innerHTML = G.habitats.map(function (h) {
    return chip(esc(h.nombre) + ' <span class="cuenta">' + h.n + '</span>',
                F.habitat.indexOf(h.nombre) >= 0,
                'data-f="habitat" data-v="' + esc(h.nombre) + '"');
  }).join('');

  $('#f-familia').innerHTML = G.familias.map(function (f) {
    return chip(esc(f.nombre) + ' <span class="cuenta">' + f.n + '</span>',
                F.familia.indexOf(f.nombre) >= 0,
                'data-f="familia" data-v="' + esc(f.nombre) + '"');
  }).join('');
}

/* ---------- elegir lomas sobre el mapa ----------
   Quien conoce la zona piensa «las de por aquí», no en una lista alfabética.
   Las dos vistas leen y escriben el mismo F.loma, así que cambiar de una a
   otra no pierde nada de lo elegido. */
var mapaPuesto = false, toquesPuestos = false;

function montarMapaLomas() {
  if (mapaPuesto) { ponerToques(); return; }
  var caja = $('#mapa-elige');
  caja.innerHTML = window.MAPA_SVG || '';
  var svg = caja.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Mapa de las lomas');
  var vb = (svg.getAttribute('viewBox') || '0 0 91 128').split(/[\s,]+/).map(Number);
  MV = { x0: vb[0], y0: vb[1], w0: vb[2], h0: vb[3], x: vb[0], y: vb[1], z: 1 };
  mapaPuesto = true;
  ponerToques();
}

/* Un circulo invisible por loma: las siluetas son diminutas y el dedo no.
   Hay que hacerlo con el mapa ya visible: con display:none, getBBox() devuelve
   ceros y los circulos acaban todos amontonados en el origen. */
function ponerToques() {
  if (toquesPuestos) return;
  var svg = $('#mapa-elige svg');
  if (!svg) return;
  var R = 4.2, hechos = 0;
  $$('#mapa-elige [data-loma]').forEach(function (p) {
    var c = p.getBBox();
    if (!c.width && !c.height) return;  // aun sin medidas: se reintenta luego
    var t = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    t.setAttribute('cx', (c.x + c.width / 2).toFixed(2));
    t.setAttribute('cy', (c.y + c.height / 2).toFixed(2));
    // la mitad real de la silueta; la ayuda se le suma aparte y encoge al
    // acercar, o al ampliar los circulos se comerian a los vecinos
    t.setAttribute('data-mitad', (Math.max(c.width, c.height) / 2).toFixed(2));
    t.setAttribute('r', Math.max(R, Math.max(c.width, c.height) / 2).toFixed(2));
    t.setAttribute('class', 'toque');
    t.setAttribute('data-loma', p.getAttribute('data-loma'));
    // aria-label y no <title>: el <title> saca ademas el globo del sistema,
    // que se solaparia con nuestra etiqueta y llega tarde
    t.setAttribute('aria-label', nombreLoma[p.getAttribute('data-loma')] || '');
    svg.appendChild(t);                 // encima de todo, para recibir el toque
    hechos++;
  });
  toquesPuestos = hechos > 0;
}

/* ---------- acercar el mapa ----------
   Las siluetas reales son diminutas y en el sur se solapan. Se amplia moviendo
   el viewBox, no con transform, para que los circulos de toque crezcan igual.
   Mover: dos dedos. Con uno se desplaza el panel, como en el resto de la app. */
var MV = null;

function aplicarVista() {
  var svg = $('#mapa-elige svg');
  if (!svg || !MV) return;
  var w = MV.w0 / MV.z, h = MV.h0 / MV.z;
  MV.x = Math.max(MV.x0, Math.min(MV.x0 + MV.w0 - w, MV.x));
  MV.y = Math.max(MV.y0, Math.min(MV.y0 + MV.h0 - h, MV.y));
  svg.setAttribute('viewBox', [MV.x, MV.y, w, h].map(function (n) {
    return n.toFixed(2);
  }).join(' '));
  // el radio de ayuda en pixeles de pantalla se mantiene: 4.2 unidades a 1x
  $$('#mapa-elige circle.toque').forEach(function (t) {
    var m = parseFloat(t.getAttribute('data-mitad')) || 0;
    t.setAttribute('r', Math.max(m, 4.2 / MV.z).toFixed(2));
  });
  var ampliado = MV.z > 1.001;
  $('#mapa-elige').classList.toggle('ampliado', ampliado);
  $('#mapa-menos').disabled = !ampliado;
  $('#mapa-mas').disabled = MV.z >= 3.99;
  sincronizarMapa();
}

function acercar(f, cx, cy) {
  if (!MV) return;
  var w = MV.w0 / MV.z, h = MV.h0 / MV.z;
  if (cx == null) { cx = MV.x + w / 2; cy = MV.y + h / 2; }
  var z = Math.max(1, Math.min(4, MV.z * f));
  if (z === MV.z) return;
  // el punto bajo los dedos se queda donde estaba
  var k = MV.z / z;
  MV.x = cx - (cx - MV.x) * k;
  MV.y = cy - (cy - MV.y) * k;
  MV.z = z;
  if (MV.z <= 1.001) { MV.z = 1; MV.x = MV.x0; MV.y = MV.y0; }
  aplicarVista();
}

$('#mapa-mas').addEventListener('click', function () { acercar(1.7); });
$('#mapa-menos').addEventListener('click', function () { acercar(1 / 1.7); });

(function () {
  var caja = $('#mapa-elige');
  var dedos = null;      // los dos dedos que mueven o pellizcan
  var raton = null;      // arrastre con raton
  var sostenido = null;  // doble toque mantenido, como en un mapa de verdad
  var ultimo = 0, ultimoP = null;
  var tragar = false;    // el click que sigue a un gesto no elige nada

  function porPixel() {
    var r = caja.getBoundingClientRect();
    return r.width ? (MV.w0 / MV.z) / r.width : 0;
  }
  function enMapa(cx, cy) {
    var r = caja.getBoundingClientRect(), k = porPixel();
    return { x: MV.x + (cx - r.left) * k, y: MV.y + (cy - r.top) * k };
  }
  function medio(t) {
    return { x: (t[0].clientX + t[1].clientX) / 2,
             y: (t[0].clientY + t[1].clientY) / 2,
             d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) };
  }

  /* ---------- dedos ---------- */
  caja.addEventListener('touchstart', function (ev) {
    if (!MV) return;
    if (ev.touches.length === 2) { dedos = medio(ev.touches); sostenido = null; return; }
    if (ev.touches.length !== 1) return;
    var t = ev.touches[0], ahora = Date.now();
    var cerca = ultimoP && Math.hypot(t.clientX - ultimoP.x, t.clientY - ultimoP.y) < 30;
    if (ahora - ultimo < 300 && cerca) {
      // segundo toque: si se suelta, acerca un paso; si se mantiene y se
      // arrastra, acerca de forma continua segun cuanto se suba o se baje
      sostenido = { y: t.clientY, z0: MV.z, p: enMapa(t.clientX, t.clientY), movido: false };
      ultimo = 0;
    } else {
      ultimo = ahora;
      ultimoP = { x: t.clientX, y: t.clientY };
    }
  }, { passive: true });

  caja.addEventListener('touchmove', function (ev) {
    if (!MV) return;
    if (sostenido && ev.touches.length === 1) {
      ev.preventDefault();
      var dy = sostenido.y - ev.touches[0].clientY;
      if (Math.abs(dy) > 3) sostenido.movido = true;
      var z = Math.max(1, Math.min(4, sostenido.z0 * Math.pow(2, dy / 140)));
      acercar(z / MV.z, sostenido.p.x, sostenido.p.y);
      return;
    }
    if (!dedos || ev.touches.length !== 2) return;
    ev.preventDefault();               // con dos dedos manda el mapa
    var m = medio(ev.touches), k = porPixel();
    MV.x -= (m.x - dedos.x) * k;
    MV.y -= (m.y - dedos.y) * k;
    if (dedos.d > 10 && m.d > 10) {
      var c = enMapa(m.x, m.y);
      acercar(m.d / dedos.d, c.x, c.y);
    } else {
      aplicarVista();
    }
    dedos = m;
  }, { passive: false });

  caja.addEventListener('touchend', function () {
    if (sostenido) {
      if (!sostenido.movido) acercar(1.8, sostenido.p.x, sostenido.p.y);
      sostenido = null;
      tragar = true;
    }
    if (dedos) tragar = true;
    dedos = null;
  });

  /* ---------- raton ---------- */
  caja.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType !== 'mouse' || !MV || MV.z <= 1.001) return;
    // sin capturar todavia: capturar aqui desviaba el click al contenedor y
    // no habia forma de elegir una loma con el mapa ampliado
    raton = { x: ev.clientX, y: ev.clientY, movido: 0, id: ev.pointerId, activo: false };
  });
  caja.addEventListener('pointermove', function (ev) {
    if (ev.pointerType === 'mouse' && !(raton && raton.activo)) {
      var l = ev.target.closest && ev.target.closest('[data-loma]');
      etiquetaMapa(l && l.getAttribute('data-loma'), ev.clientX, ev.clientY);
    }
    if (!raton || ev.pointerId !== raton.id) return;
    if (raton.activo) etiquetaMapa(null);
    var dx = ev.clientX - raton.x, dy = ev.clientY - raton.y;
    raton.movido += Math.abs(dx) + Math.abs(dy);
    if (!raton.activo) {
      if (raton.movido < 5) return;    // aun podria ser un click
      raton.activo = true;
      try { caja.setPointerCapture(raton.id); } catch (e) {}
    }
    var k = porPixel();
    MV.x -= dx * k; MV.y -= dy * k;
    raton.x = ev.clientX; raton.y = ev.clientY;
    aplicarVista();
  });
  function soltar(ev) {
    if (!raton) return;
    if (raton.activo) {
      tragar = true;
      try { caja.releasePointerCapture(raton.id); } catch (e) {}
    }
    raton = null;
  }
  caja.addEventListener('pointerup', soltar);
  caja.addEventListener('pointercancel', soltar);
  caja.addEventListener('pointerleave', function () { etiquetaMapa(null); });

  caja.addEventListener('dblclick', function (ev) {
    if (!MV) return;
    ev.preventDefault();
    var p = enMapa(ev.clientX, ev.clientY);
    acercar(1.8, p.x, p.y);
  });

  caja.tragaClick = function () {
    var t = tragar;
    tragar = false;
    return t;
  };
})();

/* El nombre sobre el mapa: al pasar el raton, y un momento al elegir. */
function puntoDeLoma(id) {
  var c = $('#mapa-elige circle.toque[data-loma="' + id + '"]') ||
          $('#mapa-elige [data-loma="' + id + '"]');
  if (!c) return null;
  var r = c.getBoundingClientRect(), m = $('.mapa-caja').getBoundingClientRect();
  return { x: r.left + r.width / 2 - m.left, y: r.top + r.height / 2 - m.top };
}

function etiquetaMapa(id, cx, cy) {
  var e = $('#mapa-etiqueta');
  if (!e) return;
  if (!id) { e.classList.remove('visible'); return; }
  var m = $('.mapa-caja').getBoundingClientRect();
  e.textContent = nombreLoma[id] || id;
  e.style.left = (cx - m.left) + 'px';
  e.style.top = (cy - m.top) + 'px';
  e.classList.add('visible');
}

var avisoLomaT;
function avisarLoma(id, puesta) {
  var a = $('#mapa-aviso'), p = puntoDeLoma(id);
  if (!a || !p) return;
  a.style.left = p.x + 'px';
  a.style.top = p.y + 'px';
  a.className = 'mapa-aviso' + (puesta ? '' : ' no');
  a.innerHTML = svgIcono(puesta ? 'check' : 'x') + esc(nombreLoma[id] || id);
  void a.offsetWidth;                   // reinicia la animacion si se repite
  a.classList.add('vuela');
  clearTimeout(avisoLomaT);
  avisoLomaT = setTimeout(function () { a.classList.remove('vuela'); }, 1100);
}

function sincronizarMapa() {
  if (!mapaPuesto) return;
  $$('#mapa-elige .loma').forEach(function (p) {
    p.classList.toggle('activa', F.loma.indexOf(p.getAttribute('data-loma')) >= 0);
  });
  var n = F.loma.length;
  $('#mapa-pista').textContent = n
      ? F.loma.map(function (id) { return nombreLoma[id] || id; }).join(' · ')
      : (MV && MV.z > 1.001 ? 'Dos dedos para mover el mapa.'
                            : 'Toca una loma. Doble toque para acercar.');
}

$('#mapa-elige').addEventListener('click', function (ev) {
  if (this.tragaClick && this.tragaClick()) return;   // venia de un gesto
  var t = ev.target.closest('[data-loma]');
  if (!t) return;
  var id = t.getAttribute('data-loma');
  alterna(F.loma, id);
  render();
  avisarLoma(id, F.loma.indexOf(id) >= 0);
});

$$('[data-vista]').forEach(function (b) {
  b.addEventListener('click', function () {
    var mapa = b.dataset.vista === 'mapa';
    $$('[data-vista]').forEach(function (o) {
      o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
    });
    // visible primero, montar despues: getBBox necesita que este dibujado
    $('#f-loma').classList.toggle('oculto', mapa);
    $('#f-loma-mapa').classList.toggle('oculto', !mapa);
    if (mapa) montarMapaLomas();
    sincronizarMapa();
  });
});

/* ---------- quitar un solo campo ---------- */
$$('[data-limpia]').forEach(function (b) {
  b.addEventListener('click', function () {
    F[b.dataset.limpia] = [];
    render();
  });
});

/* fichas rápidas bajo el buscador: los colores, que es lo que se busca en campo */
function pintarChipsRapidos() {
  var h = G.colores.map(function (c) {
    return chip('<span class="punto" style="background:' + c.hex + '"></span>' + esc(c.nombre),
                F.color.indexOf(c.nombre) >= 0,
                'data-f="color" data-v="' + esc(c.nombre) + '"');
  }).join('');
  $('#chips-rapidos').innerHTML = h;
}

function sincronizarChips() {
  $$('[data-f]').forEach(function (b) {
    var f = b.dataset.f, v = b.dataset.v;
    var on = f === 'mes' ? F.mes.indexOf(+v) >= 0 : F[f].indexOf(v) >= 0;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $$('[data-limpia]').forEach(function (b) {
    b.classList.toggle('oculto', !F[b.dataset.limpia].length);
  });
  sincronizarMapa();
}

document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-f]');
  if (!b) return;
  var f = b.dataset.f, v = b.dataset.v;
  alterna(F[f], f === 'mes' ? +v : v);
  render();
});

/* ---------- perfil de altitud ---------- */
function svgPerfil(e) {
  var P = G.perfil, vb = P.viewBox, W = vb[2], H = vb[3];
  var y200 = P.y_200, y1000 = P.y_1000;
  var y = function (a) { return y200 - (a - 200) * (y200 - y1000) / 800; };
  var min = e.altitud[0], max = e.altitud[1];
  var bandas = P.bandas.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
  var rejilla = '', etiquetas = '';
  [200, 400, 600, 800, 1000].forEach(function (a) {
    rejilla += '<line class="rejilla-l" x1="9" y1="' + y(a).toFixed(2) +
               '" x2="' + W + '" y2="' + y(a).toFixed(2) + '"/>';
    etiquetas += '<text x="8" y="' + (y(a) + 1).toFixed(2) + '" text-anchor="end">' + a + '</text>';
  });
  // El trazo rojo de la guia va sobre la cara occidental, la oriental o ambas.
  // Una banda horizontal daria a entender que la especie ocupa todo el cerro.
  var trazo = e.perfil
      ? '<path class="trazo" d="' + e.perfil + '"/>'
      : '';
  var caras = '<text class="cara" x="11" y="' + (H - 1.2).toFixed(1) + '">Oeste</text>' +
              '<text class="cara" x="' + (W - 1) + '" y="' + (H - 1.2).toFixed(1) +
              '" text-anchor="end">Este</text>';
  var c = caraDe(e);
  var enCara = c === 'Ambas caras' ? 'en ambas caras de la loma'
             : c ? 'en la cara ' + c.toLowerCase() : '';
  var desc = min != null
      ? 'De ' + min + ' a ' + max + ' metros, ' + enCara
      : 'sin dato';
  return '<svg class="perfil" viewBox="0 0 ' + W + ' ' + (H + 2) + '" role="img" ' +
         'aria-label="Rango de altitud: ' + desc + '">' +
           rejilla +
           '<g class="banda-relieve">' + bandas + '</g>' +
           '<path class="silueta" d="' + P.silueta + '"/>' +
           trazo + etiquetas + caras +
         '</svg>';
}

/* de que lado del perfil cae el trazo (el valle separa las dos caras).
   Hay que leer todas las coordenadas, no solo las de M y L: los trazos son
   casi todos curvas, y en una C las x estan en las posiciones pares. */
function caraDe(e) {
  var d = e.perfil || '';
  if (!d) return '';
  var nums = d.match(/-?\d*\.?\d+/g) || [];
  var xs = nums.filter(function (_, i) { return i % 2 === 0; }).map(parseFloat);
  if (!xs.length) return '';
  var VALLE = 27;
  var oeste = xs.some(function (x) { return x < VALLE - 2; });
  var este  = xs.some(function (x) { return x > VALLE + 2; });
  return oeste && este ? 'Ambas caras' : oeste ? 'Occidental' : 'Oriental';
}

/* ---------- mapa ---------- */
function svgMapa(e) {
  var cont = document.createElement('div');
  cont.innerHTML = window.MAPA_SVG || '';
  var svg = cont.querySelector('svg');
  if (!svg) return '';
  var propias = e.lomasPropias || [];
  e.lomas.forEach(function (id) {
    var p = svg.querySelector('[data-loma="' + id + '"]');
    if (!p) return;
    p.classList.add('activa');
    if (propias.indexOf(id) >= 0) p.classList.add('propia');
  });
  return cont.innerHTML;
}

/* ---------- ficha ---------- */
function dato(icono, etiqueta, valor, nota) {
  if (!valor) return '';
  return '<div class="dato"><div class="et">' + svgIcono(icono) + etiqueta + '</div>' +
         '<div class="va">' + valor + (nota ? ' <small>' + nota + '</small>' : '') + '</div></div>';
}

function bloque(icono, titulo, texto) {
  if (!texto) return '';
  return '<section class="bloque"><h3>' + svgIcono(icono) + titulo + '</h3><p>' + esc(texto) + '</p></section>';
}

/* El marco de la foto grande se amolda a la foto, en vez de la foto al marco.
   Se limita cuanto puede estirarse: una vertical muy alta empujaria el texto
   fuera de la pantalla, y ahi si aparecen franjas a los lados. */
function amoldarMarco(img) {
  if (!img || !img.naturalWidth) return;
  var r = img.naturalWidth / img.naturalHeight;
  img.parentNode.style.aspectRatio = Math.max(0.75, Math.min(1.9, r));
}
function vigilarFoto(img) {
  if (!img) return;
  img.onload = function () { amoldarMarco(img); };
  if (img.complete) amoldarMarco(img);
}

function abrirFicha(id, empujar) {
  var e = null;
  for (var i = 0; i < G.especies.length; i++) if (G.especies[i].id === id) { e = G.especies[i]; break; }
  if (!e) return;

  var origen = (G.origenes.filter(function (o) { return o.codigo === e.origen; })[0] || {}).nombre || e.origen;
  var amenaza = (G.amenazas.filter(function (a) { return a.codigo === e.amenaza; })[0] || {}).nombre || '';

  var etiquetas = '';
  if (e.endemico) etiquetas += '<span class="eti verde">' + svgIcono('seal-check') + 'Endémica del Perú</span>';
  if (e.amenaza)  etiquetas += '<span class="eti ambar">' + svgIcono('warning-circle') + esc(e.amenaza + ' · ' + amenaza) + '</span>';
  etiquetas += '<span class="eti">' + svgIcono('globe-hemisphere-west') + esc(origen) + '</span>';
  etiquetas += '<span class="eti">' + svgIcono('plant') + esc(e.grupo) + '</span>';

  var cal = '';
  if (e.flor.length) {
    cal = '<div class="calendario">' + G.meses.map(function (m, i) {
      return '<span class="' + (e.flor.indexOf(i + 1) >= 0 ? 'on' : '') + '">' + m + '</span>';
    }).join('') + '</div>';
  }

  var fotos = e.fotos.map(function (f, i) {
    return '<button data-foto="' + i + '" aria-current="' + (i === 0 ? 'true' : 'false') + '">' +
           '<img loading="lazy" src="img/' + f + '" alt=""></button>';
  }).join('');

  // se distingue lo que dice la guia de lo que hemos visto nosotros
  var propias = e.lomasPropias || [];
  var lomasEti = e.lomas.map(function (id2) {
    var mia = propias.indexOf(id2) >= 0;
    return '<span class="eti activa' + (mia ? ' propia' : '') + '"' +
           (mia ? ' title="Observación propia: no figura en la guía"' : '') + '>' +
           svgIcono('map-pin') + esc(nombreLoma[id2] || id2) + '</span>';
  }).join('');

  var html =
    '<div class="galeria">' +
      '<div class="grande">' + (e.fotos[0]
        ? '<img id="foto-grande" src="img/' + e.fotos[0] + '" alt="' + esc(e.comun) + '">' : '') + '</div>' +
      (e.fotos.length > 1 ? '<div class="miniaturas">' + fotos + '</div>' : '') +
    '</div>' +

    '<header class="encabezado">' +
      '<div class="num">N.º ' + e.n + ' · ' + esc(e.familia) + '</div>' +
      '<h2>' + esc(e.comun) + '</h2>' +
      '<p class="cient">' + esc(e.cientifico) +
        (e.autoria ? ' <span class="aut">' + esc(e.autoria) + '</span>' : '') + '</p>' +
      (e.sinonimos && e.sinonimos.length
        ? '<p class="sinon">' + svgIcono('arrow-left') + 'Antes ' +
          e.sinonimos.map(function (x) { return '<i>' + esc(x) + '</i>'; }).join(', ') +
          '</p>' : '') +
      '<div class="etiquetas">' + etiquetas + '</div>' +
    '</header>' +

    '<div class="datos">' +
      dato('ruler', 'Altura', esc(e.alturaTxt || '—')) +
      dato('calendar-blank', 'Floración', esc(e.florTxt || '—')) +
      dato('mountains', 'Altitud',
           e.altitud[0] != null ? e.altitud[0] + '–' + e.altitud[1] + ' <small>msnm</small>' : '—') +
      dato('flower', 'Color de la flor', e.color ? '<span class="punto" style="display:inline-block;background:' +
           colorHex(e.color) + '"></span> ' + esc(e.color) : '—') +
    '</div>' +

    '<div class="lateral">' +
      '<section class="bloque"><h3>' + svgIcono('mountains') + 'Rango de altitud</h3>' +
        '<figure class="figura">' + svgPerfil(e) +
        '<figcaption><b>' + esc(caraDe(e) || '—') + '</b> según el perfil de la guía' +
        (e.altitudTxt ? '<br>En el texto: “' + esc(e.altitudTxt) + '”' : '') +
        '</figcaption></figure></section>' +
      '<section class="bloque"><h3>' + svgIcono('map-trifold') + 'Dónde se registró</h3>' +
        '<figure class="figura">' + svgMapa(e) +
        '<figcaption>' + (e.lomas.length - propias.length) + ' de ' + G.lomas.length +
          ' lomas visitadas por la guía' +
          (propias.length ? '<br>+ ' + propias.length + ' de observación propia' : '') +
        '</figcaption></figure>' +
        '<div class="lista-lomas">' + lomasEti + '</div></section>' +
      (e.flor.length ? '<section class="bloque"><h3>' + svgIcono('calendar-blank') + 'Calendario de floración</h3>' + cal + '</section>' : '') +
      (e.habitats.length ? '<section class="bloque"><h3>' + svgIcono('drop') + 'Hábitats</h3><div class="envoltura">' +
        e.habitats.map(function (h) { return '<span class="eti">' + esc(h) + '</span>'; }).join('') +
        (e.cara ? '<span class="eti">' + svgIcono('sun') + 'Cara ' + esc(e.cara.toLowerCase()) +
          ' <small>(texto)</small></span>' : '') +
        '</div></section>' : '') +
    '</div>' +

    '<div class="textos">' +
      bloque('eye', 'Descripción', e.desc) +
      bloque('drop', 'Hábitat', e.hab) +
      bloque('globe-hemisphere-west', 'Distribución', e.dist) +
      bloque('info', 'Situación actual e importancia', e.sit) +
      '<div class="fuente"><b>' + esc(G.meta.titulo) + '</b>, p. ' + e.pag + '.<br>' +
        esc(G.meta.cita) + '</div>' +
    '</div>';

  $('#ficha-int').innerHTML = html;
  vigilarFoto($('#foto-grande'));
  $('#ficha-titulo').textContent = e.comun;
  $('#ficha-int').scrollTop = 0;
  $('#ficha').scrollTop = 0;
  $('#ficha').classList.add('abierta');
  document.body.style.overflow = 'hidden';
  if (empujar !== false) history.pushState({ ficha: id }, '');
}

function cerrarFicha() {
  $('#ficha').classList.remove('abierta');
  document.body.style.overflow = '';
}

/* ---------- eventos ---------- */
$('#rejilla').addEventListener('click', function (ev) {
  var t = ev.target.closest('.tarjeta');
  if (t) abrirFicha(t.dataset.id);
});

$('#ficha-int').addEventListener('click', function (ev) {
  var m = ev.target.closest('[data-foto]');
  if (m) {
    var i = +m.dataset.foto;
    var id = $('#ficha-int').querySelector('[data-foto][aria-current="true"]');
    if (id) id.setAttribute('aria-current', 'false');
    m.setAttribute('aria-current', 'true');
    var g = $('#foto-grande');
    if (g) { g.src = m.querySelector('img').src; vigilarFoto(g); }
    return;
  }
  if (ev.target.id === 'foto-grande') {
    $('#visor-img').src = ev.target.src;
    $('#visor').classList.add('abierto');
  }
});

$('#visor').addEventListener('click', function () {
  $('#visor').classList.remove('abierto');
  $('#visor-img').src = '';
});

$('#volver').addEventListener('click', function () { history.back(); });
window.addEventListener('popstate', function () {
  if ($('#visor').classList.contains('abierto')) { $('#visor').classList.remove('abierto'); return; }
  cerrarFicha();
});

var tq;
$('#q').addEventListener('input', function (ev) {
  F.q = ev.target.value;
  $('#limpiar').classList.toggle('oculto', !F.q);
  sugActual = sugerir(F.q);           // la lista sale ya; la rejilla espera
  pintarSug();
  clearTimeout(tq);
  tq = setTimeout(render, 110);
});
$('#q').addEventListener('keydown', function (ev) {
  if ($('#sug').hidden) return;
  if (ev.key === 'ArrowDown')    { ev.preventDefault(); moverSug(sugSel + 1); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); moverSug(sugSel - 1); }
  else if (ev.key === 'Enter') {
    if (sugSel >= 0) { ev.preventDefault(); elegirSug(sugSel); } else cerrarSug();
  } else if (ev.key === 'Escape') { ev.preventDefault(); cerrarSug(); }
});
$('#q').addEventListener('focus', function () {
  if (F.q) { sugActual = sugerir(F.q); pintarSug(); }
});
// sin esto el teclado del telefono se cierra y el click cae en otro sitio
$('#sug').addEventListener('mousedown', function (ev) { ev.preventDefault(); });
$('#sug').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-sug]');
  if (b) elegirSug(+b.dataset.sug);
});
document.addEventListener('click', function (ev) {
  if (!$('#sug').hidden && !ev.target.closest('.buscador')) cerrarSug();
});
$('#limpiar').addEventListener('click', function () {
  F.q = ''; $('#q').value = ''; $('#limpiar').classList.add('oculto');
  cerrarSug(); render(); $('#q').focus();
});

var panelActual = null;
function abrirPanel(v, cual) {
  cual = cual || '#panel';
  $(cual).classList.toggle('abierto', v);
  if (v && cual === '#panel') setTimeout(pintarRango, 30);
  panelActual = v ? cual : null;
  $('#velo').classList.toggle('abierto', v);
  document.body.style.overflow = v ? 'hidden' : '';
}
function cerrarPanelAbierto() {
  if (panelActual) abrirPanel(false, panelActual);
}
$('#btn-filtros').addEventListener('click', function () { abrirPanel(true); });
$('#cerrar-panel').addEventListener('click', function () { abrirPanel(false); });
$('#velo').addEventListener('click', cerrarPanelAbierto);
$('#btn-aplicar').addEventListener('click', function () { abrirPanel(false); });

function limpiarTodo() {
  F.color = []; F.grupo = []; F.mes = []; F.loma = []; F.habitat = []; F.familia = [];
  quitarAltitud();
}
$('#btn-reset').addEventListener('click', limpiarTodo);

$('#f-altitud').addEventListener('input', function (ev) {
  F.altitud = +ev.target.value;
  pintarAltitud();
  render();
});

function quitarAltitud() {
  F.altModo = 'todas';
  F.altitud = 550;
  F.altDesde = ALT_MIN; F.altHasta = ALT_MAX;
  $('#f-altitud').value = 550;
  $('#f-alt-min').value = ALT_MIN;
  $('#f-alt-max').value = ALT_MAX;
  pintarAltitud(); pintarRango(); render();
}

function pintarAltitud() {
  $$('.segmentado [data-modo]').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.modo === F.altModo ? 'true' : 'false');
  });
  $('#alt-cota').classList.toggle('oculto', F.altModo !== 'cota');
  $('#alt-rango').classList.toggle('oculto', F.altModo !== 'rango');
  $('#f-altitud-val').textContent = F.altitud + ' msnm';
}

function pintarRango() {
  $('#f-alt-min-val').textContent = F.altDesde + ' msnm';
  $('#f-alt-max-val').textContent = F.altHasta + ' msnm';
  var caja = $('#doble'), barra = $('#doble-activa');
  if (!caja || !barra) return;
  var w = caja.clientWidth;
  var tirador = parseFloat(getComputedStyle(document.documentElement)
                  .getPropertyValue('--tirador')) || 20;
  if (!w) return;                       // el panel está oculto: aún no mide
  var p = function (v) { return (v - ALT_MIN) / (ALT_MAX - ALT_MIN); };
  var a = p(F.altDesde) * (w - tirador) + tirador / 2;
  var b = p(F.altHasta) * (w - tirador) + tirador / 2;
  barra.style.left = a + 'px';
  barra.style.width = Math.max(0, b - a) + 'px';
}
$('#f-alt-min').addEventListener('input', function (ev) {
  F.altDesde = +ev.target.value;
  if (F.altDesde > F.altHasta) { F.altHasta = F.altDesde; $('#f-alt-max').value = F.altHasta; }
  pintarRango(); pintarAltitud(); render();
});
$('#f-alt-max').addEventListener('input', function (ev) {
  F.altHasta = +ev.target.value;
  if (F.altHasta < F.altDesde) { F.altDesde = F.altHasta; $('#f-alt-min').value = F.altDesde; }
  pintarRango(); pintarAltitud(); render();
});
$$('.segmentado [data-modo]').forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.dataset.modo === 'todas') { quitarAltitud(); return; }
    F.altModo = b.dataset.modo;
    pintarAltitud();
    setTimeout(pintarRango, 0);        // el bloque acaba de dejar de estar oculto
    render();
  });
});

function abrirInfo(v) {
  if (v) {
    $('#info-libro').innerHTML =
      '<h3>' + svgIcono('book-open') + 'El libro</h3>' +
      '<div class="ficha-libro">' +
        '<p><b>' + esc(G.meta.titulo) + '</b><br>' + esc(G.meta.autores) + '<br>' +
          esc(G.meta.editor) + ', ' + G.meta.anio + '<br>ISBN ' + esc(G.meta.isbn) + '</p>' +
        '<p>' + G.meta.especies + ' especies · ' + G.lomas.length + ' lomas · ' +
          (G.meta.nFotos || '') + ' fotografías</p>' +
        '<p>Fotografías: ' + esc(G.meta.fotografias) + '</p>' +
        '<p>Esta app reproduce el contenido de la guía; los datos salen del PDF ' +
          'publicado por SERFOR. El contenido y las fotografías son de sus autores.</p>' +
      '</div>';
  }
  abrirPanel(v, '#panel-info');
}
$('#btn-info').addEventListener('click', function () { abrirInfo(true); });
$('#cerrar-info').addEventListener('click', function () { abrirInfo(false); });

window.addEventListener('resize', pintarRango);

document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') {
    if (!$('#sug').hidden) { cerrarSug(); return; }
    if ($('#visor').classList.contains('abierto')) { $('#visor').classList.remove('abierto'); return; }
    if (panelActual) { cerrarPanelAbierto(); return; }
    if ($('#ficha').classList.contains('abierta')) history.back();
  }
  if (ev.key === '/' && document.activeElement !== $('#q')) { ev.preventDefault(); $('#q').focus(); }
});

/* ---------- tema ---------- */
var TEMAS = [
  { id: 'auto',   ico: 'circle-half-tilt', corto: 'Automático',
    txt: 'Tema: automático (sigue al sistema)' },
  { id: 'claro',  ico: 'sun',  corto: 'Claro',  txt: 'Tema: claro' },
  { id: 'oscuro', ico: 'moon', corto: 'Oscuro', txt: 'Tema: oscuro' }
];
function leerTema() {
  try { return localStorage.getItem('tema') || 'auto'; } catch (e) { return 'auto'; }
}
function aplicarTema(id) {
  var t = TEMAS.filter(function (x) { return x.id === id; })[0] || TEMAS[0];
  if (t.id === 'auto') document.documentElement.removeAttribute('data-tema');
  else document.documentElement.setAttribute('data-tema', t.id);
  var b = $('#btn-tema');
  b.innerHTML = svgIcono(t.ico);
  b.setAttribute('aria-label', 'Apariencia. ' + t.txt);
  b.setAttribute('title', 'Apariencia · ' + t.txt.replace('Tema: ', 'tema '));
  // guardar antes de repintar: pintarApariencia lee el tema de localStorage,
  // y al reves la marca se quedaba en la opcion anterior
  try { localStorage.setItem('tema', t.id); } catch (e) {}
  if (panelActual === '#panel-apariencia') pintarApariencia();
}
/* ---------- tamaño del texto ----------
   Instalada como app no hay barra de navegador, y por tanto no hay zoom del
   navegador donde agarrarse. Con el sol de la loma y unas gafas de cerca eso
   se nota, asi que el tamaño se elige aqui dentro. */
var TEXTOS = [
  { id: 'normal', corto: 'Normal',     v: 1,    muestra: '13px' },
  { id: 'grande', corto: 'Grande',     v: 1.15, muestra: '15px' },
  { id: 'mayor',  corto: 'Muy grande', v: 1.3,  muestra: '17px' }
];
function leerTexto() {
  try { return localStorage.getItem('texto') || 'normal'; } catch (e) { return 'normal'; }
}
function aplicarTexto(id) {
  var t = TEXTOS.filter(function (x) { return x.id === id; })[0] || TEXTOS[0];
  document.documentElement.style.setProperty('--escala', t.v);
  try { localStorage.setItem('texto', t.id); } catch (e) {}
  if (panelActual === '#panel-apariencia') pintarApariencia();
  pintarRango();                      // el doble deslizador mide en píxeles
}

/* tres opciones no se adivinan pulsando un boton que rota */
function pintarApariencia() {
  var opcion = function (t, clave, actual) {
    var marca = t.ico ? svgIcono(t.ico)
        : '<span class="opcion-aa" style="font-size:' + t.muestra + '">Aa</span>';
    return '<button class="opcion" role="radio" data-' + clave + '="' + t.id +
           '" aria-checked="' + (t.id === actual) + '">' + marca +
           '<span>' + t.corto + '</span>' + svgIcono('check', 'visto') + '</button>';
  };
  var tema = leerTema(), texto = leerTexto();
  $('#apariencia').innerHTML =
      '<div class="grupo" role="radiogroup" aria-label="Tema">' +
        '<h3>' + svgIcono('circle-half-tilt') + 'Tema</h3>' +
        TEMAS.map(function (t) { return opcion(t, 'tema', tema); }).join('') +
      '</div>' +
      '<div class="grupo" role="radiogroup" aria-label="Tamaño del texto">' +
        '<h3>' + svgIcono('book-open') + 'Tamaño del texto</h3>' +
        TEXTOS.map(function (t) { return opcion(t, 'texto', texto); }).join('') +
      '</div>';
}

function abrirApariencia(v) {
  if (v) pintarApariencia();
  abrirPanel(v, '#panel-apariencia');
}
$('#btn-tema').addEventListener('click', function () { abrirApariencia(true); });
$('#cerrar-apariencia').addEventListener('click', function () { abrirApariencia(false); });

$('#apariencia').addEventListener('click', function (ev) {
  var t = ev.target.closest('[data-texto]');
  // el panel se queda abierto en los dos casos: asi se comparan las opciones
  if (t) { aplicarTexto(t.dataset.texto); return; }
  var b = ev.target.closest('[data-tema]');
  if (b) aplicarTema(b.dataset.tema);
});

/* ---------- guardar en el dispositivo ----------
   Vive en su propia vista, detrás del botón de la cabecera. No hay avisos
   flotantes: las fotos son 12 MB del plan de datos de quien la usa, y la
   instalación es cosa suya. El botón lleva un punto cuando queda algo por
   hacer, y ahí se entra cuando se quiera, no cuando la app insista.

   El núcleo de la app (unos 400 KB) sí se guarda al entrar: sin él no hay
   nada que abrir, y ya está descargado. */
var FOTOS = { total: 0, hechas: 0, faltan: [], cache: '',
              bajando: false, cancelar: false };

/* Vale el worker activo, no el que controla esta pestaña. Tras una recarga
   forzada la página navega sin control aunque el worker esté puesto, y
   entonces `controller` es null y no llega ningún controllerchange: la vista
   se quedaba en «Preparando el guardado» hasta recargar otra vez. */
var REG = null, SW_FALLO = false;
function pedirEstado() {
  if (REG && REG.active) REG.active.postMessage({ tipo: 'estado' });
}

function bajarFotos() {
  if (FOTOS.bajando || !FOTOS.faltan.length || !FOTOS.cache) return;
  FOTOS.bajando = true;
  FOTOS.cancelar = false;
  // ahora sí tiene sentido pedirlo: vamos a ocupar sitio a propósito
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  pintarGuardar();

  caches.open(FOTOS.cache).then(function (c) {
    var cola = FOTOS.faltan.slice();
    var enCurso = 0, i = 0;

    // las guarda la página, no el worker: el worker ya no toca las fotos, y
    // así lo que hay en el teléfono es exactamente lo que se pidió
    function una(u) {
      return fetch(u).then(function (res) {
        if (!res || !res.ok) return;
        return c.put(u, res).then(function () {
          FOTOS.hechas = Math.min(FOTOS.total, FOTOS.hechas + 1);
        });
      }).catch(function () {});
    }

    function siguiente() {
      if (FOTOS.cancelar) { if (!enCurso) terminar(); return; }
      while (enCurso < 6 && i < cola.length) {
        enCurso++;
        una(cola[i++]).then(function () {
          enCurso--;
          pintarGuardar();
          if (i >= cola.length && !enCurso) terminar(); else siguiente();
        });
      }
      if (!enCurso && i >= cola.length) terminar();
    }

    function terminar() {
      FOTOS.bajando = false;
      pedirEstado();                    // la cuenta buena la tiene el worker
    }
    siguiente();
  });
}

function cancelarFotos() { FOTOS.cancelar = true; }

function borrarFotos() {
  if (!REG || !REG.active) return;
  FOTOS.cancelar = true;
  REG.active.postMessage({ tipo: 'borrar' });
}

function instalada() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function pintarFotos() {
  var c = $('#offline');
  if (!c) return;
  var f = FOTOS, mb = (G.meta.pesoFotos || 12) + ' MB';

  if (!('serviceWorker' in navigator)) {
    c.innerHTML = '<p class="offline-est">Este navegador no puede guardar la ' +
        'app para usarla sin conexión.</p>';
    return;
  }
  if (SW_FALLO) {
    c.innerHTML = '<p class="offline-est">No se puede guardar en este ' +
        'dispositivo.</p><p class="offline-nota">La app no se está sirviendo ' +
        'por https, y sin eso el navegador no deja guardarla.</p>';
    return;
  }
  if (!f.cache) {
    c.innerHTML = '<p class="offline-est">Comprobando…</p>';
    return;
  }
  if (f.bajando) {
    var pct = f.total ? Math.round(f.hechas * 100 / f.total) : 0;
    c.innerHTML =
        '<p class="offline-est"><b>Guardando fotos…</b> ' + f.hechas + ' de ' +
          f.total + '</p>' +
        '<div class="barra"><i style="width:' + pct + '%"></i></div>' +
        '<p class="offline-nota">Puedes seguir usándola mientras tanto, pero no ' +
          'cierres la app.</p>' +
        '<div class="offline-botones"><button class="btn" data-off="cancelar">' +
          'Cancelar</button></div>';
  } else if (f.total && f.hechas >= f.total) {
    c.innerHTML =
        '<p class="offline-est"><b>Lista para el campo.</b> Las ' + f.total +
          ' fotos están guardadas.</p>' +
        '<p class="offline-nota">Funciona sin señal. Ocupa unos ' + mb +
          ' en el dispositivo.</p>' +
        '<div class="offline-botones"><button class="btn" data-off="borrar">' +
          'Borrar las fotos del dispositivo</button></div>';
  } else if (f.hechas) {
    c.innerHTML =
        '<p class="offline-est"><b>' + f.hechas + ' de ' + f.total +
          ' fotos</b> guardadas.</p>' +
        '<p class="offline-nota">Los textos, el mapa y el perfil ya funcionan ' +
          'sin conexión; faltan fotos.</p>' +
        '<div class="offline-botones">' +
          '<button class="btn principal" data-off="bajar">Seguir descargando</button>' +
          '<button class="btn" data-off="borrar">Borrar</button></div>';
  } else {
    c.innerHTML =
        '<p class="offline-est">La app <b>ya funciona sin conexión</b>: textos, ' +
          'mapa y perfiles se guardaron al entrar.</p>' +
        '<p class="offline-nota">Las fotos no, porque son ' + mb +
          '. Descárgalas con wifi antes de salir al campo.</p>' +
        '<div class="offline-botones"><button class="btn principal" data-off="bajar">' +
          svgIcono('descargar') + 'Descargar las ' + (f.total || G.meta.nFotos) +
          ' fotos · ' + mb + '</button></div>';
  }
}

/* Si está instalada o no, no se puede saber, y más vale no fingirlo.
   `display-mode: standalone` dice si ESTA ventana es la app instalada, no si
   existe una instalación: abierta en una pestaña normal, una app instalada
   contesta que no. Lo único seguro es al revés — el navegador no ofrece
   instalar lo que ya está instalado.
   Así que: botón cuando el navegador lo ofrece, y si no, el camino a mano
   para ese navegador. Instrucciones no son afirmaciones, y la app no se queda
   muda cuando el aviso no llega, que es lo corriente. */
var UA = navigator.userAgent;
function esIOS() {
  return /iPad|iPhone|iPod/.test(UA) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function esAndroid() { return /Android/.test(UA); }
function esFirefox() { return /Firefox\//.test(UA); }
function esMovil() { return esIOS() || esAndroid(); }

function pasosAMano() {
  if (esIOS()) {
    return ['Toca <b>Compartir</b> (el cuadrado con la flecha).',
            'Elige <b>Añadir a pantalla de inicio</b>.'];
  }
  if (esAndroid()) {
    if (esFirefox()) {
      return ['Abre el menú <b>⋮</b>.', 'Elige <b>Instalar</b> o ' +
              '<b>Añadir a pantalla de inicio</b>.'];
    }
    return ['Abre el menú <b>⋮</b> de Chrome, arriba a la derecha.',
            'Elige <b>Añadir a la pantalla principal</b> → <b>Instalar</b>.'];
  }
  if (esFirefox()) {
    return ['Firefox de escritorio no instala este tipo de apps.',
            'En el teléfono sí: ábrela allí con Chrome.'];
  }
  return ['Mira si hay un icono de instalar (<b>⊕</b> o una pantallita) a la ' +
            'derecha de la barra de direcciones.',
          'Si no, menú <b>⋮</b> → <b>Enviar, guardar y compartir</b> → ' +
            '<b>Instalar página como aplicación</b>.'];
}

function pintarInstalar() {
  var c = $('#instalar');
  if (!c) return;

  if (instalada()) {
    c.innerHTML = '<p class="offline-est"><b>Estás en la app instalada.</b></p>' +
        '<p class="offline-nota">Se abre desde su icono, a pantalla completa.</p>';
    return;
  }
  if (instalador) {
    c.innerHTML = '<p class="offline-est">Puede quedarse como un icono más.</p>' +
        '<p class="offline-nota">Abre a pantalla completa, sin barra de ' +
        'navegador, y no hace falta recordar la dirección.</p>' +
        '<div class="offline-botones"><button class="btn principal" data-off="instalar">' +
          svgIcono('flor-lomas') + 'Instalar en el dispositivo</button></div>';
    return;
  }
  // sin aviso del navegador: ni se afirma que falte ni que sobre, se explica
  var pasos = pasosAMano().map(function (p) { return '<li>' + p + '</li>'; }).join('');
  c.innerHTML =
      '<p class="offline-est">Para tenerla como un icono más' +
        (esMovil() ? '' : ' en el escritorio') + ':</p>' +
      '<ol class="pasos">' + pasos + '</ol>' +
      '<p class="offline-nota">¿No aparece la opción? Puede que ya esté ' +
        'instalada: búscala entre tus aplicaciones. El navegador no deja ' +
        'preguntárselo, así que esto no se puede comprobar desde aquí.</p>';
}

/* El punto avisa sin interrumpir: quedan fotos por bajar, o está sin instalar. */
function pintarPendiente() {
  var falta = (FOTOS.total && FOTOS.hechas < FOTOS.total) || !!instalador;
  $('#btn-guardar').querySelector('.pendiente').classList.toggle('oculto', !falta);
}

function pintarGuardar() {
  pintarFotos();
  pintarInstalar();
  pintarPendiente();
}

$('#offline').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-off]');
  if (!b) return;
  if (b.dataset.off === 'bajar') bajarFotos();
  else if (b.dataset.off === 'cancelar') cancelarFotos();
  else if (b.dataset.off === 'borrar') borrarFotos();
});
$('#instalar').addEventListener('click', function (ev) {
  if (!ev.target.closest('[data-off="instalar"]') || !instalador) return;
  instalador.prompt();
  instalador = null;
  window.__instalador = null;         // usado: el navegador no lo repite
  pintarGuardar();
});

function abrirGuardar(v) {
  if (v) pintarGuardar();
  abrirPanel(v, '#panel-guardar');
}
$('#btn-guardar').addEventListener('click', function () { abrirGuardar(true); });
$('#cerrar-guardar').addEventListener('click', function () { abrirGuardar(false); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function (ev) {
    if (!ev.data || ev.data.tipo !== 'estado') return;
    FOTOS.cache = ev.data.cache;
    FOTOS.total = ev.data.total;
    FOTOS.hechas = ev.data.hechas;
    FOTOS.faltan = ev.data.faltan;
    pintarGuardar();
  });
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      REG = reg;
      pedirEstado();
    }).catch(function () {
      SW_FALLO = true;
      pintarGuardar();
    });
  });
}

// el aviso lo recoge el script de la cabecera, que corre antes que esto
var instalador = window.__instalador || null;
window.__alInstalable = function () {
  instalador = window.__instalador;
  pintarGuardar();
};
window.addEventListener('appinstalled', function () {
  instalador = null;
  window.__instalador = null;
  pintarGuardar();
});

/* ---------- arranque ---------- */
aplicarTema(leerTema());
aplicarTexto(leerTexto());
pintarChipsRapidos();
pintarFiltros();
pintarAltitud();
pintarRango();
pintarIconos(document);
pintarGuardar();
render();
medirCabecera();

})();
