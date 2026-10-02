# -*- coding: utf-8 -*-
"""Levanta la app en la red local para probarla en el telefono.

    python scripts/servir.py            -> http://<tu-ip>:8911
    python scripts/servir.py 9000       -> en otro puerto

No deja cachear nada, a proposito: el http.server pelado manda Last-Modified
y el navegador se inventa una ventana de frescura, asi que durante las pruebas
se queda con el app.js viejo y uno cree que el cambio no ha funcionado.

Esto es solo para probar. Lo que se publica son los archivos de app/ tal cual,
y de las cabeceras se encarga el alojamiento.
"""
import functools, os, socket, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAIZ = os.path.join(AQUI, 'app')
PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8911


class SinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a):
        pass


SinCache.extensions_map['.avif'] = 'image/avif'
SinCache.extensions_map['.webmanifest'] = 'application/manifest+json'
def mi_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))       # no manda nada: solo mira por donde saldria
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


h = functools.partial(SinCache, directory=RAIZ)
print('app/ en http://%s:%d   (y en http://127.0.0.1:%d)' % (mi_ip(), PUERTO, PUERTO))
print('el telefono tiene que estar en el mismo wifi.  Ctrl+C para parar.', flush=True)
ThreadingHTTPServer(('0.0.0.0', PUERTO), h).serve_forever()
