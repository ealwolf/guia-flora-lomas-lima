# -*- coding: utf-8 -*-
"""Dibuja el icono de la app: una flor de amancaes sobre verde loma.

Se ejecuta una sola vez y los PNG quedan versionados en app/icono/. No forma
parte de construir.py porque el icono no depende de los datos.

Uso:  python scripts/icono.py
"""
import io, os, sys, math
from PIL import Image, ImageDraw

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'app', 'icono')

VERDE = (47, 107, 69)          # --acento
VERDE_HONDO = (31, 74, 47)
CREMA = (247, 245, 240)        # --fondo
AMARILLO = (242, 193, 78)      # el amarillo de los amancaes

S = 2048                       # se dibuja grande y se reduce: bordes suaves


def petalo(d, cx, cy, largo, ancho, giro, color):
    """Un pétalo es una elipse girada; se dibuja aparte y se pega."""
    caja = Image.new('RGBA', (largo, largo), (0, 0, 0, 0))
    ImageDraw.Draw(caja).ellipse(
        [(largo - ancho) // 2, 0, (largo + ancho) // 2, largo], fill=color)
    caja = caja.rotate(giro, resample=Image.BICUBIC, expand=True)
    d.paste(caja, (cx - caja.width // 2, cy - caja.height // 2), caja)


def flor(lienzo, cx, cy, radio):
    """Seis pétalos y un corazón amarillo."""
    for i in range(6):
        giro = i * 60
        rad = math.radians(giro + 90)
        # cada petalo sale del centro hacia fuera
        px = cx + int(math.cos(rad) * radio * 0.52)
        py = cy - int(math.sin(rad) * radio * 0.52)
        petalo(lienzo, px, py, int(radio * 1.05), int(radio * 0.46), giro, CREMA)
    d = ImageDraw.Draw(lienzo)
    r = int(radio * 0.24)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=AMARILLO)


def fondo(radio_esquina):
    """Verde con un degradado suave de arriba abajo."""
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    tira = Image.new('RGBA', (1, S))
    for y in range(S):
        t = y / (S - 1)
        tira.putpixel((0, y), tuple(
            int(VERDE[i] + (VERDE_HONDO[i] - VERDE[i]) * t) for i in range(3)) + (255,))
    grad = tira.resize((S, S))
    if radio_esquina:
        mascara = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mascara).rounded_rectangle([0, 0, S - 1, S - 1],
                                                  radius=radio_esquina, fill=255)
        img.paste(grad, (0, 0), mascara)
    else:
        img.paste(grad, (0, 0))
    return img


def construir(maskable):
    # en un icono maskable Android recorta hasta un 20 % por lado: el dibujo
    # se queda dentro del circulo seguro y el fondo llega a los bordes
    img = fondo(0 if maskable else int(S * 0.22))
    flor(img, S // 2, S // 2, int(S * (0.30 if maskable else 0.36)))
    return img


def main():
    os.makedirs(SALIDA, exist_ok=True)
    normal = construir(False)
    mask = construir(True)
    hechos = []
    for tam in (192, 512):
        p = os.path.join(SALIDA, 'icono-%d.png' % tam)
        normal.resize((tam, tam), Image.LANCZOS).save(p, optimize=True)
        hechos.append(p)
    p = os.path.join(SALIDA, 'icono-512-maskable.png')
    mask.resize((512, 512), Image.LANCZOS).save(p, optimize=True)
    hechos.append(p)
    # iOS no entiende maskable y no redondea: se le da uno ya redondeado
    p = os.path.join(SALIDA, 'apple-touch-icon.png')
    normal.resize((180, 180), Image.LANCZOS).save(p, optimize=True)
    hechos.append(p)
    for x in hechos:
        print('->', os.path.relpath(x, RAIZ), '%.0f KB' % (os.path.getsize(x) / 1024))


if __name__ == '__main__':
    main()
