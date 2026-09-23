/* Guarda la app entera en el teléfono para usarla sin señal.
   Generado por scripts/construir.py a partir de scripts/sw.plantilla.js.
   No editar app/sw.js: se reescribe en cada construcción.

   Dos almacenes a propósito:
     núcleo  html, css, js e iconos (~400 KB). Cambia cada vez que tocas
             los datos, así que se rehace a menudo.
     fotos   las 295 imágenes (12 MB). Casi nunca cambian.
   Separados, corregir un color de flor vuelve a bajar 400 KB en vez de 12 MB.

   Aquí sí se usa async/await: un service worker sólo existe en navegadores
   que lo entienden. El resto de la app se mantiene en ES5 por prudencia. */

var NUCLEO = '__NUCLEO__';
var FOTOS = '__FOTOS__';
var LISTA_NUCLEO = __LISTA_NUCLEO__;
var LISTA_FOTOS = __LISTA_FOTOS__;

async function avisar(msg) {
  var cs = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  cs.forEach(function (c) { c.postMessage(msg); });
}

function base() {
  return new URL('./', self.registration.scope).pathname;
}

async function cuantasFotos() {
  var c = await caches.open(FOTOS);
  return (await c.keys()).length;
}

self.addEventListener('install', function (ev) {
  ev.waitUntil(instalar());
});

async function instalar() {
  // el núcleo, todo o nada: sin él no hay app que abrir
  var nucleo = await caches.open(NUCLEO);
  await nucleo.addAll(LISTA_NUCLEO);

  // las fotos, por tandas y aguantando fallos: una foto que no baje no debe
  // impedir la instalación, y el manejador de fetch la recoge cuando se pida
  var fotos = await caches.open(FOTOS);
  var guardadas = {};
  (await fotos.keys()).forEach(function (r) {
    guardadas[new URL(r.url).pathname] = 1;
  });
  var raiz = base();
  var faltan = LISTA_FOTOS.filter(function (x) { return !guardadas[raiz + x]; });

  var total = LISTA_FOTOS.length;
  await avisar({ tipo: 'fotos', hechas: total - faltan.length, total: total });
  for (var i = 0; i < faltan.length; i += 10) {
    await Promise.all(faltan.slice(i, i + 10).map(function (u) {
      return fotos.add(u).catch(function () {});
    }));
    await avisar({ tipo: 'fotos', hechas: await cuantasFotos(), total: total });
  }
  await avisar({ tipo: 'fotos', hechas: await cuantasFotos(), total: total, fin: true });
  await self.skipWaiting();
}

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
    if (res && res.ok && res.type === 'basic') {
      var donde = /\/img\//.test(new URL(req.url).pathname) ? FOTOS : NUCLEO;
      (await caches.open(donde)).put(req, res.clone());
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

self.addEventListener('message', function (ev) {
  if (!ev.data) return;
  if (ev.data.tipo === 'estado') {
    ev.waitUntil((async function () {
      await avisar({ tipo: 'fotos', hechas: await cuantasFotos(),
                     total: LISTA_FOTOS.length, fin: true });
    })());
  }
});
