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
    e.comun, e.cientifico, e.autoria, e.familia, e.grupo, e.color,
    e.habitats.join(' '),
    e.lomas.map(function (id) { return nombreLoma[id]; }).join(' '),
    e.n
  ].join(' '));
});

/* ---------- estado ---------- */
var ALT_MIN = 100, ALT_MAX = 1000;
var F = { q: '', color: [], grupo: [], mes: [], loma: [], habitat: [], familia: [],
          altModo: 'cota', altitud: null, altDesde: ALT_MIN, altHasta: ALT_MAX };

function altActiva() {
  return F.altModo === 'cota'
      ? F.altitud != null
      : (F.altDesde > ALT_MIN || F.altHasta < ALT_MAX);
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
  var tot = G.especies.length;
  $('#cuenta').textContent = r.length === tot
      ? tot + ' especies'
      : r.length + ' de ' + tot + ' especies';
  $('#btn-limpiar-filtros').classList.toggle('oculto', activos() === 0 && !F.q);
  $('#btn-aplicar').textContent = r.length === tot
      ? 'Ver las ' + tot
      : 'Ver ' + r.length + (r.length === 1 ? ' resultado' : ' resultados');
  sincronizarChips();
}

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

  $('#f-loma').innerHTML = G.lomas.map(function (l) {
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
  e.lomas.forEach(function (id) {
    var p = svg.querySelector('[data-loma="' + id + '"]');
    if (p) p.classList.add('activa');
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

  var lomasEti = e.lomas.map(function (id2) {
    return '<span class="eti activa">' + svgIcono('map-pin') + esc(nombreLoma[id2] || id2) + '</span>';
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
      '<div class="etiquetas">' + etiquetas + '</div>' +
    '</header>' +

    '<div class="datos">' +
      dato('ruler', 'Altura', esc(e.alturaTxt || '—')) +
      dato('calendar-blank', 'Floración', esc(e.florTxt || '—')) +
      dato('mountains', 'Altitud',
           e.altitud[0] != null ? e.altitud[0] + '–' + e.altitud[1] + ' <small>msnm</small>' : '—') +
      dato('flower', 'Color', e.color ? '<span class="punto" style="display:inline-block;background:' +
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
        '<figcaption>' + e.lomas.length + ' de ' + G.lomas.length + ' lomas visitadas</figcaption></figure>' +
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
    if (g) g.src = m.querySelector('img').src;
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
  clearTimeout(tq);
  tq = setTimeout(render, 110);
});
$('#limpiar').addEventListener('click', function () {
  F.q = ''; $('#q').value = ''; $('#limpiar').classList.add('oculto'); render(); $('#q').focus();
});

function abrirPanel(v) {
  $('#panel').classList.toggle('abierto', v);
  if (v) setTimeout(pintarRango, 30);
  $('#velo').classList.toggle('abierto', v);
  document.body.style.overflow = v ? 'hidden' : '';
}
$('#btn-filtros').addEventListener('click', function () { abrirPanel(true); });
$('#cerrar-panel').addEventListener('click', function () { abrirPanel(false); });
$('#velo').addEventListener('click', function () { abrirPanel(false); });
$('#btn-aplicar').addEventListener('click', function () { abrirPanel(false); });

function limpiarTodo() {
  F.color = []; F.grupo = []; F.mes = []; F.loma = []; F.habitat = []; F.familia = [];
  quitarAltitud();
}
$('#btn-reset').addEventListener('click', limpiarTodo);
$('#btn-limpiar-filtros').addEventListener('click', function () {
  F.q = ''; $('#q').value = ''; $('#limpiar').classList.add('oculto');
  limpiarTodo();
});

$('#f-altitud').addEventListener('input', function (ev) {
  F.altitud = +ev.target.value;          // tocarlo lo activa; se apaga con Quitar
  pintarAltitud();
  render();
});

function quitarAltitud() {
  F.altitud = null;
  F.altDesde = ALT_MIN; F.altHasta = ALT_MAX;
  $('#f-altitud').value = 550;
  $('#f-alt-min').value = ALT_MIN;
  $('#f-alt-max').value = ALT_MAX;
  pintarAltitud(); pintarRango(); render();
}
$('#alt-quitar').addEventListener('click', quitarAltitud);

function pintarAltitud() {
  var act = altActiva();
  $('#alt-quitar').classList.toggle('oculto', !act);
  $('#alt-cota').classList.toggle('apagado', F.altitud == null);
  $('#alt-rango').classList.toggle('apagado',
      F.altDesde === ALT_MIN && F.altHasta === ALT_MAX);
  $('#f-altitud-val').textContent =
      F.altitud == null ? 'sin filtrar' : F.altitud + ' msnm';
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
    F.altModo = b.dataset.modo;
    $$('.segmentado [data-modo]').forEach(function (o) {
      o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
    });
    $('#alt-cota').classList.toggle('oculto', F.altModo !== 'cota');
    $('#alt-rango').classList.toggle('oculto', F.altModo !== 'rango');
    pintarAltitud(); pintarRango(); render();
  });
});

$('#btn-info').addEventListener('click', function () {
  alert(G.meta.titulo + '\n' + G.meta.autores + '\n' + G.meta.editor + ', ' + G.meta.anio +
        '\nISBN ' + G.meta.isbn +
        '\n\n' + G.meta.especies + ' especies · 22 lomas' +
        '\nFotografías: ' + G.meta.fotografias +
        '\n\nEsta app reproduce el contenido de la guía. Los datos se extrajeron del PDF publicado por SERFOR.');
});

window.addEventListener('resize', pintarRango);

document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') {
    if (!$('#menu-tema').hidden) { abrirMenuTema(false); $('#btn-tema').focus(); return; }
    if ($('#visor').classList.contains('abierto')) { $('#visor').classList.remove('abierto'); return; }
    if ($('#panel').classList.contains('abierto')) { abrirPanel(false); return; }
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
  b.setAttribute('aria-label', t.txt);
  b.setAttribute('title', t.txt);
  if (!$('#menu-tema').hidden) pintarMenuTema();
  try { localStorage.setItem('tema', t.id); } catch (e) {}
}
/* menu de tema: tres opciones no se adivinan pulsando un boton que rota */
function pintarMenuTema() {
  var actual = leerTema();
  $('#menu-tema').innerHTML = TEMAS.map(function (t) {
    return '<button role="menuitemradio" data-tema="' + t.id + '" aria-checked="' +
           (t.id === actual) + '">' + svgIcono(t.ico) +
           '<span>' + t.corto + '</span>' +
           svgIcono('check', 'visto') + '</button>';
  }).join('');
}

function abrirMenuTema(v) {
  var m = $('#menu-tema');
  m.hidden = !v;
  $('#btn-tema').setAttribute('aria-expanded', v ? 'true' : 'false');
  if (v) {
    pintarMenuTema();
    var sel = m.querySelector('[aria-checked="true"]') || m.querySelector('button');
    if (sel) sel.focus();
  }
}

$('#btn-tema').addEventListener('click', function (ev) {
  ev.stopPropagation();
  abrirMenuTema($('#menu-tema').hidden);
});

$('#menu-tema').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-tema]');
  if (!b) return;
  aplicarTema(b.dataset.tema);
  abrirMenuTema(false);
  $('#btn-tema').focus();
});

document.addEventListener('click', function (ev) {
  if (!$('#menu-tema').hidden && !ev.target.closest('.menu-envoltura')) {
    abrirMenuTema(false);
  }
});

/* ---------- arranque ---------- */
aplicarTema(leerTema());
pintarChipsRapidos();
pintarFiltros();
pintarAltitud();
pintarRango();
pintarIconos(document);
render();

})();
