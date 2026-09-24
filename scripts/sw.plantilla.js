/* Guarda la app en el teléfono para usarla sin señal.
   Generado por scripts/construir.py a partir de scripts/sw.plantilla.js.
   No editar app/sw.js: se reescribe en cada construcción.

   Dos almacenes a propósito:
     núcleo  html, css, js e iconos (~400 KB). Se guarda solo al entrar: sin
             él no hay app, y es pequeño.
     fotos   las 295 imágenes (12 MB). NO se bajan solas. Son datos de alguien
             y su plan de datos: las pide la persona desde el botón, y puede
             pararlas o borrarlas cuando quiera.
   Separados, corregir un color de flor vuelve a bajar 400 KB y no 12 MB.

   La descarga de fotos la hace la página, no este archivo: el navegador puede
   dormir un service worker a media faena, y son 12 MB. Aquí sólo se lleva la
   cuenta y se sirve lo guardado.

   Aquí sí se usa async/await: un service worker sólo existe en navegadores
   que lo entienden. El resto de la app se mantiene en ES5 por prudencia. */

var NUCLEO = '__NUCLEO__';
var FOTOS = '__FOTOS__';
var LISTA_NUCLEO = __LISTA_NUCLEO__;
var LISTA_FOTOS = __LISTA_FOTOS__;

self.addEventListener('install', function (ev) {
  ev.waitUntil((async function () {
    // el núcleo, todo o nada: sin él no hay app que abrir
    var nucleo = await caches.open(NUCLEO);
    await nucleo.addAll(LISTA_NUCLEO);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil((async function () {
    var nombres = await caches.keys();
    await Promise.all(nombres.map(function (n) {
      // fuera las versiones viejas; las dos actuales se quedan
      return (n === NUCLEO || n === FOTOS) ? null : caches.delete(n);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(responder(req));
});

async function responder(req) {
  // primero la copia: en el campo no hay red que esperar
  var copia = await caches.match(req, { ignoreSearch: true });
  if (copia) return copia;
  try {
    var res = await fetch(req);
    // el nucleo se completa solo; las fotos NO. Si se guardaran al verlas,
    // abrir la portada dejaria una docena en el telefono sin que nadie lo
    // haya pedido, y la vista diria «12 de 295» de una descarga que no fue.
    if (res && res.ok && res.type === 'basic' &&
        !/\/img\//.test(new URL(req.url).pathname)) {
      (await caches.open(NUCLEO)).put(req, res.clone());
    }
    return res;
  } catch (e) {
    // sin red y sin copia: si pedían una página, vale la portada
    if (req.mode === 'navigate') {
      var idx = await caches.match(new URL('index.html', self.registration.scope).href);
      if (idx) return idx;
    }
    throw e;
  }
}

/* ---------- lo que la página pregunta ---------- */

async function estado() {
  var fotos = await caches.open(FOTOS);
  var guardadas = {};
  (await fotos.keys()).forEach(function (r) {
    guardadas[new URL(r.url).pathname] = 1;
  });
  var raiz = new URL('./', self.registration.scope).pathname;
  var faltan = LISTA_FOTOS.filter(function (x) { return !guardadas[raiz + x]; });
  return {
    tipo: 'estado',
    cache: FOTOS,                       // la pagina escribe ahi al descargar
    total: LISTA_FOTOS.length,
    hechas: LISTA_FOTOS.length - faltan.length,
    faltan: faltan
  };
}

self.addEventListener('message', function (ev) {
  if (!ev.data) return;
  var responder2 = function (msg) {
    if (ev.source) ev.source.postMessage(msg);
  };
  if (ev.data.tipo === 'estado') {
    ev.waitUntil(estado().then(responder2));
  } else if (ev.data.tipo === 'borrar') {
    ev.waitUntil(caches.delete(FOTOS).then(estado).then(responder2));
  }
});
