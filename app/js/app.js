/* Guía de Flora de las Lomas de Lima — lógica de la app
   Sin dependencias, sin red. Los datos llegan en window.GUIA. */
(function () {
'use strict';

var G = window.GUIA, ICO = window.ICONOS || {}, DIBH = window.DIBUJOS || {};
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
    // los colores de la flor y no un icono: el loto era el mismo para las 134
    // y no decia nada. El color es lo que se mira en campo.
    var pts = coloresDe(e).slice(0, 3).map(colorHex).filter(Boolean);
    meter({ tipo: 'Especie', puntos: pts, ico: 'flower-lotus', et: e.comun,
            sub: e.cientifico, cursiva: true, id: e.id });
    // los sinonimos no vienen de la guia: salen de datos/propio/sinonimos.csv
    (e.sinonimos || []).forEach(function (s) {
      meter({ tipo: 'Sinónimo', puntos: pts, ico: 'flower-lotus', et: s,
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
        : (s.puntos && s.puntos.length
            ? '<span class="puntos">' + s.puntos.map(function (h) {
                return '<span class="punto" style="background:' + h + '"></span>';
              }).join('') + '</span>'
            : svgIcono(s.ico));
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
/* La altitud va por escalones de 100, de 100 a 1000, que es lo que abarca el
   libro. Comprobado sobre las 134: con ese paso no se escapa ninguna -toda
   banda de la guia contiene al menos un multiplo de 100, porque los extremos
   van de 50 en 50 y la mas estrecha mide 50- y los diez juntos dan las 134,
   asi que no marcar nada sigue siendo «todas». */
var ALT_MIN = 100, ALT_MAX = 1000, ALT_PASO = 100;
var ALTURAS = (function () {
  var v = [];
  for (var h = ALT_MIN; h <= ALT_MAX; h += ALT_PASO) v.push(h);
  return v;
})();
var F = { q: '', color: [], grupo: [], mes: [], loma: [], habitat: [], familia: [],
          conserv: [], cara: [], orden: 'guia', alt: [] };

/* La cara sale del dibujo del perfil, que es el unico dato que tienen las 134
   -el texto solo lo dice en 103-. Se calcula una vez y no en cada filtrado. */
G.especies.forEach(function (e) { e._cara = caraDe(e); });

/* El criterio y el sentido van aparte: antes «de menos lomas a más» metia las
   dos cosas en una opcion, y para verlo al reves hacia falta otra opcion mas.
   Asi son cinco criterios y un interruptor, y no diez opciones. */
/* Cada criterio lleva dos nombres. El largo es el del panel, donde hay sitio
   y donde se elige. El corto es el del botón, que comparte fila con el
   recuento y con «Filtros»: medidos, «Presencia en lomas» pide 112 px y
   «Nombre científico» 106, y en un móvil de 360 la fila entera sólo tiene 4
   de sobra. El icono de al lado ya dice «ordenar», así que en el botón basta
   con por qué. */
var ORDENES = [
  { id: 'guia',       txt: 'Guía',              corto: 'Guía',
    ico: 'book-open', dir: ['1 → 134', '134 → 1'] },
  { id: 'comun',      txt: 'Nombre común',      corto: 'Común',
    ico: 'text-aa',   dir: ['A → Z', 'Z → A'] },
  { id: 'cientifico', txt: 'Nombre científico', corto: 'Científico',
    ico: 'flask',     dir: ['A → Z', 'Z → A'] },
  { id: 'altitud',    txt: 'Altitud',           corto: 'Altitud', ico: 'mountains',
    dir: ['Baja → Alta', 'Alta → Baja'] },
  /* Lo que se ordena es en cuantas de las 22 lomas se registro la especie:
     arriba, con «Pocas → Muchas», salen las que solo estan en una o dos.
     «N.º de lomas» nombraba la cuenta; «Presencia en lomas» nombra lo que
     esa cuenta significa. */
  { id: 'lomas',      txt: 'Presencia en lomas', corto: 'Lomas', ico: 'map-pin',
    dir: ['Pocas → Muchas', 'Muchas → Pocas'] }
];
function ordenActual() {
  return ORDENES.filter(function (x) { return x.id === F.orden; })[0] || ORDENES[0];
}
function guardado(clave, porDefecto) {
  try { return localStorage.getItem(clave) || porDefecto; } catch (e) { return porDefecto; }
}
/* De entrada, por nombre comun: el orden del libro sirve a quien tenga el
   libro delante, y no es el caso casi nunca. Quien lo quiera lo tiene en la
   lista. */
F.orden = guardado('orden', 'comun');
F.dir = guardado('ordenDir', 'asc');

var CONSERV = [
  { id: 'endemica',  txt: 'Endémica del Perú', ok: function (e) { return e.endemico; } },
  { id: 'amenazada', txt: 'Amenazada',         ok: function (e) { return !!e.amenaza; } },
  { id: 'nonativa',  txt: 'No nativa',         ok: function (e) { return e.origen !== 'Nat'; } }
];
function conservOk(e, id) {
  for (var i = 0; i < CONSERV.length; i++) if (CONSERV[i].id === id) return CONSERV[i].ok(e);
  return false;
}

/* «Todas» es una opción, no una posición del deslizador. Antes la cota
   arrancaba en mitad de la barra diciendo «sin filtrar», y al volver a ese
   mismo punto ya significaba 550: el mismo sitio, dos cosas distintas. */
function altActiva() { return F.alt.length > 0; }

/* Cada numero de la escala es el TECHO de una franja de 100 m: 100 es «del mar
   a los 100», 500 es «de 400 a 500». Antes era una cota suelta y marcar 100 no
   parecia llegar al agua, que es justo lo que el dibujo tiene que contar.

   El criterio cambia con ello: ya no es «la especie vive a esa cota» sino «la
   especie pisa esa franja». Se nota: la franja de 800 pasa de 35 especies a
   51, porque ahi entran las que llegan a 750 y antes se caian por no tocar el
   800 clavado. El «mayor que» del suelo evita que una especie que acaba justo
   en el borde aparezca tambien en la franja de encima, donde solo estaria por
   un punto; con «mayor o igual» esa misma franja se iba a 68. */
function altFranja(h) { return [h - ALT_PASO, h]; }
function altPisa(e, h) {
  var lo = h - ALT_PASO;
  return (lo <= 0 || e.altitud[1] > lo) && e.altitud[0] <= h;
}

/* Las franjas marcadas, agrupadas en tramos seguidos. De aqui salen tanto las
   manchas del dibujo como las fichas, asi que fundirse es automatico: lo que
   se guarda es un conjunto de alturas, no una lista de tramos. */
function tramosAlt() {
  var v = F.alt.slice().sort(function (a, b) { return a - b; }), r = [];
  v.forEach(function (h) {
    var u = r[r.length - 1];
    if (u && h === u[1] + ALT_PASO) u[1] = h; else r.push([h, h]);
  });
  return r;
}
function textoTramo(r) {
  return (r[0] - ALT_PASO) + '–' + r[1] + ' msnm';
}

/* Lo que cuenta el botón de filtros. Dos cosas que no se ven venir.

   La loma no está: es dónde se mira, no qué se busca, y meterla aquí la metía
   también en «Limpiar».

   Y un tramo seguido cuenta como UNO. Tocar «Estación húmeda» es un gesto y
   una idea, y el botón decía 6; arrastrar del amarillo al rosado es «los
   cálidos», y decía 4. La altitud ya se contaba así desde antes, así que esto
   es ponerle a los meses y a los colores la misma vara. */
function corridas(puestos, orden) {
  if (!puestos.length) return 0;
  var hay = {}, n = 0;
  puestos.forEach(function (v) { hay[v] = 1; });
  for (var i = 0; i < orden.length; i++) {
    if (hay[orden[i]] && !(i && hay[orden[i - 1]])) n++;
  }
  return n;
}

function activos() {
  // «Sin flor vistosa» va aparte: no está en el espectro, así que nunca es
  // parte de un tramo
  return corridas(F.color, ORDEN_COLORES) +
         (F.color.indexOf(SIN_FLOR) >= 0 ? 1 : 0) +
         corridas(F.mes, ORDEN_MESES) +
         F.loma.length +
         F.grupo.length + F.habitat.length + F.familia.length +
         F.conserv.length + F.cara.length +
         tramosAlt().length;
}
function alterna(lista, valor) {
  var i = lista.indexOf(valor);
  if (i < 0) lista.push(valor); else lista.splice(i, 1);
}

function coloresDe(e) {
  return (e.colores && e.colores.length) ? e.colores : (e.color ? [e.color] : []);
}

/* `omitir` deja un filtro fuera. Sirve para contar cuantas especies florecen
   en cada mes con todo lo demas puesto -la loma, el color- pero sin el propio
   filtro de meses: contandolo, al elegir agosto los otros once se irian a
   cero y la grafica dejaria de decir nada. */
/* El sitio no es un filtro más: es el universo. Las 134 de la guía son 48 si
   estás parado en Pachacámac, y sobre esas 48 muerden los filtros. De ahí que
   el recuento diga 7/48 y no 7/134: el total que importa es el de donde uno
   está, y cambiar de loma cambia el total, no el resultado de un filtro. */
function enSitio(e) {
  if (!F.loma.length) return true;
  for (var i = 0; i < F.loma.length; i++) {
    if (e.lomas.indexOf(F.loma[i]) >= 0) return true;
  }
  return false;
}

function totalSitio() {
  if (!F.loma.length) return G.especies.length;
  var n = 0;
  for (var i = 0; i < G.especies.length; i++) if (enSitio(G.especies[i])) n++;
  return n;
}

function filtrar(omitir) {
  var q = sinTildes(F.q).trim();
  var term = q ? q.split(/\s+/) : [];
  return G.especies.filter(function (e) {
    for (var i = 0; i < term.length; i++) if (e._b.indexOf(term[i]) < 0) return false;
    // basta con que coincida cualquiera de sus colores: una flor entre
    // blanca y amarilla debe salir en las dos busquedas
    if (omitir !== 'color' && F.color.length && !coloresDe(e).some(function (c) {
          return F.color.indexOf(c) >= 0; })) return false;
    if (F.grupo.length   && F.grupo.indexOf(e.grupo) < 0) return false;
    if (F.familia.length && F.familia.indexOf(e.familia) < 0) return false;
    if (omitir !== 'mes' && F.mes.length &&
        !F.mes.some(function (m) { return e.flor.indexOf(m) >= 0; })) return false;
    if (omitir !== 'sitio' && !enSitio(e)) return false;
    if (F.habitat.length && !F.habitat.some(function (h) { return e.habitats.indexOf(h) >= 0; })) return false;
    // aqui SI se cruzan: son atributos sueltos y marcarlos es pedirlos todos.
    // «Endemica + Amenazada» son 2 especies, no 40. Por eso se dibujan como
    // casillas y no como fichas.
    if (F.conserv.length && !F.conserv.every(function (c) { return conservOk(e, c); })) return false;
    if (F.cara.length && !F.cara.every(function (l) { return ocupaCara(e, l); })) return false;
    if (omitir !== 'alt' && F.alt.length) {
      if (e.altitud[0] == null || e.altitud[1] == null) return false;
      // vale con que pise alguna de las franjas marcadas, como con los meses
      if (!F.alt.some(function (h) { return altPisa(e, h); })) return false;
    }
    return true;
  });
}

var COMPARA = {
  guia:       function (a, b) { return a.n - b.n; },
  comun:      function (a, b) { return a.comun.localeCompare(b.comun, 'es'); },
  cientifico: function (a, b) { return a.cientifico.localeCompare(b.cientifico, 'es'); },
  altitud:    function (a, b) { return (a.altitud[0] - b.altitud[0]) ||
                                       (a.altitud[1] - b.altitud[1]) || a.n - b.n; },
  lomas:      function (a, b) { return (a.lomas.length - b.lomas.length) || a.n - b.n; }
};

/* Con un color activo, delante las que lo tienen como principal: las otras
   coinciden por un detalle (el centro amarillo de una flor blanca, por
   ejemplo) y son menos probables. Eso manda en el orden de la guia, que es el
   de por defecto; si se ha pedido otro orden, manda el pedido y el color solo
   desempata. */
function ordenar(lista) {
  var base = COMPARA[F.orden] || COMPARA.guia;
  // el sentido invierte el criterio, no la prioridad del color
  var cmp = F.dir === 'desc' ? function (a, b) { return -base(a, b); } : base;
  if (!F.color.length) return lista.slice().sort(cmp);
  var pri = function (e) { return F.color.indexOf(e.color) >= 0 ? 0 : 1; };
  return lista.slice().sort(F.orden === 'guia'
      ? function (a, b) { return pri(a) - pri(b) || cmp(a, b); }
      : function (a, b) { return cmp(a, b) || pri(a) - pri(b); });
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
/* Los renders se agrupan por cuadro de pantalla. Marcar filtros deprisa
   encadenaba un render completo por pulsacion -24 ms cada uno en escritorio,
   el triple en un telefono- y se notaba. Ahora varias pulsaciones seguidas
   dentro del mismo cuadro producen un solo render: medido, 60 pulsaciones
   encadenadas pasan de 1,45 s a lo que cuesta uno.

   Con el documento oculto se hace a secas: ahi requestAnimationFrame no
   llega a dispararse nunca y el estado se quedaria sin pintar. */
var renderPedido = null;
function render() {
  if (document.hidden) { renderYa(); return; }
  if (renderPedido) return;
  renderPedido = requestAnimationFrame(function () {
    renderPedido = null;
    renderYa();
  });
}

function renderYa() {
  var r = ordenar(filtrar());
  $('#rejilla').innerHTML = r.map(tarjeta).join('');
  $('#vacio').classList.toggle('oculto', r.length > 0);
  var cola = pintarCola();
  /* Atrás y adelante dentro de una ficha recorren lo que se ve y nada más:
     con la cola plegada no se cuela en el paso de una ficha a otra. */
  ultimo = colaAbierta ? r.concat(cola) : r;
  ultimoN = r.length;
  pintarCuenta();
  var tot = totalSitio();
  $('#btn-aplicar').textContent = r.length === tot
      ? 'Ver las ' + tot
      : 'Ver ' + r.length + (r.length === 1 ? ' resultado' : ' resultados');
  pintarHerramientas();
  sincronizarChips();
  mirarBarra();
}

/* Quitar todo borraba de golpe lo que habia costado varios toques, y con ello
   la loma en la que uno esta parado. Dejar la loma fuera del borrado la
   convertiria en un filtro aparte; es mas honesto borrarlo todo y ofrecer
   devolverlo. Vale para cualquier filtro, no solo para la loma. */
/* La tostada: un aviso de abajo que se va solo y lleva su cuenta atras a la
   vista. No va en la fila de fichas porque no es un filtro puesto; es algo que
   acaba de pasar y que caduca. */
var relojTostada = 0, msTostada = 0, accionTostada = null, alCerrarTostada = null;

function tostada(texto, accion, fn, ms, alCerrar) {
  var t = $('#tostada');
  $('#tostada-txt').textContent = texto;
  $('#tostada-accion').textContent = accion;
  accionTostada = fn;
  alCerrarTostada = alCerrar || null;
  msTostada = ms;
  t.style.removeProperty('--fuga');
  t.classList.remove('oculto', 'corriendo', 'yendose');
  void t.offsetWidth;                         // reiniciar la barra
  $('#tostada-barra').style.animationDuration = ms + 'ms';
  t.classList.add('corriendo');
  clearTimeout(relojTostada);
  relojTostada = setTimeout(function () { quitarTostada(); }, ms);
}

/* Cerrarla es cerrarla: si el aviso se va, lo que ofrecia se va con el. Por
   eso quien la muestra le pasa que hacer al cerrarse, y no hay dos relojes
   contando por su cuenta. */
function quitarTostada(deslizando) {
  clearTimeout(relojTostada);
  var t = $('#tostada'), fn = alCerrarTostada;
  accionTostada = null; alCerrarTostada = null;
  t.classList.remove('corriendo');
  if (deslizando) {
    t.classList.add('yendose');
    setTimeout(function () { t.classList.add('oculto'); }, 200);
  } else {
    t.classList.add('oculto');
  }
  if (fn) fn();
}

$('#tostada-accion').addEventListener('click', function () {
  var fn = accionTostada;
  accionTostada = null;
  alCerrarTostada = null;                     // se acepto: no es un cierre
  clearTimeout(relojTostada);
  $('#tostada').classList.add('oculto');
  $('#tostada').classList.remove('corriendo');
  if (fn) fn();
});

$('#tostada-cerrar').addEventListener('click', function () { quitarTostada(); });

/* Y con el dedo: un empujon de lado se la lleva, como cualquier aviso de
   movil. Menos de 55 px no cuenta, y un arrastre mas vertical que horizontal
   tampoco: eso es la pagina moviendose. */
var fuga = null;
$('#tostada').addEventListener('pointerdown', function (ev) {
  if (ev.target.closest('button')) return;
  fuga = { x: ev.clientX, y: ev.clientY, dx: 0, listo: false };
  clearTimeout(relojTostada);
  $('#tostada').classList.remove('corriendo');
});
$('#tostada').addEventListener('pointermove', function (ev) {
  if (!fuga) return;
  fuga.dx = ev.clientX - fuga.x;
  var dy = Math.abs(ev.clientY - fuga.y);
  if (!fuga.listo && Math.abs(fuga.dx) > 8 && Math.abs(fuga.dx) > dy) {
    fuga.listo = true;
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
  }
  if (!fuga.listo) return;
  var t = $('#tostada');
  t.style.transition = 'none';
  t.style.transform = 'translateX(' + fuga.dx + 'px)';
  t.style.opacity = Math.max(0, 1 - Math.abs(fuga.dx) / 220);
});
['pointerup', 'pointercancel'].forEach(function (tipo) {
  $('#tostada').addEventListener(tipo, function () {
    if (!fuga) return;
    var dx = fuga.dx, listo = fuga.listo;
    fuga = null;
    var t = $('#tostada');
    t.style.removeProperty('transition');
    t.style.removeProperty('transform');
    t.style.removeProperty('opacity');
    if (listo && Math.abs(dx) > 55) {
      t.style.setProperty('--fuga', (dx > 0 ? 340 : -340) + 'px');
      quitarTostada(true);
    } else if (accionTostada || alCerrarTostada) {
      // vuelve a su sitio y la cuenta empieza de nuevo: si la has tocado, es
      // que la estabas mirando
      void t.offsetWidth;
      t.classList.add('corriendo');
      clearTimeout(relojTostada);
      relojTostada = setTimeout(function () { quitarTostada(); }, msTostada);
    }
  });
});

/* Seis segundos y no doce: es el tiempo que se mira un aviso, y ademas se
   puede cerrar a mano o de un manotazo. */
var ESPERA_DESHACER = 6000;
var borrado = null, huellaBorrado = null;
var GUARDABLES = ['q', 'color', 'grupo', 'mes', 'loma', 'habitat', 'familia',
                  'conserv', 'cara', 'alt'];

function huellaFiltros() {
  return GUARDABLES.map(function (k) { return F[k]; }).join('|');
}

/* Borrar y, acto seguido, apuntar como queda: mientras siga asi, lo borrado se
   puede devolver; al primer toque en cualquier filtro, ya no. */
function tirarFiltros(tambienBusqueda) {
  if (activos() || F.q) {
    borrado = {};
    GUARDABLES.forEach(function (k) {
      borrado[k] = F[k] instanceof Array ? F[k].slice() : F[k];
    });
  }
  huellaBorrado = null;
  if (tambienBusqueda) quitarBusqueda(true);
  limpiarTodo();                     // repinta
  if (borrado) {
    huellaBorrado = huellaFiltros();
    tostada('Se quitaron los filtros', 'Deshacer', devolverBorrado,
            ESPERA_DESHACER, olvidarBorrado);
  }
}

function olvidarBorrado() {
  borrado = null; huellaBorrado = null;
  pintarHerramientas();
}

function devolverBorrado() {
  if (!borrado) return;
  var v = borrado;
  borrado = null; huellaBorrado = null;
  GUARDABLES.forEach(function (k) { F[k] = v[k]; });
  $('#q').value = F.q;
  $('#limpiar').classList.toggle('oculto', !F.q);
  render();
}

var compacto = false;

/* Antes aquí había una fila de fichas, una por filtro puesto, cada una con su
   aspa. Decía qué estaba filtrando y dejaba quitarlo de un toque. Se quita.

   Costaba una fila entera encima de las fotos, y en un móvil no cabía: con
   más de ocho fichas había que plegarlas tras un «+3 más», y en la barra
   pegada se deslizaban a los lados, así que de todas formas no se veían
   todas. Lo que las sustituye son dos cosas que no ocupan ninguna fila: el
   recuento pasa a decir 7/48 -o sea, algo está mordiendo- y el botón de
   filtros lleva encima cuántos hay. Qué filtros son exactamente se ve
   abriendo el panel, que es donde se editan de todos modos. */
function pintarHerramientas() {
  // en cuanto se vuelve a filtrar, lo borrado deja de estar a mano
  if (borrado && huellaBorrado !== null && huellaFiltros() !== huellaBorrado) {
    borrado = null; huellaBorrado = null;
    quitarTostada();
  }
  /* El número y no solo el color. El color solo falla dos veces a la vez: a
     pleno sol en la loma, y para quien no distingue el verde. Una cifra se ve
     en los dos casos, y además dice cuántos son, que es lo que uno quiere
     saber antes de abrir el panel. */
  /* Lo escrito se ve en el propio buscador: un filo del color de acento todo
     alrededor. No es el mismo trato que el del boton de filtros -que se
     rellena entero- porque no son la misma cosa: una palabra no es un filtro.
     Pero comparten color, que es lo que dice «esto esta acortando la lista». */
  $('.buscador').classList.toggle('con-texto', !!F.q);
  var n = activos();
  var b = $('#btn-filtros');
  b.classList.toggle('puesto', n > 0);
  $('#filtros-n').textContent = n ? n : '';
  b.setAttribute('aria-label',
      n ? 'Filtros, ' + n + (n === 1 ? ' puesto' : ' puestos') : 'Filtros');
}



/* «1 → 134» llevaba la flecha en texto, y la del tipo de letra se apoya en la
   linea base: al lado de las cifras se veia caida. Va la del juego de iconos,
   que se centra con ellas. */
function conFlecha(txt) {
  return esc(txt).split('→').map(function (t) { return t.trim(); })
      .join(svgIcono('arrow-right', 'flechita'));
}

function pintarOrden() {
  $('#orden-lista').innerHTML = ORDENES.map(function (o) {
    return '<button class="opcion" role="radio" data-orden="' + o.id +
        '" aria-checked="' + (F.orden === o.id) + '">' + svgIcono(o.ico) +
        '<span>' + esc(o.txt) + '</span>' + svgIcono('check', 'visto') + '</button>';
  }).join('');
  // el sentido se nombra segun el criterio: «A → Z» dice mas que «ascendente»
  var d = ordenActual().dir;
  $('#orden-dir').innerHTML = ['asc', 'desc'].map(function (s, i) {
    // sin flecha de subir o bajar delante: al lado de «1 → 134» eran dos
    // flechas que apuntaban a cosas distintas, y la horizontal ya lo dice todo
    return '<button data-dir="' + s + '" aria-pressed="' + (F.dir === s) + '">' +
        conFlecha(d[i]) + '</button>';
  }).join('');
  pintarIconos($('#panel-orden'));
}

/* El boton lleva siempre el criterio puesto, porque ordenar siempre lo esta:
   la lista sale en algun orden, se haya elegido o no. Antes con «Guia» de
   arriba abajo ponia «Ordenar» y se quedaba apagado, como si no hubiera nada
   elegido, y el mismo «Guia» al reves si se marcaba: el mismo criterio se
   veia de dos maneras. Tampoco se marca en color: el color es de lo que quita
   especies, y un orden solo las mueve. El nombre ya dice cual es. */
function pintarBotonOrden() {
  var o = ordenActual();
  var i = F.dir === 'desc' ? 1 : 0;
  var b = $('#btn-orden');
  /* El icono lleva el sentido: sort-ascending o sort-descending. Se sigue
     leyendo como «ordenar» —son rayas de distinto largo con su flecha— pero
     ademas dice hacia donde, que con la etiqueta al lado deja el estado
     entero a la vista: criterio y sentido. */
  b.querySelector('.ico').outerHTML =
      svgIcono(F.dir === 'desc' ? 'sort-descending' : 'sort-ascending');
  $('#btn-orden-txt').textContent = o.corto || o.txt;
  b.setAttribute('aria-label', 'Ordenar. Ahora: ' + o.txt + ', ' + o.dir[i]);
}

function elegirOrden(id, dir) {
  if (id) { F.orden = id; try { localStorage.setItem('orden', id); } catch (e) {} }
  if (dir) { F.dir = dir; try { localStorage.setItem('ordenDir', dir); } catch (e) {} }
  pintarOrden();
  pintarBotonOrden();
  render();
}

function abrirOrden(v) {
  if (v) pintarOrden();
  abrirPanel(v, '#panel-orden');
}
$('#btn-orden').addEventListener('click', function () { abrirOrden(true); });
$('#cerrar-orden').addEventListener('click', function () { abrirOrden(false); });
$('#orden-lista').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-orden]');
  if (b) elegirOrden(b.dataset.orden, null);
});
$('#orden-dir').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-dir]');
  if (b) elegirOrden(null, b.dataset.dir);
});

/* El corte de ancho, que lo usa el rótulo del buscador. El modo de búsqueda
   que había aquí -el buscador saltaba de abajo arriba al enfocarlo- se fue
   con la barra de abajo: ahora ya está arriba y no hay nada que mover. */
var ESTRECHO = window.matchMedia('(max-width: 600px)');

/* El rótulo del buscador. No dice «loma»: la loma se elige en el panel, con
   su mapa, así que invitar a escribirla aquí manda al sitio equivocado
   -escribirla sigue funcionando, pero es un atajo, no el camino-. Dice
   «color», que es lo primero que se mira en una flor. Y en el móvil caben
   dos ejemplos, no tres. */
function pintarRotuloBusca() {
  $('#q').placeholder = ESTRECHO.matches
      ? 'Buscar por color, nombre…'
      : 'Buscar por nombre, color, familia…';
}
pintarRotuloBusca();
ESTRECHO.addEventListener('change', pintarRotuloBusca);

function quitarBusqueda(callado) {
  F.q = ''; $('#q').value = ''; $('#limpiar').classList.add('oculto');
  cerrarSug();
  if (!callado) render();             // limpiarTodo ya repinta por su cuenta
}

/* Con una ventana abierta, lo de detras no contesta. El velo para los toques,
   pero el menu del navegador se saca del elemento que hay bajo el dedo y
   seguia saliendo el de la foto de la tarjeta tapada. Dentro de la ventana el
   menu sigue valiendo, que ahi si hay texto que copiar. */
document.addEventListener('contextmenu', function (ev) {
  if (!document.documentElement.classList.contains('bloqueado')) return;
  if (ev.target.closest && ev.target.closest('.panel, .tostada, .ficha')) return;
  ev.preventDefault();
});

/* ---------- la barra que se queda arriba al bajar ---------- */
var ultimoN = 0;
/* 7/48 y no «7 de 134 especies». El total es el de la loma elegida, así que
   la loma mueve el denominador y los filtros el numerador, y de un vistazo se
   ve lo que hace cada cosa. Sin nada puesto no hay quebrado que enseñar. */
function pintarCuenta() {
  var tot = totalSitio(), n = ultimoN;
  /* Con quebrado, la palabra «especies» sobra en el móvil: debajo hay una
     rejilla llena de especies y nadie duda de qué se cuenta. Y hace falta el
     sitio, porque esta fila lleva ahora dos botones con rótulo. Medido a 360
     en el peor caso -«Científico», «71/115» y cinco filtros-: con la palabra
     se pasa 4 px y cae a dos líneas; sin ella sobran 46. */
  $('#cuenta').textContent = n === tot
      ? tot + ' especies'
      : n + '/' + tot + ((compacto || ESTRECHO.matches) ? '' : ' especies');
}

/* La guía, en el portal del Estado donde está publicada. Aquí arriba y no
   metido en el texto: si algún día cambia la dirección, se cambia en un
   sitio. */
var ENLACE_SERFOR = 'https://www.gob.pe/institucion/serfor/informes-publicaciones/' +
                    '1124091-guia-de-flora-de-las-lomas-de-lima-2015';

/* ---------- las que no cita en esa loma ----------
   El filtro de loma esconde especies que probablemente estén ahí. La guía no
   es un mapa de distribución: es la lista de dónde las vieron sus tres
   autores, y no llegaron a todo. El dato que lo dice: 31 de las 134 están
   citadas en UNA sola loma, casi una cuarta parte, y eso no es endemismo, es
   que nadie más las anotó. Esconderlas del todo sería afirmar algo que el
   libro no dice.

   Así que van al final, plegadas y ordenadas por cercanía: una citada en
   Caringa, a 2,4 km, es mucho más probable que una citada solo en Asia, a
   sesenta. El que encuentra su flor arriba no llega a verlas; el que no la
   encuentra se topa con ellas justo donde le surge la duda. */
var colaAbierta = false;

/* Las distancias entre las 22, una vez. Son centroides y no contornos, que
   para ordenar de cerca a lejos sobra: la pareja más próxima está a 2,4 km. */
var KM = (function () {
  var m = {}, L = G.lomas || [];
  L.forEach(function (a) {
    m[a.id] = {};
    L.forEach(function (b) {
      var dy = (a.lat - b.lat) * 111.32;
      var dx = (a.lon - b.lon) * 111.32 * Math.cos(a.lat * Math.PI / 180);
      m[a.id][b.id] = Math.sqrt(dx * dx + dy * dy);
    });
  });
  return m;
})();

var SOLO_UNA = G.especies.filter(function (e) {
  return (e.lomas || []).length === 1;
}).length;

// de la loma elegida más cercana a la loma más cercana donde SÍ se la cita
function lejosDe(e) {
  var min = Infinity;
  for (var i = 0; i < F.loma.length; i++) {
    var fila = KM[F.loma[i]];
    if (!fila) continue;
    for (var j = 0; j < e.lomas.length; j++) {
      var d = fila[e.lomas[j]];
      if (d != null && d < min) min = d;
    }
  }
  return min;
}

function pintarCola() {
  var caja = $('#cola');
  var fuera = [];
  if (F.loma.length) {
    // todo lo demás sigue mordiendo: lo único que se suelta es el sitio
    fuera = filtrar('sitio').filter(function (e) { return !enSitio(e); });
    fuera.sort(function (a, b) { return (lejosDe(a) - lejosDe(b)) || (a.n - b.n); });
  }
  caja.classList.toggle('oculto', !fuera.length);
  if (!fuera.length) return [];

  var n = F.loma.length;
  $('#cola-txt').textContent = n === 1
      ? 'No citadas en ' + (nombreLoma[F.loma[0]] || F.loma[0])
      : 'No citadas en esas ' + n + ' lomas';
  $('#cola-n').textContent = fuera.length;
  $('#cola-abrir').setAttribute('aria-expanded', colaAbierta ? 'true' : 'false');
  $('#cola-cuerpo').hidden = !colaAbierta;

  // plegada no se dibuja: son hasta 130 tarjetas con su foto
  if (colaAbierta) {
    var d0 = lejosDe(fuera[0]);
    $('#cola-nota').innerHTML =
        'La guía dice dónde vieron cada especie sus autores, no dónde crece: ' +
        SOLO_UNA + ' de las ' + G.especies.length +
        ' están citadas en una sola loma. Una planta puede estar aquí sin ' +
        'salir arriba. Van de más cerca a más lejos' +
        (isFinite(d0) ? '; la primera se cita a ' +
            d0.toFixed(1).replace('.', ',') + ' km' : '') + '.';
    $('#cola-rejilla').innerHTML = fuera.map(tarjeta).join('');
  } else {
    $('#cola-rejilla').innerHTML = '';
  }
  return fuera;
}

$('#cola-abrir').addEventListener('click', function () {
  colaAbierta = !colaAbierta;
  render();
});

/* La cabecera es pegajosa y su alto cambia con el tema, el tamaño del texto y
   el ancho, asi que se mide en vez de darlo por sabido. En el movil no se
   queda pegada -el sitio de arriba es para las fotos y los tres botones de la
   cabecera son de una vez, no de andar- asi que entonces mide cero: lo que
   dice si cuenta o no es su propio position, no una copia del corte de ancho
   escrita aparte que se quedaria vieja. */
function medirCabecera() {
  var d = document.documentElement;
  function alto(sel) {
    var e = $(sel);
    return (e && getComputedStyle(e).position === 'sticky') ? e.offsetHeight : 0;
  }
  var hc = alto('.cab'), hb = alto('#busca-barra');
  d.style.setProperty('--alto-cab', hc + 'px');
  // lo que tapan las dos juntas, que es lo que tiene que esquivar el recuento
  d.style.setProperty('--alto-fijo', (hc + hb) + 'px');
}
if (window.ResizeObserver) {
  var ojo = new ResizeObserver(medirCabecera);
  ojo.observe($('.cab'));
  ojo.observe($('#busca-barra'));
}

function mirarBarra() {
  /* Con la portada a la vista, la marca pequeña de la cabecera sobra: estaba
     saliendo dos veces, grande arriba y pequeña justo debajo. Se apaga y se
     enciende al bajar, pero sin quitarla de la rejilla: si se quitara, el
     buscador se correría a la izquierda al aparecer, y eso es un salto. Así
     solo cambia la opacidad y no se mueve nada. */
  document.documentElement.classList.toggle('bajado', window.scrollY > 8);

  var barra = $('#barra-filtros');
  /* Siempre, haya filtros o no. Antes solo se pegaba si habia algo filtrando,
     porque solo llevaba las fichas; ahora lleva Ordenar y Filtros, y sin ella
     pegada habria que volver arriba del todo para usarlos. */
  var tope = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--alto-fijo')) || 0;
  /* Contra su sitio en el documento, no contra su posicion en pantalla: una
     vez fija su borde coincide con el de la cabecera igual que arriba del
     todo, asi que mirar la pantalla decia «fija» siempre. Los 6 px de holgura
     evitan que parpadee justo en el limite. */
  /* Desde que pasa la ULTIMA fila, no la primera. Las fichas se van con el
     resto de la pagina, como cualquier contenido, y solo cuando el bloque
     entero ha desaparecido tras la cabecera aparece la version apretada. Asi
     el hueco que queda reservado nunca se ve: para entonces esta del todo por
     encima del borde de arriba. Midiendo desde el principio del bloque, lo
     que se veia era el agujero que dejaban las fichas al irse. */
  var h = $('#barra-hueco');
  var desde = h.offsetTop + h.offsetHeight - tope;
  var toca = compacto ? window.scrollY > desde - 6 : window.scrollY > desde + 6;
  if (toca === compacto) return;
  var hueco = $('#barra-hueco');
  // del hueco y no de la barra: asi entran tambien los margenes que se
  // escapan por fuera, y el documento no cambia de alto ni un pixel
  if (toca) hueco.style.height = hueco.offsetHeight + 'px';   // medir antes
  compacto = toca;
  barra.classList.toggle('compacta', compacto);
  if (!toca) hueco.style.height = '';
  pintarCuenta();
  pintarHerramientas();
}

/* Directo, sin requestAnimationFrame: el navegador ya limita los eventos de
   desplazamiento a uno por fotograma, y son dos lecturas y un cambio de clase
   solo cuando hace falta. Con rAF, ademas, no se actualizaba nada mientras la
   pagina no estuviera pintandose. */
window.addEventListener('scroll', mirarBarra, { passive: true });
window.addEventListener('resize', function () { medirCabecera(); mirarBarra(); });

/* ---------- filtros: interfaz ---------- */
/* Las opciones no llevan cuenta. La llevaron, primero fija -el total del
   libro, que con un filtro puesto acertaba casi nunca- y luego viva en forma
   de «x/n». Lo segundo era cierto pero cambiaba el ancho de cada ficha al
   marcar algo: medido, el panel crecia 172 px de golpe, Familia ganaba dos
   filas y parecia que las opciones se movian o se iban. Lo unico que lleva
   numero ahora es el boton de resultados, que es donde se mira. */
/* ---------- el espectro de colores ----------
   Nueve fichas en una fila que se deslizaba: de los nueve colores se veían
   tres -medido a 375 px, 557 de los 932 que mide la fila quedaban fuera de la
   pantalla- y para llegar a «Morado/lila» había que arrastrar. Ahora es una
   tira: se ven los ocho de un vistazo y están puestos en el orden en que el
   ojo los busca.

   El orden ya venía bien de COLORES en construir.py, que no es alfabético ni
   caprichoso: es un paseo por la rueda de tonos. Medidos los tonos de las
   muestras, 42° el amarillo, 26° el anaranjado, 3° el rojo, 339° el rosado,
   260° el morado, 213° el azul; cae siempre, dando la vuelta por el 360, y el
   verde cierra. El blanco va delante porque de tono no tiene -su saturación
   es 0,22- y es el más claro.

   «Sin flor vistosa» sale de la tira. No es un color, es la ausencia de uno,
   y metido entre los demás se leía como un gris más del espectro. Va debajo y
   con una hoja, que es por donde se reconoce una planta que no florece a la
   vista. */
var SIN_FLOR = 'Sin flor vistosa';
var ORDEN_COLORES = (G.colores || []).map(function (c) { return c.nombre; })
    .filter(function (n) { return n !== SIN_FLOR; });

/* Blanca o negra según cuál se lea mejor encima, por la fórmula de contraste
   de la WCAG y no a ojo. Comprobados los nueve: el peor es el morado con
   4,72:1 y el mejor el blanco con 16,2:1, así que todos pasan el AA de 4,5
   con el nombre escrito encima de la propia muestra. */
function tintaSobre(hex) {
  var c = [0, 2, 4].map(function (i) {
    var v = parseInt(hex.slice(1 + i, 3 + i), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#1b1a17' : '#ffffff';
}

/* Sin número en cada franja, a propósito: las opciones de este panel no los
   llevan desde que se midió que un «x/n» vivo cambiaba el ancho de las fichas
   y el panel pegaba un tirón de 172 px. Aquí el ancho no cambiaría -las
   franjas son todas iguales- pero el dato que de verdad importa es si queda
   algo, y eso lo dice la franja apagándose. La cuenta exacta va en el
   aria-label, que no ocupa sitio. */
function pintarColores() {
  var n = {};
  filtrar('color').forEach(function (e) {
    coloresDe(e).forEach(function (c) { n[c] = (n[c] || 0) + 1; });
  });
  function uno(nom, clase, dentro) {
    var c = n[nom] || 0;
    var hex = colorHex(nom);
    return '<button class="' + clase + (c ? '' : ' vacio') + '" data-f="color"' +
        ' data-v="' + esc(nom) + '" aria-pressed="' +
        (F.color.indexOf(nom) >= 0) + '" style="--mu:' + hex +
        ';--tinta:' + tintaSobre(hex) + '" aria-label="' + esc(nom) + ', ' +
        c + (c === 1 ? ' especie' : ' especies') + '">' + dentro(nom) + '</button>';
  }
  $('#f-color').innerHTML = ORDEN_COLORES.map(function (nom) {
    return uno(nom, 'franja', function () {
      return svgIcono('check', 'tic') + '<span class="et">' + esc(nom) + '</span>';
    });
  }).join('');
  $('#f-sinflor').innerHTML = uno(SIN_FLOR, 'sinflor', function (x) {
    return svgIcono('leaf') + '<span class="et">' + esc(x) + '</span>' +
           svgIcono('check', 'tic');
  });
}

function chip(texto, activo, extra) {
  return '<button class="chip" aria-pressed="' + (activo ? 'true' : 'false') + '" ' +
         (extra || '') + '>' + texto + '</button>';
}

/* Los ocho hábitats del libro (pág. 12), repartidos en tres familias.
   Eran ocho fichas de texto en fila y había que saberse el vocabulario:
   «Cresta rocosa», «Ladera rocosa» y «Fondo de quebrada» se leían como tres
   maneras de decir «con piedras», y lo que las separa no es la piedra sino
   dónde estás en el cerro. El libro los define uno a uno y no los agrupa,
   pero se agrupan solos: cuatro dicen QUÉ crece -de la pradera al árbol-,
   dos DE QUÉ es la ladera -arena o roca- y dos la FORMA del terreno -la
   cresta de arriba, el fondo de abajo-.

   Dentro de cada familia el dibujo es el mismo salvo en lo que las distingue,
   que es justo lo que hay que mirar. Las cuatro primeras van de mayor a menor
   porte. El dato no se toca: lo que se agrupa es cómo se enseña. Si el PDF
   trajera un hábitat nuevo, construir.py no deja pasar la construcción.

   Los tres títulos están dichos desde fuera de la planta, a propósito. El
   primero decía «Lo que crece», y leído encima de «Loma arbórea» parecía
   decir que la especie es un árbol, cuando lo que dice es entre qué está:
   la guía lo cuenta así en cada ficha, «se le puede encontrar ocupando los
   hábitats de...». El tercero decía «La forma del terreno», y «terreno»
   tira a parcela y a lindes; estos dos no son una forma sino un sitio, lo
   más alto del cerro y el fondo por donde pasa el agua. El libro no les
   pone nombre de grupo -los enumera y ya-, así que el nombre es nuestro.

   Van sin artículo. Son rótulos de un panel, no frases, y sin «la» y «el»
   se leen antes y pesan menos encima de las fichas.

   La primera familia lleva «franja»: sus cuatro no son cuatro fichas sino
   cuatro tramos de un mismo campo, pegados y sin filete, con la línea del
   suelo cruzando de lado a lado sin cortarse. Sólo el tramo elegido saca su
   recuadro, y la línea le pasa por dentro. */
var HABITATS = [
  { tit: 'Vegetación de alrededor', franja: true, hay: [
      ['Loma arbórea',      'arborea'],
      ['Loma arbustiva',    'arbustiva'],
      ['Loma herbácea',     'herbacea'],
      ['Zona de cactáceas', 'cactaceas'] ] },
  { tit: 'Tipo de ladera', hay: [
      ['Ladera arenosa',    'arenosa'],
      ['Ladera rocosa',     'rocosa'] ] },
  { tit: 'Relieve de loma', hay: [
      ['Cresta rocosa',     'cresta'],
      ['Fondo de quebrada', 'quebrada'] ] }
];

/* El envoltorio va aquí y no en cada dibujo: así los ocho comparten lienzo y
   grosor de trazo por construcción, y el archivo guarda sólo las líneas. */
function dibujoHabitat(n) {
  var cuerpo = DIBH[n];
  if (!cuerpo) return '';
  return '<svg class="hab-dib" viewBox="0 0 80 100" aria-hidden="true" ' +
         'focusable="false" fill="none" stroke="currentColor" stroke-width="2" ' +
         'stroke-linecap="round" stroke-linejoin="round">' + cuerpo + '</svg>';
}

function pintarFiltros() {
  pintarColores();

  $('#f-grupo').innerHTML = G.grupos.map(function (g) {
    return chip(esc(g.nombre),
                F.grupo.indexOf(g.nombre) >= 0,
                'data-f="grupo" data-v="' + esc(g.nombre) + '"');
  }).join('');

  // alfabetico: G.lomas viene en el orden de la leyenda del libro, que aqui
  // no dice nada a quien busca su loma
  $('#f-loma').innerHTML = G.lomas.slice().sort(function (a, b) {
    return a.nombre.localeCompare(b.nombre, 'es');
  }).map(function (l) {
    return chip(esc(l.nombre),
                F.loma.indexOf(l.id) >= 0,
                'data-f="loma" data-v="' + l.id + '"');
  }).join('');

  $('#f-habitat').innerHTML = HABITATS.map(function (fam) {
    return '<p class="hab-fam">' + esc(fam.tit) + '</p>' +
      '<div class="hab-fila' + (fam.franja ? ' franja' : '') + '">' +
      fam.hay.map(function (h) {
        return '<button class="hab" aria-pressed="' +
               (F.habitat.indexOf(h[0]) >= 0) + '" data-f="habitat" data-v="' +
               esc(h[0]) + '">' + dibujoHabitat(h[1]) + '<span>' +
               /* La franja no tiene filete mientras no se elige, así que nada
                  decía que esos cuatro tramos se pulsan: parecían el paisaje
                  de fondo. La casilla sí lo dice, y de paso dice que se puede
                  marcar más de una. Es la misma que lleva Conservación, en
                  pequeño. Las otras dos familias no la necesitan: ya se ven
                  como fichas sueltas. */
               (fam.franja ? '<span class="caja">' + svgIcono('check') + '</span>' : '') +
               esc(h[0]) + '</span></button>';
      }).join('') + '</div>';
  }).join('');

  $('#f-conserv').innerHTML = CONSERV.map(function (c) {
    return '<button class="casilla" role="checkbox" aria-checked="' +
        (F.conserv.indexOf(c.id) >= 0) + '" data-f="conserv" data-v="' + c.id + '">' +
        '<span class="caja">' + svgIcono('check') + '</span>' +
        '<span>' + esc(c.txt) + '</span></button>';
  }).join('');

  $('#f-familia').innerHTML = G.familias.map(function (f) {
    return chip(esc(f.nombre),
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
  DIB = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  MV = { x0: vb[0], y0: vb[1], w0: vb[2], h0: vb[3], x: vb[0], y: vb[1], z: 1 };
  mapaPuesto = true;
  rehacerBase();
  ponerToques();
  // el hueco cambia al girar el telefono o al estirar la ventana
  if (window.ResizeObserver) new ResizeObserver(rehacerBase).observe(caja);
}

/* Un circulo invisible por loma: las siluetas son diminutas y el dedo no.
   Hay que hacerlo con el mapa ya visible: con display:none, getBBox() devuelve
   ceros y los circulos acaban todos amontonados en el origen. */
/* Un circulo por loma, invisible, con su centro y su tamaño. Ya no es lo que
   recibe el toque -de eso se encarga lomaEn(), por geometria- sino el indice
   que esa cuenta recorre para saber que loma tienes mas cerca, el sitio donde
   se posa el aviso al elegir, y el nombre para quien usa lector de pantalla.

   Antes si era el blanco del dedo, con un radio de la mitad del recuadro y
   nunca menos de 4,2, y encima del dibujo: Caringa y Malanche tienen los
   centros a 3,9, asi que cada circulo llegaba al centro del otro y tocar una
   elegia la otra. De las 22 lomas, 20 estaban en esa situacion. Ahora el
   radio se topa a la mitad de lo que hay hasta el vecino mas cercano -ninguno
   alcanza un centro ajeno- y las siluetas van por encima, que ademas hace que
   el raton las ilumine al pasar. Por eso se les quita el <title>: con el path
   delante saldria el globo del navegador encima de nuestra etiqueta.

   Hay que hacerlo con el mapa ya visible: con display:none, getBBox() devuelve
   ceros y los circulos acaban todos amontonados en el origen. */
function ponerToques() {
  if (toquesPuestos) return;
  var svg = $('#mapa-elige svg');
  if (!svg) return;
  var R = 4.2;
  var paths = $$('#mapa-elige path[data-loma]');
  var cajas = paths.map(function (p) { return p.getBBox(); });
  if (!cajas.length || !cajas.some(function (c) { return c.width || c.height; })) return;

  var cen = cajas.map(function (c) {
    return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
  });
  var hechos = 0;
  paths.forEach(function (p, i) {
    var c = cajas[i];
    if (!c.width && !c.height) return;  // aun sin medidas: se reintenta luego
    var cerca = Infinity;
    cen.forEach(function (o, j) {
      if (j === i) return;
      cerca = Math.min(cerca, Math.hypot(cen[i].x - o.x, cen[i].y - o.y));
    });
    var tope = cerca / 2;
    var t = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    t.setAttribute('cx', cen[i].x.toFixed(2));
    t.setAttribute('cy', cen[i].y.toFixed(2));
    t.setAttribute('data-mitad', (Math.max(c.width, c.height) / 2).toFixed(2));
    t.setAttribute('data-tope', tope.toFixed(2));
    t.setAttribute('r', Math.min(Math.max(R, Math.max(c.width, c.height) / 2),
                                 tope).toFixed(2));
    t.setAttribute('class', 'toque');
    t.setAttribute('data-loma', p.getAttribute('data-loma'));
    // aria-label y no <title>: el <title> saca ademas el globo del sistema,
    // que se solaparia con nuestra etiqueta y llega tarde
    t.setAttribute('aria-label', nombreLoma[p.getAttribute('data-loma')] || '');
    svg.appendChild(t);
    hechos++;
  });
  // y las siluetas por encima de los circulos
  paths.forEach(function (p) {
    var tit = p.querySelector('title');
    if (tit) tit.remove();
    svg.appendChild(p);
  });
  toquesPuestos = hechos > 0;
}

/* ---------- acercar el mapa ----------
   Las siluetas reales son diminutas y en el sur se solapan. Se amplia moviendo
   el viewBox, no con transform, para que los circulos de toque crezcan igual.
   Mover: dos dedos. Con uno se desplaza el panel, como en el resto de la app. */
var MV = null, DIB = null;

/* El dibujo mide 91x128 y el hueco casi nunca tiene esa forma. Antes se le
   daba al svg una caja con la proporcion del dibujo, y el resto del area
   -casi todo, en una pantalla ancha- se quedaba fuera del mapa: por mucho que
   acercaras seguias mirando una tira vertical en medio de dos franjas vacias.

   Ahora el lienzo ocupa el hueco entero y lo que se ensancha es el viewBox,
   no el dibujo: se le añade margen por el lado que sobra, repartido a los dos
   lados. A 1x se ve lo mismo que antes -el mapa entero, centrado- pero el
   area que responde al dedo es toda, y al acercar el dibujo llega a los
   bordes en vez de quedarse en una tira. */
function base() {
  var r = $('#mapa-elige').getBoundingClientRect();
  if (!DIB) return null;
  if (!r.width || !r.height) return { x0: DIB.x, y0: DIB.y, w0: DIB.w, h0: DIB.h };
  var pr = r.width / r.height, w = DIB.w, h = DIB.h;
  if (pr > DIB.w / DIB.h) w = DIB.h * pr; else h = DIB.w / pr;
  return { x0: DIB.x - (w - DIB.w) / 2, y0: DIB.y - (h - DIB.h) / 2, w0: w, h0: h };
}

function rehacerBase() {
  if (!MV) return;
  var b = base();
  if (!b) return;
  MV.x0 = b.x0; MV.y0 = b.y0; MV.w0 = b.w0; MV.h0 = b.h0;
  aplicarVista();
}

/* Cuanto se puede acercar. Cuatro veces el tamaño de partida, que es lo que
   hace falta para separar las lomas pegadas, y nunca menos de lo que cuesta
   que el dibujo cubra el hueco: en una pantalla muy ancha ese 4 se quedaba
   corto y el mapa no llegaba a los lados por mucho que insistieras. */
function zTope() {
  if (!MV || !DIB) return 4;
  return Math.max(4, MV.w0 / DIB.w, MV.h0 / DIB.h);
}

/* Lo que se mira no se sale del dibujo. Si cabe entero por un lado, va
   centrado y por ahi no se mueve; si no cabe, se desplaza pero sin asomarse
   al margen vacio que se le ha añadido. */
function encajar(v, tam, min, largo) {
  if (tam >= largo) return min + (largo - tam) / 2;
  return Math.max(min, Math.min(min + largo - tam, v));
}

function aplicarVista() {
  var svg = $('#mapa-elige svg');
  if (!svg || !MV) return;
  var w = MV.w0 / MV.z, h = MV.h0 / MV.z;
  MV.x = encajar(MV.x, w, DIB.x, DIB.w);
  MV.y = encajar(MV.y, h, DIB.y, DIB.h);
  svg.setAttribute('viewBox', [MV.x, MV.y, w, h].map(function (n) {
    return n.toFixed(2);
  }).join(' '));
  // el radio de ayuda en pixeles de pantalla se mantiene: 4.2 unidades a 1x
  $$('#mapa-elige circle.toque').forEach(function (t) {
    var m = parseFloat(t.getAttribute('data-mitad')) || 0;
    var tope = parseFloat(t.getAttribute('data-tope')) || Infinity;
    t.setAttribute('r', Math.min(Math.max(m, 4.2 / MV.z), tope).toFixed(2));
  });
  colocarRotulos();
  var ampliado = MV.z > 1.001;
  $('#mapa-elige').classList.toggle('ampliado', ampliado);
  $('#mapa-menos').disabled = !ampliado;
  $('#mapa-mas').disabled = MV.z >= zTope() - 0.01;
  sincronizarMapa();
}

function acercar(f, cx, cy) {
  if (!MV) return;
  var w = MV.w0 / MV.z, h = MV.h0 / MV.z;
  if (cx == null) { cx = MV.x + w / 2; cy = MV.y + h / 2; }
  var z = Math.max(1, Math.min(zTope(), MV.z * f));
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
  var arrastre = null;   // un dedo moviendo el mapa
  var raton = null;      // arrastre con raton
  var sostenido = null;  // doble toque mantenido, como en un mapa de verdad
  var ultimo = 0, ultimoP = null;
  /* El click que el navegador se inventa al acabar un gesto no debe elegir
     nada. Pero el aviso duraba hasta que alguien lo consumiera, y un pellizco
     no genera ningun click -touchmove lo impide-, asi que se quedaba puesto y
     se comia el toque siguiente, que era de verdad. Ahora lo borra el
     principio de cada pulsacion: lo que llega sin haber tocado otra vez es el
     click del gesto; lo que llega despues de tocar, no. */
  var tragar = false;

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
    tragar = false;                  // empieza una pulsacion nueva
    if (!MV) return;
    if (ev.touches.length === 2) {
      dedos = medio(ev.touches); sostenido = null; arrastre = null; return;
    }
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
      /* Y con un dedo se mueve el mapa, como en cualquier mapa. Dos dedos era
         la regla de cuando el mapa iba dentro del panel y un dedo tenia que
         poder desplazarlo; a pantalla completa no hay nada detras que mover.
         Solo si esta acercado: a 1x no hay sitio a donde ir y un toque algo
         tembloroso se quedaria sin elegir nada. */
      if (MV.z > 1.001) arrastre = { x: t.clientX, y: t.clientY, movido: 0, activo: false };
    }
  }, { passive: true });

  caja.addEventListener('touchmove', function (ev) {
    if (!MV) return;
    if (sostenido && ev.touches.length === 1) {
      ev.preventDefault();
      var dy = sostenido.y - ev.touches[0].clientY;
      if (Math.abs(dy) > 3) sostenido.movido = true;
      var z = Math.max(1, Math.min(zTope(), sostenido.z0 * Math.pow(2, dy / 140)));
      acercar(z / MV.z, sostenido.p.x, sostenido.p.y);
      return;
    }
    if (arrastre && !sostenido && ev.touches.length === 1) {
      var d = ev.touches[0];
      var ax = d.clientX - arrastre.x, ay = d.clientY - arrastre.y;
      arrastre.movido += Math.abs(ax) + Math.abs(ay);
      if (!arrastre.activo) {
        if (arrastre.movido < 6) return;   // aun podria ser un toque
        arrastre.activo = true;
      }
      ev.preventDefault();
      var ka = porPixel();
      MV.x -= ax * ka; MV.y -= ay * ka;
      arrastre.x = d.clientX; arrastre.y = d.clientY;
      aplicarVista();
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
    if (arrastre && arrastre.activo) tragar = true;   // movio, no eligio
    dedos = null;
    arrastre = null;
  });

  /* ---------- raton ---------- */
  caja.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType !== 'mouse') return;
    tragar = false;                  // igual con el raton: arrastrar y no
    if (!MV || MV.z <= 1.001) return;   // llegar a pulsar dejaba el aviso puesto
    // sin capturar todavia: capturar aqui desviaba el click al contenedor y
    // no habia forma de elegir una loma con el mapa ampliado
    raton = { x: ev.clientX, y: ev.clientY, movido: 0, id: ev.pointerId, activo: false };
  });
  caja.addEventListener('pointermove', function (ev) {
    if (ev.pointerType === 'mouse' && !(raton && raton.activo)) {
      etiquetaMapa(lomaEn(ev), ev.clientX, ev.clientY);
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

  /* La rueda acerca y aleja, hacia donde apunta el raton. Aqui no se pierde
     nada por quedarsela: el mapa ocupa la pantalla y no hay pagina detras que
     desplazar. El pellizco del panel tactil llega como rueda con Ctrl, y
     tambien acerca, que es lo que uno espera.

     La cuenta es continua y no por saltos, porque un panel tactil manda
     muchos avisos pequeños y a saltos daria tirones: una muesca de raton son
     unos 100 y sale un 1,26. Las unidades del aviso no siempre son pixeles
     -Firefox cuenta lineas- asi que se igualan antes, y se recorta lo que
     llegue de golpe para que un manotazo no se plante en el tope. */
  // en la caja de fuera, que si no los botones de acercar son un hueco muerto
  (caja.closest('.mapa-caja') || caja).addEventListener('wheel', function (ev) {
    if (!MV) return;
    ev.preventDefault();
    var dy = ev.deltaY * (ev.deltaMode === 1 ? 33 : ev.deltaMode === 2 ? 400 : 1);
    dy = Math.max(-200, Math.min(200, dy));
    if (!dy) return;
    var p = enMapa(ev.clientX, ev.clientY);
    acercar(Math.pow(2, -dy / 300), p.x, p.y);
    // bajo el raton puede haber ya otra loma
    etiquetaMapa(lomaEn(ev), ev.clientX, ev.clientY);
  }, { passive: false });

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
  /* Solo para las que se han quedado sin nombre escrito -una o dos al abrir,
     ninguna a partir de 3x-. Si el nombre ya esta puesto, repetirlo en un
     globo encima tapa el mapa y no dice nada nuevo. */
  if (!id || ROT_CAJAS[id]) { e.classList.remove('visible'); return; }
  var m = $('.mapa-caja').getBoundingClientRect();
  e.textContent = nombreLoma[id] || id;
  e.style.left = (cx - m.left) + 'px';
  e.style.top = (cy - m.top) + 'px';
  e.classList.add('visible');
}

/* ---------- los nombres, sobre el mapa ----------

   Probando el mapa con gente, lo que costaba no era tocar una loma sino
   saber cual era: veintidos manchas sin nombre. Ahora el nombre va encima,
   como en cualquier mapa.

   El problema de poner nombres es que se pisan. Medido sobre este mapa, que
   es una ristra de norte a sur con un solo nudo -Villa Maria, Zorritos,
   Retamal, Lucumo y Manchay, con 1,7 unidades entre las dos mas juntas, unos
   6 px al abrir-: colocando cada nombre siempre DEBAJO de su loma, a 343 px
   de ancho solo caben 15 de los 22. Probando cuatro sitios -debajo, encima,
   derecha, izquierda- caben 20; desde 1,5x, 21; desde 3x, los veintidos. Asi
   que no hace falta agrupar en globos ni sacar lineas: basta con probar
   cuatro sitios y rendirse con el que no cabe.

   El orden decide quien gana un sitio: primero las elegidas -si la has
   marcado, su nombre no se va- y luego las grandes, porque una mancha
   grande sin nombre se lee como un olvido.

   Un nombre nunca se posa encima de OTRA loma. Si lo hiciera, tocarlo
   elegiria una y estarias mirando otra. */
var ROT_SITIOS = [[0, 1], [0, -1], [1, 0], [-1, 0],
                  [1, 1], [-1, 1], [1, -1], [-1, -1]];
/* O el nombre TOCA su loma, o se va lejos y lleva una línea que lo ata a
   ella. Nada entre medias, y ése es todo el truco.

   Antes había un hueco de 3 px y bastaba con que el nombre quedase más cerca
   de la suya que de cualquier otra. Medido, eso se cumplía por milésimas:
   Collique a 2,7 px de la suya y a 3,0 de Puquio, Manchay a 2,7 y 3,7...
   seis de los diecinueve con menos de 5 px de diferencia. Es verdad y no
   sirve de nada: a esa distancia nadie distingue de quién es el nombre.

   Tocando no hay nada que distinguir, y con línea tampoco. El hueco de 3 px
   era justo la única forma que creaba la duda. */
/* Lo que se aleja el nombre de su loma, escalón a escalón. Muchos y
   apretados cerca, pocos y sueltos lejos: lo que importa es afinar el
   primer sitio que valga, porque es donde va a acabar casi todo.

   Con cuatro escalones gordos (0, 18, 34, 52) pasaban dos cosas. Zorritos
   se quedaba sin nombre porque a la línea le faltaba camino -por eso hay
   escalones hasta 104-. Y del 0 se saltaba al 18, así que un nombre que no
   cabía pegado se iba de golpe a 18 px, o a 25 si le tocaba una esquina.
   Portillo acababa a 22,5 px de su loma mientras los demás estaban a 16, y
   se notaba. */
var ROT_SALTOS = [0, 7, 12, 17, 23, 30, 38, 48, 60, 74, 88, 104];
/* Cuánto aire tiene que haber entre un nombre y cualquier loma que no sea
   la suya. Son dos cifras, y ahí estaba el fallo.

   Un nombre SIN línea sólo dice de quién es por estar pegado a ella, así que
   necesita quedar lejos de las demás: con los 4 px de antes, «Portillo»
   quedaba a 4 de Malanche y Malanche acababa con dos nombres encima, el suyo
   y el del vecino. Ahora se le pide el alto de su propia letra -16 px-, que
   además crece si se sube el tamaño de letra en Apariencia. Medido: el más
   justo de los pegados pasa de 4,1 px a 16,3, y no se pierde ningún nombre.

   Uno CON línea no necesita tanto: la línea ya dice de quién es. Le basta
   con no rozar a nadie, y con que su caja de toque, que se ensancha un poco,
   no llegue a pisar la silueta de al lado. */
var ROT_CLARO_LINEA = 8;
/* Hasta aquí se considera que un nombre TOCA su mancha y no necesita línea.
   Se mide contra el contorno, no contra la caja. */
var ROT_PEGADO = 5;
/* El aire que se le pide a un nombre pegado. Era el alto de su letra -16 px-
   cuando «pegado» quería decir pegado a la CAJA, que es prueba floja: podía
   estar a veinte píxeles de la mancha. Ahora pegado quiere decir pegado al
   contorno -menos de ROT_PEGADO-, que es prueba de sobra, así que no hace
   falta exigirle tanto despejo y caben más nombres. */
var ROT_CLARO_PEGADO = 10;
/* Lo más larga que se admite una guía, medida del nombre a la mancha. San
   Lorenzo, que es una isla suelta mar adentro, pide 34; de ahí el 60. */
var ROT_GUIA_MAX = 60;
// y en la pasada de rescate, menos: si cerca no cabe ni aflojando, no cabe
var ROT_RESCATE = 30;
var ROT_TAM = {};                       // id -> [ancho, alto] en px
var ROT_PERFIL = {};                    // id -> contorno, en unidades del dibujo
/* Cuántas especies cita la guía en cada loma. Es lo que ordena el reparto de
   los nombres, y viene del libro: así no depende del zoom ni del ancho. */
var nEspDe = (function () {
  var m = {};
  (G.lomas || []).forEach(function (l) { m[l.id] = l.nEsp || 0; });
  return m;
})();
var ROT_N = 48;                         // puntos por contorno
var ROT_CAJAS = {};                     // id -> caja puesta, en px del lienzo
var rotMontados = false;

function montarRotulos() {
  var caja = $('#mapa-rotulos'), toques = $$('#mapa-elige circle.toque');
  if (!caja || !toques.length) return;
  caja.innerHTML = '<svg class="guias"></svg>' + toques.map(function (c) {
    var id = c.getAttribute('data-loma');
    return '<span class="mrot" data-loma="' + id + '">' +
           esc(nombreLoma[id] || id) + '</span>';
  }).join('');
  rotMontados = true;
  medirRotulos();
  medirPerfiles();
}

/* El contorno de cada loma, en puntos. Hace falta porque la línea de guía
   acababa en la CAJA de la silueta y no en la silueta: estas lomas son
   manchas rotas, así que el punto más cercano de su caja casi siempre cae en
   campo vacío, y si en ese vacío hay otra loma, la línea parece señalarla a
   ella. Medido: las siete líneas acababan en el aire, ninguna tocaba su loma.
   Con el contorno, la línea acaba encima de la mancha.
   Se muestrea una vez, en unidades del dibujo, y se transforma al colocar.
   getPointAtLength recorre también los trozos sueltos de una loma partida. */
function medirPerfiles() {
  ROT_PERFIL = {};
  $$('#mapa-elige path[data-loma]').forEach(function (pa) {
    var largo = 0;
    try { largo = pa.getTotalLength(); } catch (e) {}
    if (!largo) return;
    var pts = [];
    for (var i = 0; i < ROT_N; i++) {
      var q = pa.getPointAtLength(largo * i / ROT_N);
      pts.push({ x: q.x, y: q.y });
    }
    ROT_PERFIL[pa.getAttribute('data-loma')] = pts;
  });
}

/* Se mide aparte y no en cada vuelta: el tamaño de un nombre no depende del
   zoom del mapa sino de la letra, asi que medirlo al colocar obligaba al
   navegador a recalcular la pagina en cada fotograma del arrastre. */
function medirRotulos() {
  ROT_TAM = {};
  $$('#mapa-rotulos .mrot').forEach(function (s) {
    ROT_TAM[s.getAttribute('data-loma')] = [s.offsetWidth, s.offsetHeight];
  });
}

function colocarRotulos() {
  ROT_CAJAS = {};
  if (!rotMontados) montarRotulos();
  var caja = $('#mapa-rotulos'), svg = $('#mapa-elige svg');
  if (!caja || !svg || !rotMontados) return;
  var m = svg.getScreenCTM();
  if (!m) return;
  /* El marco de referencia es la capa de los nombres y no .mapa-caja: la caja
     lleva un filete de 1 px, así que su getBoundingClientRect() empieza en el
     borde de fuera mientras que esta capa, con inset:0, se posiciona desde el
     borde de dentro. Midiendo contra la caja, todo salía corrido 1 px -y con
     él, el reparto de los toques-. Es el mismo tropiezo del filete de
     .mapa-elige. */
  var lienzo = caja.getBoundingClientRect();
  var p = svg.createSVGPoint();
  function aPantalla(x, y) {
    p.x = x; p.y = y;
    var q = p.matrixTransform(m);
    return { x: q.x - lienzo.left, y: q.y - lienzo.top };
  }

  /* La silueta de verdad, y no un círculo que la envuelva. Con el círculo una
     loma alargada -Carabayllo mide 41 px de ancho y 15 de alto- empujaba su
     nombre 20 px hacia abajo, al regazo de la vecina. Medido antes de esto:
     6 de los 21 nombres acababan más cerca de otra loma que de la suya, y el
     peor -Carabayllo- a 18,6 px de la suya y a 1,6 de Collique. */
  var formas = $$('#mapa-elige path[data-loma]').map(function (pa) {
    var b = pa.getBBox();
    var a = aPantalla(b.x, b.y), c = aPantalla(b.x + b.width, b.y + b.height);
    return { id: pa.getAttribute('data-loma'), el: pa,
             x1: a.x, y1: a.y, x2: c.x, y2: c.y };
  });

  /* Si una línea de guía pasa por encima de OTRA loma. Pasaba: la de Zorritos
     cruzaba Manchay, y una raya que sale de un nombre y atraviesa una mancha
     ajena se lee como si saliera de esa mancha. Se pregunta al trazado, que
     es lo único que sabe de siluetas rotas; la caja sirve sólo para descartar
     rápido, y esto corre nada más para las pocas que acaban con línea. */
  var minv = m.inverse(), pu = svg.createSVGPoint();
  function cruzaOtra(S, propio) {
    var dx = S.x2 - S.x1, dy = S.y2 - S.y1;
    /* Una muestra cada 3 px y no doce por línea: con doce, en una línea de 76
       px las muestras caen cada 6,3 y la de Zorritos se colaba entre dos, que
       es como cruzaba Manchay sin que nadie se enterara. */
    var N = Math.max(12, Math.round(Math.hypot(dx, dy) / 3));
    for (var k = 1; k < N; k++) {
      var t = k / N, x = S.x1 + dx * t, y = S.y1 + dy * t;
      for (var i = 0; i < formas.length; i++) {
        var o = formas[i];
        if (o.id === propio || x < o.x1 || x > o.x2 || y < o.y1 || y > o.y2) continue;
        pu.x = x + lienzo.left; pu.y = y + lienzo.top;
        if (o.el.isPointInFill(pu.matrixTransform(minv))) return true;
      }
    }
    return false;
  }

  // distancia entre dos rectángulos; cero si se tocan o se montan
  function entre(A, B) {
    var dx = Math.max(0, Math.max(A.x1 - B.x2, B.x1 - A.x2));
    var dy = Math.max(0, Math.max(A.y1 - B.y2, B.y1 - A.y2));
    return Math.hypot(dx, dy);
  }
  /* Si un segmento corta un rectángulo (Liang-Barsky). Hace falta porque la
     línea de guía no puede pasar por debajo de un nombre -pasaba: la de
     Lúcumo cruzaba «Pachacámac»- ni un nombre posarse encima de una línea ya
     puesta. */
  function corta(S, b) {
    var t0 = 0, t1 = 1, dx = S.x2 - S.x1, dy = S.y2 - S.y1;
    var pp = [-dx, dx, -dy, dy];
    var qq = [S.x1 - b.x1, b.x2 - S.x1, S.y1 - b.y1, b.y2 - S.y1];
    for (var i = 0; i < 4; i++) {
      if (pp[i] === 0) { if (qq[i] < 0) return false; continue; }
      var t = qq[i] / pp[i];
      if (pp[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }

  function chocaCaja(L, lista) {
    for (var i = 0; i < lista.length; i++) {
      var o = lista[i];
      if (!(L.x2 < o.x1 || L.x1 > o.x2 || L.y2 < o.y1 || L.y1 > o.y2)) return true;
    }
    return false;
  }
  /* El aire que le queda a un nombre hasta la mancha ajena más cercana. La
     caja sirve para descartar rápido -si ni la caja está cerca, la mancha
     tampoco-, y sólo se mira el contorno de las pocas que quedan cerca. Con
     la caja a secas, el campo vacío de una loma rota contaba como ocupado y
     echaba a los nombres mucho más lejos de lo necesario. */
  function cercaDeOtra(L, propio, claro) {
    for (var i = 0; i < formas.length; i++) {
      var o = formas[i];
      if (o.id === propio || entre(L, o) >= claro) continue;
      if (aPerfil(L, o.id).d < claro) return true;
    }
    return false;
  }
  /* Una guía es una quebrada: dos puntos si va recta, tres si dobla. Todo lo
     que se le pregunta se le pregunta tramo a tramo. */
  function tramos(q) {
    var t = [];
    for (var i = 1; i < q.length; i++) {
      t.push({ x1: q[i - 1].x, y1: q[i - 1].y, x2: q[i].x, y2: q[i].y });
    }
    return t;
  }
  function chocaLinea(q, lista) {
    var ts = tramos(q);
    for (var i = 0; i < ts.length; i++) {
      for (var j = 0; j < lista.length; j++) if (corta(ts[i], lista[j])) return true;
    }
    return false;
  }
  function cajaDeQuebrada(q) {
    var c = { x1: q[0].x, y1: q[0].y, x2: q[0].x, y2: q[0].y };
    for (var i = 1; i < q.length; i++) {
      c.x1 = Math.min(c.x1, q[i].x); c.y1 = Math.min(c.y1, q[i].y);
      c.x2 = Math.max(c.x2, q[i].x); c.y2 = Math.max(c.y2, q[i].y);
    }
    return c;
  }
  function chocaOtraGuia(q, lista) {
    var ts = tramos(q);
    for (var i = 0; i < ts.length; i++) {
      for (var j = 0; j < lista.length; j++) {
        if (corta(ts[i], cajaDeQuebrada(lista[j]))) return true;
      }
    }
    return false;
  }
  function pisaOtraLoma(q, propio) {
    var ts = tramos(q);
    for (var i = 0; i < ts.length; i++) if (cruzaOtra(ts[i], propio)) return true;
    return false;
  }

  /* Los caminos que se le prueban a una guía: recto, y si no cabe, doblando
     una vez.

     El codo va en diagonal desde el nombre y entra en la mancha con un tramo
     horizontal corto. En escuadra -todo en vertical y luego todo en
     horizontal- las guías del nudo dibujaban un rectángulo alrededor de
     Manchay, y lo que se leía era un recuadro y no unas guías. Con la
     diagonal el camino se ve como lo que es, una raya que lleva de un nombre
     a su mancha, y el tramo horizontal del final es el que dice en qué
     punto engancha. */
  var CODO = 11;
  /* La guía no sale pegada a la letra, sino tres píxeles más allá. Pegada, y
     más si el primer tramo va tumbado, no se leía como una guía sino como un
     subrayado o una raya detrás de la palabra. Con el aire se ve que es otra
     cosa que sale del nombre. */
  var AIRE_GUIA = 3;
  function despegar(L, hacia) {
    var a = arrimar(L, hacia.x, hacia.y);
    var dx = hacia.x - a.x, dy = hacia.y - a.y, n = Math.hypot(dx, dy);
    if (!n) return a;
    return { x: a.x + dx / n * AIRE_GUIA, y: a.y + dy / n * AIRE_GUIA };
  }
  function caminos(L, b) {
    var cx = (L.x1 + L.x2) / 2;
    var codo = { x: b.x + (b.x < cx ? CODO : -CODO), y: b.y };
    return [[despegar(L, b), b],
            [despegar(L, codo), codo, b]];
  }

  // el punto de un rectángulo más cercano a otro sitio
  function arrimar(c, px, py) {
    return { x: Math.max(c.x1, Math.min(px, c.x2)),
             y: Math.max(c.y1, Math.min(py, c.y2)) };
  }

  /* El contorno de una loma en píxeles. Se transforma una vez por vuelta y
     se guarda, que si no habría que rehacerlo por cada sitio que se prueba. */
  var cachePerfil = {};
  function perfilPx(id) {
    var crudo = ROT_PERFIL[id];
    if (!crudo) return null;
    var pts = cachePerfil[id];
    if (!pts) {
      pts = cachePerfil[id] = crudo.map(function (q) { return aPantalla(q.x, q.y); });
    }
    return pts;
  }

  /* Lo lejos que queda un nombre de una mancha, y por dónde se le engancharía.
     Contra el CONTORNO y no contra la caja, y aquí estaba el fallo de fondo:
     la caja de una loma rota es casi toda campo vacío -Pachacámac mide 52x38
     px y su mancha no llena ni la mitad-, así que un nombre pegado a la caja
     podía estar a veinte píxeles de la mancha. Contaba como pegado, se
     quedaba sin línea, y se veía lejos y suelto. Eso eran Pachacámac y
     Portillo. Con el contorno, lejos es lejos. */
  function aPerfil(L, id) {
    var pts = perfilPx(id);
    if (!pts) return { d: entre(L, porId[id]), pt: null };
    var mejor = null, md = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var qx = Math.max(L.x1, Math.min(pts[i].x, L.x2));
      var qy = Math.max(L.y1, Math.min(pts[i].y, L.y2));
      var d = Math.hypot(pts[i].x - qx, pts[i].y - qy);
      if (d < md) { md = d; mejor = pts[i]; }
    }
    return { d: md, pt: mejor };
  }

  /* El orden importa tanto como las reglas. Iba por tamaño, y las pequeñas
     se quedaban para el final, cuando las grandes ya habían ocupado el nudo:
     medido en el móvil, a Zorritos y Pacta les quedaban catorce y veintiún
     sitios buenos para el nombre y ninguno con camino para la línea, porque
     todos los caminos pasaban por debajo de un nombre ya puesto.

     Ahora van primero las apretadas -las que tienen más vecinas cerca-, que
     son las que menos dónde elegir tienen. Es la regla de siempre para
     repartir lo escaso: sirve antes a quien tiene menos salidas. Sube de 20
     a 21 nombres en el móvil, y cuesta dos líneas más. */
  /* Sólo se rotula lo que se ve. Antes se rotulaba todo, así que al acercar
     y arrastrar quedaban nombres de lomas que estaban fuera de la pantalla,
     con su guía saliendo del borde hacia la nada; y como entraban y salían,
     los demás nombres se recolocaban y la cosa parpadeaba. */
  var porId = {};
  formas.forEach(function (o) { porId[o.id] = o; });
  formas = formas.filter(function (o) {
    return o.x2 > 0 && o.x1 < lienzo.width && o.y2 > 0 && o.y1 < lienzo.height;
  });

  /* El orden decide quién se queda sin nombre cuando no caben todos, así que
     tiene que ser siempre el mismo. Iba por lo apretada que estuviera cada
     loma, que depende del zoom y del ancho de la pantalla: al mover el mapa
     cambiaba el orden, y con él qué dos nombres faltaban. Eso es lo que hacía
     que aparecieran y desaparecieran al arrastrar.

     Ahora manda cuántas especies cita la guía en cada loma. Es un número del
     libro, no de la pantalla: no cambia nunca, así que si falta un nombre
     falta siempre el mismo, y es el de la loma de la que menos hay que
     contar -Cicasos y Mala, con dos especies cada una, contra las 75 de
     Lúcumo-. El tamaño queda de desempate. */
  var orden = formas.slice().sort(function (a, b) {
    var ea = F.loma.indexOf(a.id) >= 0, eb = F.loma.indexOf(b.id) >= 0;
    if (ea !== eb) return ea ? -1 : 1;          // las elegidas, primero
    var na = nEspDe[a.id] || 0, nb = nEspDe[b.id] || 0;
    if (na !== nb) return nb - na;
    return (b.x2 - b.x1) + (b.y2 - b.y1) - (a.x2 - a.x1) - (a.y2 - a.y1);
  });

  /* Se prueba escalón por escalón, y DENTRO de cada escalón se miran los
     ocho lados enteros para quedarse con el que deje el nombre más cerca de
     su loma. Antes valía el primero que cupiera, y como las esquinas se
     prueban después de los lados pero miden más -a 17 de separación, una
     esquina deja el nombre a 24- bastaba con que un lado fallara para que el
     nombre se fuera más lejos de lo necesario. */

  /* Dos pasadas. En la primera se reparte con las reglas enteras. Lo que se
     quede sin nombre va a una segunda en la que se afloja: la guía puede
     pasar por debajo de un nombre ya puesto y se le pide la mitad de aire.
     Sigue sin poder cruzar otra loma ni montarse sobre otro nombre, que es
     lo que de verdad confunde.

     Se afloja sólo donde la alternativa es no poner el nombre, que es peor:
     en la vista de entrada del móvil, sin esta pasada faltaban dos. */
  var puestas = [], tiras = [], guias = [], pendientes = [];
  [false, true].forEach(function (flojo) {
  var lista = orden;
  if (flojo) { lista = pendientes.slice(); if (!lista.length) return; }
  lista.forEach(function (f) {
    var t = ROT_TAM[f.id];
    if (!t) return;
    var aw = t[0], ah = t[1];
    var fcx = (f.x1 + f.x2) / 2, fcy = (f.y1 + f.y2) / 2;
    /* Escalón por escalón. En cada uno se miran los ocho lados, pero en dos
       tiempos: primero las comprobaciones baratas -que quepa, que no pise
       otro nombre, que deje aire a las demás lomas-, y los que pasan se
       ordenan por lo cerca que dejan el nombre de SU loma. Sólo entonces se
       hacen las caras -el enganche al contorno y los cruces de la línea- y
       en ese orden, parando en la primera que valga.

       Hacerlas para los ocho y quedarse con la mejor daba lo mismo y costaba
       el triple: medido, 12,3 ms por vuelta de zoom contra 3,9. Como se
       prueban de mejor a peor, la primera que pasa ya es la mejor. */
    var mejor = null;
    for (var r = 0; r < ROT_SALTOS.length && !mejor; r++) {
      var sep = ROT_SALTOS[r];

      var sitios = [];
      for (var j = 0; j < ROT_SITIOS.length; j++) {
        var d = ROT_SITIOS[j];
        var cx = d[0] === 0 ? fcx
               : d[0] > 0 ? f.x2 + sep + aw / 2 : f.x1 - sep - aw / 2;
        var cy = d[1] === 0 ? fcy
               : d[1] > 0 ? f.y2 + sep + ah / 2 : f.y1 - sep - ah / 2;
        var L = { x1: cx - aw / 2, y1: cy - ah / 2, x2: cx + aw / 2, y2: cy + ah / 2 };
        if (L.x1 < 2 || L.y1 < 2 ||
            L.x2 > lienzo.width - 2 || L.y2 > lienzo.height - 2) continue;
        if (chocaCaja(L, puestas)) continue;
        if (tiras.some(function (q) {
              var ts = tramos(q);
              for (var z = 0; z < ts.length; z++) if (corta(ts[z], L)) return true;
              return false;
            })) continue;
        /* Si lleva línea o no lo dice la distancia a SU mancha, no el escalón
           en el que estemos: un nombre puede estar pegado a la caja y a
           veinte píxeles de la mancha, y entonces necesita línea. Y de ahí
           sale también el aire que hay que pedirle a las demás. */
        var prop = aPerfil(L, f.id);
        /* Tope a lo larga que puede ser una guía, y se mide hasta la MANCHA,
           no hasta la caja: topar el escalón no servía de nada, porque el
           escalón sale de la caja y en una loma rota la mancha queda mucho
           más allá. Con el tope por escalón, a Portillo le tocaba un hueco al
           otro lado del mapa y le salía una guía de 110 px cruzándolo entero
           en diagonal, que es peor que no poner el nombre. */
        if (prop.d > (flojo ? ROT_RESCATE : ROT_GUIA_MAX)) continue;
        var conLinea = prop.d > ROT_PEGADO;
        var aire = conLinea ? ROT_CLARO_LINEA : ROT_CLARO_PEGADO;
        if (flojo) aire = Math.round(aire / 2);
        if (cercaDeOtra(L, f.id, aire)) continue;
        sitios.push({ L: L, pt: prop.pt, linea: conLinea, coste: prop.d });
      }
      sitios.sort(function (a, b) { return a.coste - b.coste; });
      for (var k = 0; k < sitios.length && !mejor; k++) {
        var L2 = sitios[k].L;
        if (!sitios[k].linea) { mejor = { L: L2, tira: null }; break; }
        // al contorno; si por lo que sea no hubiera contorno, a la caja
        var b = sitios[k].pt ||
                arrimar(f, (L2.x1 + L2.x2) / 2, (L2.y1 + L2.y2) / 2);
        var vias = caminos(L2, b);
        for (var v = 0; v < vias.length; v++) {
          var q = vias[v];
          // ni por debajo de un nombre, ni cruzando otra guía, ni otra loma
          if (!flojo && chocaLinea(q, puestas)) continue;
          if (!flojo && chocaOtraGuia(q, tiras)) continue;
          if (pisaOtraLoma(q, f.id)) continue;
          mejor = { L: L2, tira: q };
          break;
        }
      }
    }
    if (!mejor) { if (!flojo) pendientes.push(f); return; }
    puestas.push(mejor.L);
    ROT_CAJAS[f.id] = mejor.L;
    if (mejor.tira) {
      tiras.push(mejor.tira);
      guias.push({ id: f.id, tira: mejor.tira });
    }
  });
  });

  var tela = caja.querySelector('.guias');
  if (tela) {
    /* Y un punto donde la línea toca la loma. Sobre una mancha de ocho
       píxeles, el final de una raya fina se pierde; el punto dice «es ésta»
       sin lugar a dudas. */
    tela.innerHTML = guias.map(function (g) {
      var cl = F.loma.indexOf(g.id) >= 0 ? ' class="puesta"' : '';
      var fin = g.tira[g.tira.length - 1];
      return '<polyline' + cl + ' points="' + g.tira.map(function (q) {
               return q.x.toFixed(1) + ',' + q.y.toFixed(1);
             }).join(' ') + '"/>' +
             '<circle' + cl + ' cx="' + fin.x.toFixed(1) +
             '" cy="' + fin.y.toFixed(1) + '" r="2"/>';
    }).join('');
  }

  $$('#mapa-rotulos .mrot').forEach(function (s) {
    var id = s.getAttribute('data-loma'), b = ROT_CAJAS[id];
    s.classList.toggle('fuera', !b);
    s.classList.toggle('puesta', F.loma.indexOf(id) >= 0);
    if (b) s.style.transform = 'translate(' + b.x1.toFixed(1) + 'px,' +
                               b.y1.toFixed(1) + 'px)';
  });
}

/* Que loma hay bajo un punto del lienzo, si es que hay un nombre ahi. El
   nombre es un blanco grande y la silueta es diminuta, asi que tocarlo vale
   por tocarla. */
/* El blanco de un nombre es algo mayor que el nombre. Tocando justo en el
   hueco que queda entre un nombre y la loma de debajo se elegía esa loma, y
   quien apunta ahí va al nombre, no a la mancha. Con el aire que se les pide
   ahora -el alto de la letra para los pegados, 8 px para los de línea- estos
   3 px se los come el hueco y no le quitan el sitio a ninguna silueta. */
var ROT_ANCHA = 3;
function rotuloEn(cx, cy) {
  var lienzo = $('#mapa-rotulos');       // el mismo marco con el que se reparten
  if (!lienzo) return null;
  var r = lienzo.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
  for (var id in ROT_CAJAS) {
    var b = ROT_CAJAS[id];
    if (x >= b.x1 - ROT_ANCHA && x <= b.x2 + ROT_ANCHA &&
        y >= b.y1 - ROT_ANCHA && y <= b.y2 + ROT_ANCHA) return id;
  }
  return null;
}

/* La pila de lo puesto: arriba la cuenta, que abre y cierra la lista, y al
   lado el «Quitar», que antes vivia en la cabecera de la vista, lejos de
   aquello de lo que habla. Los dos se quedan quietos; lo que corre es la
   lista. Se abre de entrada -de poco sirve saber que hay tres si no sabes
   cuales- pero recuerda si la cierras, y la cuenta sigue al dia. */
var puestasAbiertas = true;

function pintarPuestas() {
  var c = $('#mapa-puestas');
  if (!c) return;
  var n = F.loma.length;
  c.classList.toggle('oculto', !n);
  if (!n) return;
  var ids = F.loma.slice().sort(function (a, b) {
    return (nombreLoma[a] || a).localeCompare(nombreLoma[b] || b, 'es');
  });
  var cuenta = $('#puestas-cuenta');
  cuenta.innerHTML = '<span class="et">' + n + (n === 1 ? ' loma' : ' lomas') +
      '</span>' + svgIcono('caret-down');
  cuenta.setAttribute('aria-expanded', puestasAbiertas ? 'true' : 'false');
  cuenta.setAttribute('aria-label', (puestasAbiertas ? 'Ocultar' : 'Ver') +
      ' las lomas elegidas, ' + n);
  var lista = $('#puestas-lista');
  lista.classList.toggle('oculto', !puestasAbiertas);
  lista.innerHTML = !puestasAbiertas ? '' : ids.map(function (id) {
    var nom = nombreLoma[id] || id;
    return '<button class="chip" data-quita="' + esc(id) + '" ' +
        'aria-label="Quitar ' + esc(nom) + '"><span class="et">' + esc(nom) +
        '</span>' + svgIcono('x', 'quita') + '</button>';
  }).join('');
}

$('#mapa-puestas').addEventListener('click', function (ev) {
  if (ev.target.closest('#puestas-cuenta')) {
    puestasAbiertas = !puestasAbiertas;
    pintarPuestas();
    return;
  }
  if (ev.target.closest('#puestas-quitar')) { F.loma = []; render(); return; }
  var b = ev.target.closest('[data-quita]');
  if (!b) return;
  alterna(F.loma, b.getAttribute('data-quita'));
  render();
});

// la rueda solo es de la lista si la lista tiene a donde ir; si no, es del mapa
$('#puestas-lista').addEventListener('wheel', function (ev) {
  if (this.scrollHeight > this.clientHeight + 1) ev.stopPropagation();
});

function sincronizarMapa() {
  if (!mapaPuesto) return;
  $$('#mapa-elige .loma').forEach(function (p) {
    p.classList.toggle('activa', F.loma.indexOf(p.getAttribute('data-loma')) >= 0);
  });
  // aqui si se vuelve a medir: puede haber cambiado el tamaño de la letra
  if (rotMontados) medirRotulos();
  colocarRotulos();
  pintarPuestas();
}

/* Que loma hay bajo el dedo.

   Primero el dibujo: si el toque cae dentro de la silueta es esa, sin discutir.
   Si cae fuera -y cae fuera casi siempre, porque son manchas de milimetros-
   vale la mas cercana, y solo si esta a menos de un dedo.

   Antes esto lo hacia un circulo gordo por loma, y el circulo de una tapaba el
   centro de la vecina: tocar Malanche elegia Caringa. Ahora los circulos no
   pasan de la mitad del camino al vecino, asi que ninguno le roba el centro a
   nadie, y el hueco que dejan lo cubre esta cuenta, que no puede equivocarse
   de loma porque siempre contesta la que tienes mas cerca. */
var TOLERANCIA_TOQUE = 22;              // px de pantalla, un dedo
function lomaEn(ev) {
  var svg = $('#mapa-elige svg');
  var m = svg && svg.getScreenCTM && svg.getScreenCTM();
  if (!m) return null;
  var paths = $$('#mapa-elige path[data-loma]');
  var p = svg.createSVGPoint();
  p.x = ev.clientX; p.y = ev.clientY;
  /* El nombre primero: es lo unico grande que hay en el mapa, y quien lo ve
     escrito lo toca. Nunca cae encima de otra loma -colocarRotulos() no lo
     permite-, asi que adelantarlo no le quita el sitio a nadie. */
  var rot = rotuloEn(ev.clientX, ev.clientY);
  if (rot) return rot;
  var u = p.matrixTransform(m.inverse());
  /* Se le pregunta al trazado, no a lo que hay pintado en ese pixel. En el
     borde de una silueta el navegador redondea, el toque cae en la tierra de
     debajo y pasaba a la cuenta de mas abajo, que entre dos lomas pegadas
     -Zorritos y Villa Maria- podia contestar la vecina. La geometria no
     redondea: de 8 puntos mal resueltos a ninguno. */
  for (var i = 0; i < paths.length; i++) {
    if (paths[i].isPointInFill(u)) return paths[i].getAttribute('data-loma');
  }
  var esc = Math.hypot(m.a, m.b) || 1;  // px de pantalla por unidad del dibujo
  var tope = TOLERANCIA_TOQUE / esc, mejor = null, mejorD = Infinity;
  $$('#mapa-elige circle.toque').forEach(function (c) {
    var dx = u.x - c.cx.baseVal.value, dy = u.y - c.cy.baseVal.value;
    // a la silueta, no al centro: si no, una loma grande ganaria siempre
    var dist = Math.hypot(dx, dy) - (parseFloat(c.getAttribute('data-mitad')) || 0);
    if (dist < mejorD) { mejorD = dist; mejor = c; }
  });
  return (mejor && mejorD <= tope) ? mejor.getAttribute('data-loma') : null;
}

$('#mapa-elige').addEventListener('click', function (ev) {
  if (this.tragaClick && this.tragaClick()) return;   // venia de un gesto
  var id = lomaEn(ev);
  if (!id) return;
  alterna(F.loma, id);
  render();
});

/* ---------- el mapa, a pantalla completa ----------
   Antes vivia dentro del panel, detras de una pestaña que nadie encontraba, y
   en 460 px de alto. Ahora el grupo lleva un mapita que no se usa para elegir
   -solo enseña que hay mapa y que lomas estan puestas- y el mapa de verdad se
   abre encima, con la pantalla entera. */
function abrirMapa(si) {
  var v = $('#vista-mapa');
  v.classList.toggle('abierta', si);
  if (si) {
    // visible primero, montar despues: getBBox necesita que este dibujado
    montarMapaLomas();
    sincronizarMapa();
    $('#vista-mapa-atras').focus();
  } else {
    $('#loma-locator').focus();
  }
}


$('#loma-locator').addEventListener('click', function () { abrirMapa(true); });
$('#vista-mapa-atras').addEventListener('click', function () { abrirMapa(false); });
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && $('#vista-mapa').classList.contains('abierta')) {
    ev.stopPropagation();
    abrirMapa(false);
  }
}, true);

/* El mapita del grupo: el mismo dibujo, pequeño y con lo elegido encendido. */
function pintarLocator() {
  var c = document.createElement('div');
  c.innerHTML = window.MAPA_SVG || '';
  var svg = c.querySelector('svg');
  if (!svg) return;
  F.loma.forEach(function (id) {
    var p = svg.querySelector('[data-loma="' + id + '"]');
    if (p) p.classList.add('activa');
  });
  $('#loc-mapa').innerHTML = c.innerHTML;
  /* El rótulo de arriba no cambia nunca: dice lo que hace el botón. Llegó a
     decir el nombre de la loma elegida y entonces dejaba de parecer un botón
     -parecía la etiqueta de lo puesto- y nadie lo tocaba para ver el mapa.
     Lo elegido va debajo, en pequeño. */
  var n = F.loma.length;
  $('#loc-sub').textContent = !n ? 'Ninguna elegida'
      : n === 1 ? (nombreLoma[F.loma[0]] || F.loma[0])
      : n + ' elegidas';
}

/* ---------- quitar un solo campo ---------- */
$$('[data-limpia]').forEach(function (b) {
  b.addEventListener('click', function () {
    F[b.dataset.limpia] = [];
    render();
  });
});

function sincronizarChips() {
  $$('[data-f]').forEach(function (b) {
    var f = b.dataset.f, v = b.dataset.v;
    var on = f === 'mes' ? F.mes.indexOf(+v) >= 0 : F[f].indexOf(v) >= 0;
    // las casillas dicen marcada/sin marcar; las fichas, pulsada/sin pulsar
    b.setAttribute(b.getAttribute('role') === 'checkbox' ? 'aria-checked' : 'aria-pressed',
                   on ? 'true' : 'false');
  });
  $$('[data-limpia]').forEach(function (b) {
    b.classList.toggle('oculto', !F[b.dataset.limpia].length);
  });
  pintarColores();
  pintarMeses();
  pintarAltitud();
  pintarCaras();
  pintarLocator();
  sincronizarMapa();
}

document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-f]');
  if (!b) return;
  var f = b.dataset.f, v = b.dataset.v;
  // el click con el que acaba un arrastre no debe deshacer el primero que marco
  if (tragar[f]) { tragar[f] = false; return; }
  alterna(F[f], f === 'mes' ? +v : v);
  render();
});

/* El mismo cerro de la ficha, en miniatura y con un flanco encendido. La cara
   es un dato dibujado, no escrito: ensenarlo dibujado ahorra la explicacion.
   El corte va por la ensillada -entre las dos cumbres-, que es donde el ojo
   parte el cerro; caraDe() usa 27 para clasificar el trazo, que es otra cosa. */
var SILLA = 34;
/* El corte del cerro con el que se elige la cara. Eran tres fichas -«Al mar»,
   «Ambas caras», «A la cordillera»- y alguien las leyo como lomas del norte y
   del sur. El dato no va de geografia: va de que ladera de UN cerro mira al
   mar. Dibujado de canto, con la neblina entrando por la izquierda, no hay
   forma de leerlo mal, y de paso el dibujo cuenta el porque.

   La silueta es la de la guia, la misma que sale en cada ficha. El libro la
   llama «un perfil de loma tipico» (p. 14) y tiene dos cumbres -947 y 1020
   msnm- con una silla a 734 en medio: por ahi se parte, que es lo que marca
   SILLA.

   Hay que muestrear el trazado para poder cortarlo, y getPointAtLength pide
   que el path este en el documento; no pide que se vea, asi que va en un svg
   de tamaño cero y se hace una sola vez. */
var CARA_PTS = null, CARA_N = 200, CARA_PASO = 1;
var CARA_VB_ANCHO = 62;                 // lo que abarca el viewBox del dibujo
function caraPuntos() {
  if (CARA_PTS) return CARA_PTS;
  var NS = 'http://www.w3.org/2000/svg';
  var caja = document.createElementNS(NS, 'svg');
  caja.setAttribute('viewBox', '0 0 ' + G.perfil.viewBox[2] + ' ' + G.perfil.viewBox[3]);
  caja.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  var p = document.createElementNS(NS, 'path');
  p.setAttribute('d', G.perfil.silueta);
  caja.appendChild(p);
  document.body.appendChild(caja);
  var largo = 0, out = [];
  try { largo = p.getTotalLength(); } catch (e) {}
  for (var i = 0; largo && i <= CARA_N; i++) {
    var q = p.getPointAtLength(largo * i / CARA_N);
    out.push({ x: q.x, y: q.y });
  }
  document.body.removeChild(caja);
  if (out.length) { CARA_PTS = out; CARA_PASO = largo / CARA_N; }
  return out;
}

var CARA_SUELO = 43;                    // donde apoya el cerro en el dibujo

/* Las dos laderas se parten por la silla, y tienen que COMPARTIR ese punto.
   Antes cada una se quedaba con las muestras de su lado y ninguna caia justo
   en la silla: entre la ultima de una y la primera de la otra quedaba el paso
   del muestreo, y al marcarlas las dos se veia una rendija, en el relleno y en
   el trazo. Ahora el punto de corte se interpola y se le da a las dos. */
function caraPartir(pts, x) {
  var i = 0;
  while (i < pts.length - 1 && pts[i + 1].x < x) i++;
  var a = pts[i], b = pts[i + 1] || a;
  var k = (b.x - a.x) ? (x - a.x) / (b.x - a.x) : 0;
  var corte = { x: x, y: a.y + k * (b.y - a.y) };
  return [pts.slice(0, i + 1).concat([corte]), [corte].concat(pts.slice(i + 1))];
}

/* El trazo grueso se recorta por los extremos de fuera lo que mide su media
   punta: con punta redonda, si no, se derrama por el pie del cerro y se mete
   en el agua. En la silla no se recorta, que es donde las dos se juntan.

   La media punta se mide en pixeles de pantalla -el trazo no se escala con el
   dibujo- asi que hay que pasarla a unidades con el ancho de ahora. */
function caraRadio() {
  var caja = $('#f-cara');
  var ancho = caja ? caja.clientWidth : 0;
  var porUnidad = ancho ? ancho / CARA_VB_ANCHO : 1;
  var px = parseFloat(getComputedStyle(document.documentElement)
             .getPropertyValue('--trazo-elegido')) || 7;
  return (px / 2) / porUnidad;
}
function caraRecorta(arr, inicio, fin) {
  var n = Math.max(1, Math.round(caraRadio() / CARA_PASO));
  if (arr.length - (inicio ? n : 0) - (fin ? n : 0) < 2) return arr;
  return arr.slice(inicio ? n : 0, fin ? arr.length - n : arr.length);
}
function caraLinea(arr) {
  return 'M ' + arr.map(function (p) {
    return p.x.toFixed(2) + ' ' + p.y.toFixed(2);
  }).join(' L ');
}
function caraRelleno(arr) {
  if (!arr.length) return '';
  return caraLinea(arr) + ' L ' + arr[arr.length - 1].x.toFixed(2) + ' ' + CARA_SUELO +
         ' L ' + arr[0].x.toFixed(2) + ' ' + CARA_SUELO + ' Z';
}

function pintarCaras() {
  var caja = $('#f-cara');
  if (!caja) return;
  var pts = caraPuntos();
  if (!pts.length) return;
  var W = G.perfil.viewBox[2];
  var mitades = caraPartir(pts, SILLA), oes = mitades[0], est = mitades[1];
  var puesto = function (l) { return F.cara.indexOf(l) >= 0; };

  /* El dibujo va oculto al lector de pantalla: lo que se puede decir con
     palabras ya lo dicen los dos botones de abajo, que son botones de verdad
     y por ahi pasa el tabulador. Un <g> con tabindex no recibe el foco en
     SVG, asi que ponerle role="button" prometia un teclado que no existia. */
  var s = '<svg viewBox="2 5 62 41" aria-hidden="true" focusable="false">';
  /* La neblina entra por la izquierda y se deshace al subir. Va debajo de la
     tierra, asi que solo asoma por el cielo de la cara marina, y se desvanece
     hacia la cumbre con un degradado: antes era una mancha de borde recto que
     parecia un bloque, no niebla. */
  s += '<defs><linearGradient id="nieblaIzq" x1="0" y1="0" x2="1" y2="0">' +
       '<stop offset="0" class="nb" stop-opacity=".9"/>' +
       '<stop offset=".5" class="nb" stop-opacity=".7"/>' +
       '<stop offset="1" class="nb" stop-opacity="0"/>' +
       '</linearGradient></defs>';
  s += '<path d="M1 17.5 q 4 -3.4 8 -1.2 q 3.4 -4 7.6 -1.4 q 3.6 -2.6 6.8 .6 ' +
       'q 4 -1 7 2.4 q 3 2 4.6 5.6 L ' + (SILLA + 3) + ' 33 L 1 33 Z" ' +
       'fill="url(#nieblaIzq)"/>';
  /* El mar se cuelga del pie del cerro, no de una altura puesta a mano: antes
     su borde de arriba quedaba por encima del pie y el agua parecia subirse a
     la tierra, y por abajo sobresalia del suelo del dibujo. */
  var pie = pts[0];
  s += '<rect class="agua" x="1" y="' + pie.y.toFixed(2) + '" width="' +
       (pie.x - 1).toFixed(2) + '" height="' + (CARA_SUELO - pie.y).toFixed(2) + '"/>';
  s += '<path class="suelo" d="' + caraRelleno(pts) + '"/>';
  s += '<path class="seco" d="' + caraRelleno(est) + '"/>';
  /* La linea del terreno va ANTES de las laderas. Iba despues, y al marcar una
     se le veia por el medio al trazo grueso, como una raya partiendolo en dos.
     Debajo, el trazo verde la tapa del todo donde esta marcada y la deja ver
     donde no. */
  s += '<path class="linea" d="' + caraLinea(pts) + '"/>';
  LADOS.forEach(function (d) {
    var arr = d.l === 'o' ? oes : est;
    /* Un rectángulo invisible por cara, de arriba abajo del dibujo y hasta la
       ensillada. Antes el toque sólo lo recibían la ladera pintada y su
       cresta, así que pulsar el cielo -o la neblina, o el mar- no elegía
       nada, y ahí es donde se pulsa. Va el primero del grupo para no taparle
       el relleno ni la cresta; da igual cuál de los tres reciba el toque,
       porque los tres cuelgan del mismo <g> y es el <g> quien lleva el lado.
       Los números son los del viewBox de arriba. */
    var x0 = d.l === 'o' ? 2 : SILLA, x1 = d.l === 'o' ? SILLA : 64;
    s += '<g class="ladera" data-lado="' + d.l + '" data-on="' + (puesto(d.l) ? 1 : 0) + '">' +
         '<rect class="toque" x="' + x0 + '" y="5" width="' + (x1 - x0) + '" height="41"/>' +
         '<path class="relleno" d="' + caraRelleno(arr) + '"/>' +
         '<path class="cresta" d="' +
         caraLinea(caraRecorta(arr, d.l === 'o', d.l === 'e')) + '"/></g>';
  });
  s += '<text class="rotulo" x="3.4" y="13.5">neblina</text>';
  s += '<text class="rotulo" x="3.4" y="38">mar</text>';
  s += '<text class="rotulo" x="62" y="12" text-anchor="end">cordillera</text>';
  s += '</svg>';

  // los nombres y las cuentas, en HTML y debajo: sobre la tierra el gris se
  // queda en 4,27:1 y no llega a AA
  // sin cuenta, como el resto de las opciones: el numero vive en el boton de
  // resultados
  s += '<div class="cara-pies">' + LADOS.map(function (d) {
    return '<button data-lado="' + d.l + '" aria-pressed="' + puesto(d.l) + '">' +
        '<b>' + esc(d.txt) + '</b></button>';
  }).join('') + '</div>';

  caja.innerHTML = s;
}

$('#f-cara').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-lado]');
  if (!b) return;
  alterna(F.cara, b.getAttribute('data-lado'));
  render();
});


/* ---------- meses ---------- */

/* Doce barras con su recuento. Se repintan en cada render porque el recuento
   depende de los demas filtros: con una loma puesta, la grafica pasa a ser la
   de esa loma. La escala es la raiz cuadrada del recuento, no el recuento: de
   1 a 105 en lineal deja nueve meses en nada, y lo que interesa es la forma. */
/* El año se dibuja empezando en junio, no en enero: asi las dos estaciones
   salen como dos mitades seguidas -humeda a la izquierda, seca a la derecha- y
   cada boton cae debajo de la suya. Enero partia la seca en dos trozos. */
var ORDEN_MESES = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5];
function posMes(m) { return ORDEN_MESES.indexOf(m); }

function pintarMeses() {
  var n = [0,0,0,0,0,0,0,0,0,0,0,0];
  filtrar('mes').forEach(function (e) {
    (e.flor || []).forEach(function (m) { n[m - 1]++; });
  });
  var tope = Math.max.apply(null, n) || 1;
  $('#f-mes').innerHTML = ORDEN_MESES.map(function (m) {
    var i = m - 1, mes = G.meses[i];
    var alto = n[i] ? Math.max(6, Math.round(66 * Math.sqrt(n[i]) / Math.sqrt(tope))) : 6;
    var puesto = F.mes.indexOf(m) >= 0;
    var est = (m >= 6 && m <= 11) ? ' hum' : ' sec';
    return '<button class="mes' + est + (n[i] ? '' : ' vacio') + '" data-f="mes" data-v="' +
        m + '" aria-pressed="' + puesto + '" aria-label="' + esc(mes) + ', ' +
        n[i] + (n[i] === 1 ? ' especie' : ' especies') + '">' +
        '<span class="barra" style="height:' + alto + 'px"></span>' +
        '<span class="et">' + esc(mes) + '</span></button>';
  }).join('');
  pintarAtajos();
}

/* Un atajo esta puesto solo si los meses elegidos son exactamente los suyos:
   en cuanto se toca un mes deja de serlo, que es lo que uno espera al ver el
   boton encendido. */
function mesesDe(b) {
  return b.dataset.meses.split(',').map(Number)
          .sort(function (a, c) { return a - c; }).join(',');
}
function pintarAtajos() {
  var hoy = F.mes.slice().sort(function (a, c) { return a - c; }).join(',');
  $$('[data-meses]').forEach(function (b) {
    b.setAttribute('aria-pressed', hoy && hoy === mesesDe(b) ? 'true' : 'false');
  });
}

$$('[data-meses]').forEach(function (b) {
  b.addEventListener('click', function () {
    // si ya estaba puesto, el mismo boton lo quita
    F.mes = b.getAttribute('aria-pressed') === 'true'
        ? [] : b.dataset.meses.split(',').map(Number);
    render();
  });
});

/* ---------- mantener y arrastrar ----------
   Como en Google Fotos: se mantiene pulsado uno, y a partir de ahi el dedo va
   marcando -o desmarcando, segun lo que hiciera el primero- los que pisa.

   Lo usan los meses y el espectro de colores. Es el mismo gesto sobre dos
   tiras ordenadas, asi que es el mismo codigo con la tira y el campo
   cambiados; estaba escrito a mano para los meses y copiarlo habria dejado
   dos sitios donde arreglar cada cosa.

   Solo despues de la espera: antes de eso el dedo sigue siendo para desplazar
   el panel, que es lo que se hace el 99 % de las veces. Y por eso las dos
   tiras van tumbadas y no de pie: con touch-action:pan-y el navegador nos
   deja el gesto horizontal entero y se queda el vertical para desplazar. Una
   lista en columna habria pedido quedarnos el vertical, y entonces el panel
   no se podria desplazar pasando el dedo por encima de ella. */
var ESPERA_PINTAR = 380;
var tragar = {};

function arrastrable(sel, campo, orden, numero) {
  var caja = $(sel);
  if (!caja) return;
  var pint = null, reloj = 0;

  function valorBajo(ev) {
    var e = document.elementFromPoint(ev.clientX, ev.clientY);
    var c = e && e.closest && e.closest(sel + ' [data-f="' + campo + '"]');
    if (!c) return null;
    return numero ? +c.dataset.v : c.dataset.v;
  }

  function soltar() {
    clearTimeout(reloj);
    if (pint && pint.vivo) caja.classList.remove('pintando');
    pint = null;
  }

  /* Pinta el tramo ENTERO entre donde empezo y donde esta el dedo, no solo lo
     que ha pisado: si los botones caen en dos filas, al saltar de fila el
     dedo se salta la mitad. Y al volver atras hay que deshacer lo que ya no
     queda dentro, de ahi que se parta siempre de como estaba.

     Por sitio en la tira y no por el valor: el año empieza en junio, asi que
     arrastrar de setiembre a enero son cinco meses seguidos -9, 10, 11, 12,
     1- y con numeros habria cogido de enero a setiembre. */
  function hasta(v) {
    var pa = orden.indexOf(pint.ancla), pb = orden.indexOf(v);
    if (pa < 0 || pb < 0) return;
    var a = Math.min(pa, pb), b = Math.max(pa, pb);
    var hay = {};
    pint.antes.forEach(function (x) { hay[x] = 1; });
    for (var k = a; k <= b; k++) {
      if (pint.pone) hay[orden[k]] = 1; else delete hay[orden[k]];
    }
    var nuevo = orden.filter(function (x) { return hay[x]; });
    if (numero) nuevo = nuevo.sort(function (x, y) { return x - y; });
    var hoy = F[campo].slice().map(String).sort().join('|');
    if (nuevo.map(String).sort().join('|') === hoy) return;
    F[campo] = nuevo;
    render();
  }

  caja.addEventListener('pointerdown', function (ev) {
    var v = valorBajo(ev);
    if (v === null) return;
    tragar[campo] = false;             // una pulsacion nueva: lo de antes ya paso
    pint = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, vivo: false,
             ancla: v, antes: F[campo].slice() };
    clearTimeout(reloj);
    reloj = setTimeout(function () {
      if (!pint) return;
      pint.vivo = true;
      pint.pone = F[campo].indexOf(v) < 0;     // lo que haga el primero manda
      caja.classList.add('pintando');
      try { caja.setPointerCapture(pint.id); } catch (e) {}
      try { navigator.vibrate && navigator.vibrate(12); } catch (e) {}
      hasta(v);
    }, ESPERA_PINTAR);
  });

  caja.addEventListener('pointermove', function (ev) {
    if (!pint) return;
    if (!pint.vivo) {
      // si se mueve antes de tiempo era un desplazamiento, no una pulsacion
      if (Math.abs(ev.clientX - pint.x) + Math.abs(ev.clientY - pint.y) > 10) {
        clearTimeout(reloj); pint = null;
      }
      return;
    }
    var v = valorBajo(ev);
    if (v !== null) hasta(v);
  });

  // con el dedo, mientras se pinta manda el gesto y no el desplazamiento
  caja.addEventListener('touchmove', function (ev) {
    if (pint && pint.vivo) ev.preventDefault();
  }, { passive: false });

  ['pointerup', 'pointercancel'].forEach(function (t) {
    caja.addEventListener(t, function () {
      // el click que cierra el gesto no debe deshacer el primero que marco
      if (pint && pint.vivo) tragar[campo] = true;
      soltar();
    });
  });
  // si el dedo se va antes de que arranque, no hay gesto que esperar. Despues
  // de arrancar manda la captura y este aviso ya no llega.
  caja.addEventListener('pointerleave', function () {
    if (pint && !pint.vivo) { clearTimeout(reloj); pint = null; }
  });
}

arrastrable('#f-mes', 'mes', ORDEN_MESES, true);
arrastrable('#f-color', 'color', ORDEN_COLORES, false);

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
  var c = cara(caraDe(e));
  var desc = min != null
      ? 'De ' + min + ' a ' + max + ' metros' + (c ? ', mirando ' + c.frase : '')
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
/* Dentro el dato sigue siendo «Occidental» y «Oriental», que es como lo llama
   la guia y como se clasifica el dibujo. Fuera se dice hacia donde mira la
   cara: no todo el mundo sabe de memoria que el mar cae al oeste, y la
   neblina -que es de lo que va esto- viene del mar. La palabra de la guia se
   queda en la pista del filtro, para quien tenga el libro delante. */
var CARAS = [
  { v: 'Occidental',  lado: 'o', txt: 'Al mar',          frase: 'al mar' },
  { v: 'Ambas caras', lado: 'a', txt: 'Ambas caras',     frase: 'a las dos caras' },
  { v: 'Oriental',    lado: 'e', txt: 'A la cordillera', frase: 'a la cordillera' }
];
function cara(v) {
  return CARAS.filter(function (c) { return c.v === v; })[0];
}

/* El filtro ya no guarda el valor del dato -«Occidental», «Ambas caras»,
   «Oriental»- sino la ladera que se ha tocado en el dibujo. Y una especie de
   ambas caras ocupa las dos: antes se pedia coincidencia exacta y marcar «al
   mar» dejaba fuera las 32 que viven en las dos, lo que con un dibujo donde
   acabas de tocar esa ladera se lee como un fallo.

   Las dos laderas se combinan con «y», no con «o». Con «o», tocar las dos
   daria las 134, que es no filtrar; con «y» da las 32 que viven en las dos,
   que es lo que hacia el boton «Ambas caras». Asi las tres respuestas de
   siempre se siguen alcanzando: 117 al mar, 49 a la cordillera, 32 las dos. */
var LADOS = [
  { l: 'o', txt: 'Al mar',          dato: 'Occidental' },
  { l: 'e', txt: 'A la cordillera', dato: 'Oriental' }
];
function ladoDe(l) {
  return LADOS.filter(function (x) { return x.l === l; })[0] || LADOS[0];
}
function ocupaCara(e, l) {
  return e._cara === 'Ambas caras' || e._cara === ladoDe(l).dato;
}

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

/* Pasar a la siguiente sin volver al catalogo. Sigue la lista que se esta
   viendo -filtrada y ordenada-, no la numeracion del libro, que es lo que
   espera quien esta repasando unos resultados.
   Nada de deslizar con el dedo: en Android e iOS ese gesto desde el borde es
   el de volver del sistema, y perder el «atras» a veces es peor negocio que
   el atajo. */
var indiceFicha = -1;

function vecina(paso) {
  if (indiceFicha < 0) return null;
  var i = indiceFicha + paso;
  return (i >= 0 && i < ultimo.length) ? ultimo[i] : null;
}

function pasarA(paso) {
  var e = vecina(paso);
  if (!e) return;
  abrirFicha(e.id, false);
  // se sustituye, no se apila: atras vuelve al catalogo desde donde sea
  history.replaceState({ ficha: e.id }, '');
}

function tarjetaVecina(e, paso) {
  if (!e) return '';
  var foto = e.fotos[0] ? 'img/' + e.fotos[0] : '';
  var flecha = svgIcono(paso < 0 ? 'caret-left' : 'caret-right');
  return '<button class="vecina ' + (paso > 0 ? 'sig' : 'ant') + '" data-paso="' + paso + '">' +
      flecha +
      (foto ? '<img loading="lazy" src="' + foto + '" alt="">' : '') +
      '<span class="vecina-txt"><small>' + (paso < 0 ? 'Anterior' : 'Siguiente') + '</small>' +
        '<b>' + esc(e.comun) + '</b><i>' + esc(e.cientifico) + '</i></span>' +
    '</button>';
}

function abrirFicha(id, empujar) {
  var e = null;
  for (var i = 0; i < G.especies.length; i++) if (G.especies[i].id === id) { e = G.especies[i]; break; }
  if (!e) return;
  indiceFicha = -1;
  for (var k = 0; k < ultimo.length; k++) if (ultimo[k].id === id) { indiceFicha = k; break; }

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
      // guion y sin espacios, como los intervalos de la RAE (guion2 3.1b)
      dato('mountains', 'Altitud',
           e.altitud[0] != null ? e.altitud[0] + '-' + e.altitud[1] + ' <small>msnm</small>' : '—') +
      dato('flower', 'Color de la flor', e.color ? '<span class="punto" style="background:' +
           colorHex(e.color) + '"></span>' + esc(e.color) : '—') +
    '</div>' +

    '<div class="lateral">' +
      '<section class="bloque"><h3>' + svgIcono('mountains') + 'Rango de altitud</h3>' +
        '<figure class="figura">' + svgPerfil(e) +
        '<figcaption>' + (cara(caraDe(e))
            ? 'Mira <b>' + esc(cara(caraDe(e)).frase) + '</b>'
            : '<b>—</b>') + ' según el perfil de la guía' +
        (e.altitudTxt ? '<br>En el texto: “' + esc(e.altitudTxt) + '”' : '') +
        '</figcaption></figure></section>' +
      '<section class="bloque"><h3>' + svgIcono('map-trifold') + 'Dónde se registró</h3>' +
        '<figure class="figura">' + svgMapa(e) +
        '<figcaption>' + (e.lomas.length - propias.length) + ' de ' + G.lomas.length +
          ' lomas visitadas por la guía' +
          (propias.length ? '<br><span class="pie-propia">+ ' + propias.length +
            ' de observación propia</span>' : '') +
        '</figcaption></figure>' +
        '<div class="lista-lomas">' + lomasEti + '</div></section>' +
      (e.flor.length ? '<section class="bloque"><h3>' + svgIcono('calendar-blank') + 'Calendario de floración</h3>' + cal + '</section>' : '') +
      (e.habitats.length ? '<section class="bloque"><h3>' + svgIcono('drop') + 'Hábitats</h3><div class="envoltura">' +
        e.habitats.map(function (h) { return '<span class="eti">' + esc(h) + '</span>'; }).join('') +
        (e.cara ? '<span class="eti" title="La guía dice la cara en dos sitios: ' +
          'el dibujo del perfil y el texto. Ésta es la del texto; la del dibujo ' +
          'va bajo el perfil de altitud. En 12 de 103 especies no coinciden.">' +
          svgIcono('sun') + 'Cara ' + esc(e.cara.toLowerCase()) +
          ' <small>según el texto</small></span>' : '') +
        '</div></section>' : '') +
    '</div>' +

    '<div class="textos">' +
      bloque('eye', 'Descripción', e.desc) +
      bloque('drop', 'Hábitat', e.hab) +
      bloque('globe-hemisphere-west', 'Distribución', e.dist) +
      bloque('info', 'Situación actual e importancia', e.sit) +
      '<div class="fuente"><b>' + esc(G.meta.titulo) + '</b>, p. ' + e.pag + '.<br>' +
        esc(G.meta.cita) + '</div>' +
    '</div>' +

    '<div class="vecinas">' + tarjetaVecina(vecina(-1), -1) +
      tarjetaVecina(vecina(1), 1) + '</div>';

  $('#ficha-int').innerHTML = html;
  vigilarFoto($('#foto-grande'));
  $('#ficha-titulo').textContent = e.comun;
  $('#ficha-int').scrollTop = 0;
  $('#ficha').scrollTop = 0;
  $('#ficha-antes').disabled = !vecina(-1);
  $('#ficha-sig').disabled = !vecina(1);
  $('#ficha').classList.add('abierta');
  bloquearFondo(true);
  if (empujar !== false) history.pushState({ ficha: id }, '');
}

function cerrarFicha() {
  $('#ficha').classList.remove('abierta');
  indiceFicha = -1;
  bloquearFondo(false);
}

/* ---------- eventos ---------- */
// en main y no en #rejilla: las tarjetas de la cola son tarjetas igual
$('main').addEventListener('click', function (ev) {
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
$('#ficha-antes').addEventListener('click', function () { pasarA(-1); });
$('#ficha-sig').addEventListener('click', function () { pasarA(1); });
$('#ficha-int').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-paso]');
  if (b) pasarA(+b.dataset.paso);
});
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
/* Con una capa encima, la barra de la pagina no mueve nada y sobra. Se quita
   y se compensa su ancho con relleno en el html: asi el catalogo de debajo no
   se corre al abrir ni al cerrar. */
function bloquearFondo(v) {
  var d = document.documentElement;
  if (v) {
    // solo se mide la primera vez: ya bloqueado, la cuenta daria cero y el
    // relleno que compensa se perderia
    if (!d.classList.contains('bloqueado')) {
      d.style.setProperty('--barra', (window.innerWidth - d.clientWidth) + 'px');
    }
    d.classList.add('bloqueado');
  } else if (!$('#ficha').classList.contains('abierta') && !panelActual) {
    d.classList.remove('bloqueado');   // puede quedar otra capa abierta
  }
}

function abrirPanel(v, cual) {
  cual = cual || '#panel';
  $(cual).classList.toggle('abierto', v);
  panelActual = v ? cual : null;
  $('#velo').classList.toggle('abierto', v);
  bloquearFondo(v);
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
  F.conserv = []; F.cara = [];
  quitarAltitud();   // repinta
}
// el panel es de filtros: «Limpiar» no toca el texto del buscador
$('#btn-reset').addEventListener('click', function () { tirarFiltros(false); });

/* ---------- la ladera: el filtro de altitud ----------
   Un corte del cerro, el mar a la izquierda y la cuesta subiendo a la derecha.
   Antes habia tres pestañas y dos deslizadores: «todas», «una cota» y «un
   rango». Las dos ultimas nunca fueron dos preguntas -la condicion de la cota
   es la del rango con los dos extremos juntos- y ninguna de las dos dejaba
   pedir 300 y 800 sin lo de en medio, que es lo que hace falta para comparar
   dos pisos. Ahora son diez alturas que se marcan como se marcan los meses, y
   lo seguido se funde solo.

   El lienzo se mide en pixeles, no en unidades propias: el alto es fijo -diez
   filas de 31 px, que es lo que pide un dedo- y el ancho es el que haya. Asi,
   al ensanchar la ventana no se escala el dibujo entero -que habria estirado
   tambien la letra y los trazos- sino que crece el cerro, que se tiende y se
   vuelve mas suave. Es la unica parte que da de si. */
var ALT_FILA = 31, ALT_ARRIBA = 10;
var ALT_XLAB = 51;                      // la columna de cifras, fija
var ALT_MEDIA_CIFRA = 3.7;              // de la base de la cifra a su centro

/* Las cifras rotulan NIVELES, no franjas, y por eso está el cero.

   Antes rotulaban la franja: el «100» se apoyaba dentro de la banda que va
   del cero a los cien, y el cero no se escribía en ninguna parte. Probado con
   gente: uno leyó el «100» como el nombre de esa banda -«la de los cien»- y,
   para coger desde el suelo, se fue a pulsar por debajo de ella, al agua,
   donde no hay nada que marcar. Y quien quiere precisión no sabe si «200» es
   el techo de su tramo o el suelo, es decir si llega a 200 o a 299.

   Puesta la cifra ENCIMA de su raya y escrito el cero, las dos dudas se caen
   solas: las rayas son alturas y lo de en medio es el tramo, así que marcar
   entre el 0 y el 200 se lee «de cero a doscientos» sin más explicación.
   Las franjas que se marcan siguen siendo las mismas diez; lo que cambia es
   dónde se escribe el número. */
var ALT_MARCAS = (function () {
  var v = [];
  for (var h = 0; h <= ALT_MAX; h += ALT_PASO) v.push(h);
  return v;
})();
// el alto sale del tramo de altitud que se dibuja, no de contar filas: asi una
// fila mide ALT_FILA exacto y las zonas de toque no se pisan entre si
var ALT_ALTO;
/* Bajo cero hay sitio para el agua, pero MENOS de una franja: con una franja
   entera el agua medía lo mismo que un tramo marcable y se leía como uno más
   -ahí fue a pulsar quien buscaba «desde el suelo»-. A 55 son 17 px: se ve
   que hay mar y lecho, y ya no parece un peldaño de la escalera. */
var ALT_TOPE = ALT_MAX + ALT_PASO / 2, ALT_PIE = -55;
ALT_ALTO = ALT_ARRIBA + (ALT_TOPE - ALT_PIE) / ALT_PASO * ALT_FILA;
var ALT_ANCHO = 340;                    // lo ultimo que se midio

function altY(a) {
  return ALT_ARRIBA + (ALT_TOPE - a) * (ALT_ALTO - ALT_ARRIBA) / (ALT_TOPE - ALT_PIE);
}
function altCima() { return ALT_ANCHO - 20; }
function altDer()  { return ALT_ANCHO - 10; }

/* El terreno es UNA sola curva, del fondo del mar a la cima. Antes eran dos
   -el cerro por un lado y el lecho del mar por otro, pegados en la orilla- y
   se notaba el codo; ademas, para que al agua le quedara cuerpo, el lecho
   tenia que caer deprisa y parecia un abismo. Siendo una sola, la orilla deja
   de ser un numero elegido: es donde la curva cruza el cero, y la playa sale
   tendida sola, porque ahi la ese esta en su tramo plano.

   La ese va sobre la altitud y no sobre la distancia: asi hay playa tendida
   abajo, ladera recia en medio y cumbre redondeada arriba. Al reves salia un
   farallon junto al mar. Se rehace con cada ancho, que es lo que hace que el
   cerro se tienda en vez de estirarse. */
var ALT_SUP = [];
function altCurva() {
  var k = altCima();
  ALT_SUP = [];
  /* Arranca en la columna de cifras y no en el cero del lienzo: el cero de
     altitud cae justo donde el agua toca la orilla, y con el dibujo pegado
     al margen su cifra quedaba encima del mar. Corrido a la derecha, la
     columna queda limpia y el cero entra. */
  for (var i = 0; i <= 240; i++) {
    var t = i / 240, e = t * t * (3 - 2 * t);
    ALT_SUP.push({ x: ALT_XLAB + t * (k - ALT_XLAB), a: ALT_PIE + e * (ALT_TOPE - ALT_PIE) });
  }
}
altCurva();

function altX(a) {
  if (a <= ALT_SUP[0].a) return ALT_SUP[0].x;
  for (var i = 1; i < ALT_SUP.length; i++) {
    if (ALT_SUP[i].a >= a) {
      var p = ALT_SUP[i - 1], q = ALT_SUP[i];
      return p.x + (a - p.a) / (q.a - p.a) * (q.x - p.x);
    }
  }
  return altCima();
}
function altCosta() { return altX(0); }        // donde la curva cruza el cero
function altCuesta(a1, a2) {
  return ALT_SUP.filter(function (p) { return p.a >= a1 && p.a <= a2; });
}
/* La tierra entre dos alturas: la pendiente por la izquierda y el borde del
   dibujo por la derecha, en un solo contorno. De una pieza y no una por
   altura: si no, dos alturas seguidas salen con una raya en medio y se leen
   como dos cosas sueltas en vez de como un tramo. */
function altMancha(aBaja, aAlta) {
  var arr = altCuesta(aBaja, aAlta), d = 'M ' + altX(aAlta).toFixed(1) + ' ' + altY(aAlta).toFixed(1);
  for (var i = arr.length - 1; i >= 0; i--) {
    d += ' L ' + arr[i].x.toFixed(1) + ' ' + altY(arr[i].a).toFixed(1);
  }
  return d + ' L ' + altX(aBaja).toFixed(1) + ' ' + altY(aBaja).toFixed(1) +
         ' L ' + altDer() + ' ' + altY(aBaja).toFixed(1) +
         ' L ' + altDer() + ' ' + altY(aAlta).toFixed(1) + ' Z';
}

function pintarAltitud() {
  var caja = $('#f-alt');
  if (!caja) return;
  var ancho = Math.round(caja.clientWidth) || ALT_ANCHO;
  if (ancho > 60) { ALT_ANCHO = ancho; altCurva(); }

  var y0 = altY(0), yPie = ALT_ALTO - 2, costa = altCosta();
  var traza = function (arr) {
    return arr.map(function (p) {
      return p.x.toFixed(1) + ' ' + altY(p.a).toFixed(1);
    }).join(' L ');
  };
  var s = '<svg viewBox="0 0 ' + ALT_ANCHO + ' ' + ALT_ALTO + '" height="' + ALT_ALTO +
          '" role="group" aria-label="Altitud">';
  // la tierra entera, la de debajo del agua incluida, y el agua por encima
  s += '<path class="tierra" d="M ' + ALT_XLAB + ' ' + yPie + ' L ' + traza(ALT_SUP) +
       ' L ' + altDer() + ' ' + altY(ALT_TOPE).toFixed(1) +
       ' L ' + altDer() + ' ' + yPie + ' Z"/>';
  var sumergido = ALT_SUP.filter(function (p) { return p.a <= 0; }).reverse();
  s += '<path class="mar" d="M ' + ALT_XLAB + ' ' + y0.toFixed(1) + ' L ' +
       costa.toFixed(1) + ' ' + y0.toFixed(1) + ' L ' + traza(sumergido) + ' Z"/>';
  /* Las rayas cruzan el cerro de lado a lado y no empiezan donde la ladera
     las alcanza. Si el número dice hasta dónde llega un tramo, su raya tiene
     que poder seguirse con el ojo desde la cifra hasta el otro margen. */
  ALT_MARCAS.forEach(function (h) {
    s += '<line class="' + (h ? 'rejilla' : 'nivel0') + '" x1="' + ALT_XLAB +
         '" y1="' + altY(h).toFixed(1) + '" x2="' + altDer() +
         '" y2="' + altY(h).toFixed(1) + '"/>';
  });
  var tr = tramosAlt();
  tr.forEach(function (r) {
    var a1 = r[0] - ALT_PASO, a2 = r[1];       // del suelo del tramo a su techo
    s += '<path class="tramo" d="' + altMancha(a1, a2) + '"/>';
    /* El rastro va de la cifra de abajo a la de arriba, las dos incluidas:
       son los dos extremos del tramo y es lo que hay que leer. */
    var yAlto = altY(r[1]) - 9, yBajo = altY(a1) + 9;
    s += '<rect class="pilalab" x="5" y="' + yAlto.toFixed(1) +
         '" width="' + (ALT_XLAB - 14) + '" height="' +
         (yBajo - yAlto).toFixed(1) + '" rx="8"/>';
  });
  s += '<path class="suelo" d="M ' + ALT_SUP.map(function (p) {
    return p.x.toFixed(1) + ' ' + altY(p.a).toFixed(1); }).join(' L ') + '"/>';
  // lo unico que se repasa es la cuesta marcada, por encima del suelo
  tr.forEach(function (r) {
    var arr = altCuesta(r[0] - ALT_PASO, r[1]);
    if (arr.length < 2) return;
    s += '<path class="cuesta-on" d="M ' + traza(arr) + '"/>';
  });
  /* Sobre el dibujo, lo que se toca es la franja: de la raya de arriba a la
     de abajo, que es exactamente lo que se pinta al marcarla. */
  ALTURAS.forEach(function (h) {
    s += '<g class="fila" data-h="' + h + '">' +
         '<rect class="cel" x="0" y="' + altY(h).toFixed(1) + '" width="' + ALT_ANCHO +
         '" height="' + ALT_FILA + '"/></g>';
  });
  /* La columna de cifras va aparte y se reparte CENTRADA en cada número, no
     entre rayas: tocar el 500 coge de 400 a 500, «hasta aquí», que es como se
     lee una cifra al lado de una escala. Encaja con el dibujo, porque la
     mitad de abajo de cada número cae ya dentro de su propia franja; lo que
     cambia es la mitad de arriba, y ahí es justo donde hay que decidir, y la
     cifra manda. El cero no tiene franja debajo, así que coge la de encima,
     que es la que quiere quien pulsa ahí.
     Van después de las franjas para quedar por encima, y las cifras no
     reciben toques -el glifo se los tragaba y no pasaba nada-. */
  ALT_MARCAS.forEach(function (h) {
    s += '<g class="fila" data-h="' + (h || ALT_MIN) + '">' +
         '<rect class="cel" x="0" y="' + (altY(h) - ALT_FILA / 2).toFixed(1) +
         '" width="' + (ALT_XLAB - 6) + '" height="' + ALT_FILA + '"/></g>';
  });
  /* Las cifras van aparte de las zonas de toque: hay once y las franjas son
     diez, porque una franja se marca con sus dos extremos. Encendida la cifra
     si cae dentro de algún tramo marcado, extremos incluidos. */
  var vivos = {};
  tr.forEach(function (r) {
    for (var k = r[0] - ALT_PASO; k <= r[1]; k += ALT_PASO) vivos[k] = 1;
  });
  ALT_MARCAS.forEach(function (h) {
    s += '<text class="lab' + (vivos[h] ? ' lab-on' : '') + '" x="' + (ALT_XLAB - 15) +
         '" y="' + (altY(h) + ALT_MEDIA_CIFRA).toFixed(1) +
         '" text-anchor="end">' + h + '</text>';
  });
  caja.innerHTML = s + '</svg>';

  $('#alt-fichas').innerHTML = tr.map(function (r) {
    return '<button class="chip" data-alt="' + r[0] + '-' + r[1] + '" aria-label="Quitar ' +
        textoTramo(r) + '">' + esc(textoTramo(r)) + svgIcono('x', 'quita') + '</button>';
  }).join('');
}
window.addEventListener('resize', pintarAltitud);

function quitarTramoAlt(b) {
  var p = b.getAttribute('data-alt').split('-');
  for (var h = +p[0]; h <= +p[1]; h += ALT_PASO) {
    var i = F.alt.indexOf(h);
    if (i >= 0) F.alt.splice(i, 1);
  }
  render();
}
$('#alt-fichas').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-alt]');
  if (b) quitarTramoAlt(b);
});

function quitarAltitud() { F.alt = []; render(); }

/* Tocar pone o quita una altura; mantener y arrastrar coge un tramo, igual
   que en los meses y con la misma espera. Si el arrastre empieza sobre algo
   ya marcado, borra en vez de poner, que es como se deshace un tramo.

   Con los meses bastaba con cederle al navegador el eje vertical: alli se
   pinta de lado. Aqui se pinta en el mismo eje por el que se desplaza el
   panel, y el navegador, en cuanto el dedo se movia, se quedaba el gesto y
   mantener pulsado no llegaba nunca a pintar. Asi que la ladera se queda con
   todos los gestos y, mientras no este pintando, desplaza ella el panel: un
   pixel de dedo, un pixel de panel. Se pierde el deslizamiento por inercia
   sobre el dibujo, que es el precio de poder pintar hacia abajo. */
(function () {
  var caja = $('#f-alt');
  if (!caja) return;
  var pintado = null, reloj = null, tragar = false, arrastre = null;
  var cont = caja.closest('.panel-cuerpo');
  var vel = 0, ultimoT = 0, inercia = null;

  /* Al quedarnos el gesto se pierde el deslizamiento por inercia del
     navegador, y sobre 357 px de dibujo se nota: hay que dar dos pasadas para
     bajar lo que antes bajaba de un manotazo. Asi que se devuelve a mano, con
     el mismo frenado de siempre. */
  function lanzar(v) {
    cancelAnimationFrame(inercia);
    var t0 = performance.now();
    inercia = requestAnimationFrame(function paso(t) {
      var dt = Math.min(32, t - t0); t0 = t;
      v *= Math.pow(0.95, dt / 16);
      if (Math.abs(v) < 0.02 || !cont) return;
      cont.scrollTop -= v * dt;
      inercia = requestAnimationFrame(paso);
    });
  }

  function alturaEn(ev) {
    var e = document.elementFromPoint(ev.clientX, ev.clientY);
    var g = e && e.closest && e.closest('.fila');
    return g ? +g.getAttribute('data-h') : null;
  }
  function pintarHastaAlt(h) {
    var a = Math.min(pintado.ancla, h), b = Math.max(pintado.ancla, h), hay = {};
    pintado.antes.forEach(function (x) { hay[x] = 1; });
    for (var k = a; k <= b; k += ALT_PASO) {
      if (pintado.pone) hay[k] = 1; else delete hay[k];
    }
    var nuevo = Object.keys(hay).map(Number).sort(function (x, y) { return x - y; });
    var ahora = F.alt.slice().sort(function (x, y) { return x - y; });
    if (nuevo.join() === ahora.join()) return;
    F.alt = nuevo;
    render();
  }

  caja.addEventListener('pointerdown', function (ev) {
    tragar = false;                     // cada pulsacion empieza limpia
    cancelAnimationFrame(inercia);      // el dedo para lo que venia rodando
    var h = alturaEn(ev);
    if (h == null) return;
    arrastre = { y: ev.clientY, movido: 0, tactil: ev.pointerType !== 'mouse' };
    vel = 0; ultimoT = performance.now();
    if (arrastre.tactil) { try { caja.setPointerCapture(ev.pointerId); } catch (e) {} }
    clearTimeout(reloj);
    reloj = setTimeout(function () {
      pintado = { ancla: h, antes: F.alt.slice(), pone: F.alt.indexOf(h) < 0 };
      arrastre = null;
      try { caja.setPointerCapture(ev.pointerId); } catch (e) {}
      pintarHastaAlt(h);
      tragar = true;
    }, ESPERA_PINTAR);
  });
  caja.addEventListener('pointermove', function (ev) {
    if (pintado) {
      ev.preventDefault();
      var h = alturaEn(ev);
      if (h != null) pintarHastaAlt(h);
      return;
    }
    if (!arrastre) { clearTimeout(reloj); return; }
    var dy = ev.clientY - arrastre.y;
    arrastre.y = ev.clientY;
    arrastre.movido += Math.abs(dy);
    if (arrastre.movido > 8) clearTimeout(reloj);   // ya es un desplazamiento
    var t = performance.now(), dt = t - ultimoT;
    if (dt > 0) { vel = dy / dt; ultimoT = t; }
    if (arrastre.tactil && cont) cont.scrollTop -= dy;
  });
  function soltar() {
    clearTimeout(reloj);
    if (arrastre && arrastre.movido > 8) {
      tragar = true;                                     // movio: no es un toque
      if (arrastre.tactil && Math.abs(vel) > 0.15) lanzar(vel);
    }
    pintado = null; arrastre = null;
  }
  caja.addEventListener('pointerup', soltar);
  caja.addEventListener('pointercancel', soltar);
  caja.addEventListener('click', function (ev) {
    if (tragar) { tragar = false; return; }
    var h = alturaEn(ev);
    if (h == null) return;
    alterna(F.alt, h);
    render();
  });
})();

function abrirInfo(v) {
  if (v) {
    /* Lo primero que se lee es que esto no es oficial. Va antes que la ficha
       del libro a proposito: quien abre esta pantalla suele venir buscando
       quien responde de lo que esta leyendo. */
    $('#info-libro').innerHTML =
      '<h3>' + svgIcono('warning-circle') + 'Aviso</h3>' +
      '<div class="ficha-libro">' +
        /* Sin dueño mientras no este decidido si esto es de la asociacion o
           algo personal. «Independiente» ademas refuerza lo de arriba sin
           tener que nombrar a nadie. */
        '<p><b>Esta no es una aplicación oficial.</b> No está hecha, revisada ' +
          'ni respaldada por el SERFOR ni por los autores de la guía. Es un ' +
          'proyecto independiente para poder consultar el libro en el campo, ' +
          'sin señal.</p>' +
        '<p>Todo el contenido —textos, fotografías, dibujos y datos— es de la ' +
          'guía y pertenece a sus autores y al SERFOR. Si algo de aquí no ' +
          'coincide con el libro, la información del libro es la correcta.</p>' +
        /* Se dice en presente y sin fechas, para que siga siendo verdad
           mientras se pide. Cuando haya respuesta, esta linea se cambia por
           la autorizacion concreta. */
        '<p><b>Difusión pendiente de autorización.</b> Para distribuir la guía ' +
          'en esta forma hace falta el permiso del SERFOR. Mientras no lo haya, ' +
          'esto es un prototipo para enseñar, no una app publicada.</p>' +
      '</div>' +

      '<h3>' + svgIcono('book-open') + 'El libro</h3>' +
      '<div class="ficha-libro">' +
        '<p><b>' + esc(G.meta.titulo) + '</b><br>' + esc(G.meta.autores) + '<br>' +
          esc(G.meta.editor) + ', ' + G.meta.anio + '<br>ISBN ' + esc(G.meta.isbn) + '</p>' +
        '<p>' + G.meta.especies + ' especies · ' + G.lomas.length + ' lomas · ' +
          (G.meta.nFotos || '') + ' fotografías</p>' +
        '<p>Fotografías: ' + esc(G.meta.fotografias) + '</p>' +
        '<p class="cita">' + esc(G.meta.cita) + '</p>' +
        /* Al portal del Estado, no al PDF. Lleva a la página oficial del
           SERFOR donde está publicada la guía; desde ahí el que quiera se
           baja el libro entero de la fuente. Así cualquiera puede comprobar
           de dónde sale todo esto y quedarse con el original, que es lo
           honrado teniendo el contenido ajeno dentro.

           Es el primer -y único- enlace de la app, y sale fuera: se abre en
           otra pestaña y lleva rel=noopener, y se avisa de que necesita
           conexión, que aquí no se da por supuesta. */
        '<a class="enlace" href="' + ENLACE_SERFOR + '" target="_blank" ' +
          'rel="noopener noreferrer">' +
          svgIcono('globe-hemisphere-west') +
          '<span class="enlace-txt"><b>La guía en el portal del SERFOR</b>' +
            '<span>gob.pe — la página oficial del libro, no una descarga. ' +
            'Necesita conexión.</span></span>' +
          svgIcono('caret-right', 'enlace-ir') +
        '</a>' +
      '</div>' +

      '<h3>' + svgIcono('seal-check') + 'Gratis, y sin nada a cambio</h3>' +
      '<div class="ficha-libro">' +
        '<p>Es gratuita y lo seguirá siendo. No tiene publicidad, ni compras, ' +
          'ni cuentas, ni versión de pago. Nadie gana dinero con ella.</p>' +
        '<p>Nadie está autorizado a cobrar por ella. Conseguirla, usarla y ' +
          'recibir sus correcciones no cuesta nada, ni lo costará.</p>' +
        '<p>No recoge ningún dato tuyo. No hay estadísticas de uso ni rastreo: ' +
          'funciona entera en tu teléfono y no envía nada a ningún servidor. Lo ' +
          'único que descarga son sus propias fotos, y sólo si se lo pides.</p>' +
      '</div>' +

      '<h3>' + svgIcono('sliders-horizontal') + 'Algunos cambios</h3>' +
      '<div class="ficha-libro">' +
        '<p>Lo que la app pone de su parte se guarda separado del dato del ' +
          'libro, para poder distinguir siempre uno de otro:</p>' +
        '<ul class="cambios">' +
          '<li>El <b>color de la flor</b>, deducido del texto y de las ' +
            'fotografías, para poder buscar por color.</li>' +
          '<li><b>Dos erratas</b> de la extracción del PDF, corregidas.</li>' +
          '<li><b>Dos sinónimos</b> científicos, añadidos.</li>' +
          '<li><b>Una especie</b> vista en una loma que la guía no le cita: el ' +
            'zapatito (<i>Calceolaria pinnata</i>), en las lomas de Villa María.</li>' +
          '<li><b>Quince fichas</b> en las que el dibujo del perfil y el texto ' +
            'de la propia guía no dicen lo mismo sobre la altitud. Están ' +
            'anotadas, pero no se ha cambiado ninguna: la app enseña lo que ' +
            'dice el dibujo, que es lo que hace el libro.</li>' +
        '</ul>' +
      '</div>';
  }
  abrirPanel(v, '#panel-info');
}
$('#btn-info').addEventListener('click', function () { abrirInfo(true); });
$('#cerrar-info').addEventListener('click', function () { abrirInfo(false); });


document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') {
    if (!$('#sug').hidden) { cerrarSug(); return; }
    if ($('#visor').classList.contains('abierto')) { $('#visor').classList.remove('abierto'); return; }
    if (panelActual) { cerrarPanelAbierto(); return; }
    if ($('#ficha').classList.contains('abierta')) history.back();
  }
  if (ev.key === '/' && document.activeElement !== $('#q')) { ev.preventDefault(); $('#q').focus(); }
  if ($('#ficha').classList.contains('abierta') && !$('#visor').classList.contains('abierto')) {
    if (ev.key === 'ArrowLeft') pasarA(-1);
    if (ev.key === 'ArrowRight') pasarA(1);
  }
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
pintarFiltros();
pintarAltitud();
pintarIconos(document);
pintarBotonOrden();
pintarGuardar();
render();
medirCabecera();

})();
