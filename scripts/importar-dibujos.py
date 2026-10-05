# -*- coding: utf-8 -*-
"""De los SVG que exporta Affinity a los dibujos que usa la app.

    python scripts/importar-dibujos.py

Lee assets/habitat-*.svg y escribe datos/dibujos-habitat/*.svg.

Affinity saca cada dibujo en su mesa de trabajo de 360x450, en negro, con una
maraña de <g transform> anidados -hasta cuatro hondos- y con un stroke-width
distinto por figura, porque va compensando a mano los grupos que escalan más
en y que en x. Nada de eso le sirve a la app, y pesa.

Aquí se aplana: se concatenan las matrices y se meten en las coordenadas, el
lienzo pasa a 80x100, queda un solo grosor y el color desaparece -lo pone
currentColor desde fuera, que es lo que hace que el dibujo siga al tema y se
ponga verde al elegirlo-. De 10 KB por archivo se queda en 1 ó 2.

EL GROSOR NO SE RESPETA, y es a propósito. Los dibujos vienen con el trazo a
4 px sobre 360, que en el lienzo de 80 son 0,89. Pero esto se ve a 60 px de
ancho, así que 0,89 serían dos tercios de un píxel: la ladera arenosa perdía
los 57 granos de arena enteros -no se veía ni uno- y las crestas quedaban en
un gris sucio. Se normaliza a GROSOR, que es el de los demás dibujos del
juego. Si algún día se quiere más fino, se cambia ahí y vale para los ocho.

No edites a mano lo que sale de aquí: edita el .af y vuelve a exportar.
"""
import io, math, os, re, sys
import xml.etree.ElementTree as ET

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'assets')
DESTINO = os.path.join(RAIZ, 'datos', 'dibujos-habitat')
LIENZO_W, LIENZO_H = 80.0, 100.0
GROSOR = 2

# El nombre del archivo de Affinity no tiene por qué ser la clave del dibujo.
NOMBRES = {
    'habitat-crestaRocosa':  ('cresta',    u'Cresta rocosa — crestas encajadas que suben a un pico.'),
    'habitat-fondoQuebrada': ('quebrada',  u'Fondo de quebrada — las mismas líneas, invertidas, bajando al fondo.'),
    'habitat-laderaArenosa': ('arenosa',   u'Ladera arenosa — la ladera suave, con el grano de la arena.'),
    'habitat-laderaRocosa':  ('rocosa',    u'Ladera rocosa — la ladera, cubierta de bloques de roca.'),
    'habitat-lomaArborea':   ('arborea',   u'Loma arbórea — la tara y un segundo árbol menor.'),
    'habitat-lomaArbustiva': ('arbustiva', u'Loma arbustiva — matas redondeadas, media altura.'),
    'habitat-lomaHerbacea':  ('herbacea',  u'Loma herbácea — la pradera: una estera baja y continua.'),
    'habitat-zonaCactaceas': ('cactaceas', u'Zona de cactáceas — columnares separados; el terreno más seco.'),
}

CABECERA = (u'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" fill="none" '
            u'stroke="currentColor" stroke-width="%d" stroke-linecap="round" '
            u'stroke-linejoin="round" aria-hidden="true">' % GROSOR)


# ---------------------------------------------------------------- matrices
def mul(m, n):
    """m aplicada DESPUÉS de n."""
    a1, b1, c1, d1, e1, f1 = m
    a2, b2, c2, d2, e2, f2 = n
    return (a1 * a2 + c1 * b2, b1 * a2 + d1 * b2,
            a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
            a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1)


def aplicar(m, x, y):
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)


def escala(m):
    """La escala media. Con un grupo que estira sólo en y, lo que el ojo ve
    del trazo no es ni la escala de x ni la de y, sino la raíz del área."""
    a, b, c, d = m[:4]
    return math.sqrt(abs(a * d - b * c)) or 1.0


def leer_transform(t):
    m = (1, 0, 0, 1, 0, 0)
    for nombre, args in re.findall(r'(matrix|translate|scale|rotate)\s*\(([^)]*)\)', t or ''):
        v = [float(x) for x in re.split(r'[,\s]+', args.strip()) if x]
        if nombre == 'matrix':
            n = tuple(v)
        elif nombre == 'translate':
            n = (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
        elif nombre == 'scale':
            n = (v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0)
        else:
            r = math.radians(v[0])
            n = (math.cos(r), math.sin(r), -math.sin(r), math.cos(r), 0, 0)
        m = mul(m, n)
    return m


# -------------------------------------------------------------------- rutas
NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?')
TROZO = re.compile(r'([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)')


def redondo(v):
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def pto(p):
    return '%s,%s' % (redondo(p[0]), redondo(p[1]))


def transformar_ruta(d, m, archivo):
    """La misma ruta, en absolutas y ya transformada.

    Sólo M/L/H/V/C/Z, que es lo único que saca Affinity de estos dibujos. Si
    algún día aparece un arco o una cuadrática, mejor que pare y se amplíe
    esto que no que salga un dibujo mal y nadie lo note.
    """
    salida, x, y, ix, iy = [], 0.0, 0.0, 0.0, 0.0
    for letra, resto in TROZO.findall(d):
        v = [float(n) for n in NUM.findall(resto)]
        rel, L = letra.islower(), letra.upper()
        if L == 'Z':
            salida.append('Z')
            x, y = ix, iy
            continue
        if L not in 'MLHVC':
            raise SystemExit('%s: comando «%s» sin soporte; amplía %s'
                             % (archivo, L, os.path.basename(__file__)))
        i = 0
        while i < len(v):
            if L == 'C':
                p = []
                for k in range(3):
                    cx, cy = (x + v[i], y + v[i + 1]) if rel else (v[i], v[i + 1])
                    i += 2
                    p.append(aplicar(m, cx, cy))
                    if k == 2:
                        x, y = cx, cy
                salida.append('C' + ' '.join(pto(q) for q in p))
                continue
            if L == 'H':
                px, py = (x + v[i] if rel else v[i]), y
                i += 1
            elif L == 'V':
                px, py = x, (y + v[i] if rel else v[i])
                i += 1
            else:
                px, py = (x + v[i], y + v[i + 1]) if rel else (v[i], v[i + 1])
                i += 2
            salida.append(('M' if L == 'M' else 'L') + pto(aplicar(m, px, py)))
            if L == 'M':
                ix, iy = px, py
                L = 'L'             # los pares que siguen a una M son líneas
            x, y = px, py
    return ''.join(salida)


# ------------------------------------------------------------------ recorrer
def recoger(nodo, m, fuera, archivo):
    m = mul(m, leer_transform(nodo.get('transform')))
    etq = nodo.tag.split('}')[-1]
    if etq == 'path' and nodo.get('d'):
        fuera.append(('path', transformar_ruta(nodo.get('d'), m, archivo)))
    elif etq == 'circle':
        fuera.append(('punto', aplicar(m, float(nodo.get('cx', 0)),
                                       float(nodo.get('cy', 0)))))
    # el <rect> de la mesa de trabajo no se dibuja, y no hay más formas
    for h in nodo:
        recoger(h, m, fuera, archivo)
    return fuera


def convertir(ruta):
    raiz = ET.parse(ruta).getroot()
    vb = [float(n) for n in re.split(r'[,\s]+', raiz.get('viewBox').strip())]
    k = min(LIENZO_W / vb[2], LIENZO_H / vb[3])
    piezas = recoger(raiz, (k, 0, 0, k, -vb[0] * k, -vb[1] * k), [], os.path.basename(ruta))

    cuerpo, puntos = [], []
    for tipo, dato in piezas:
        if tipo == 'path':
            cuerpo.append('<path d="%s"/>' % dato)
        else:
            # Los granos de arena van todos en una ruta, como segmentos de
            # nada con el remate redondo del trazo. Como circulos sueltos son
            # 2 KB y hay que decirles relleno y trazo aparte; así son 700 B y
            # pintan del mismo grosor que todo lo demás.
            puntos.append('M%sh.01' % pto(dato))
    if puntos:
        cuerpo.append('<path d="%s"/>' % ''.join(puntos))
    return ''.join(cuerpo), len(piezas)


def main():
    if not os.path.isdir(ORIGEN):
        raise SystemExit('no hay carpeta assets/')
    hechos = 0
    for f in sorted(os.listdir(ORIGEN)):
        if not f.endswith('.svg'):
            continue
        base = f[:-4]
        if base not in NOMBRES:
            raise SystemExit('assets/%s: no sé qué hábitat es. Añádelo a '
                             'NOMBRES, en %s' % (f, os.path.basename(__file__)))
        clave, nota = NOMBRES[base]
        cuerpo, n = convertir(os.path.join(ORIGEN, f))
        texto = (u'<!-- %s\n'
                 u'     Generado por scripts/importar-dibujos.py desde assets/%s.\n'
                 u'     No lo edites aquí: edita assets/source/illustrations-habitat.af,\n'
                 u'     exporta otra vez y vuelve a pasar el guión. -->\n'
                 u'%s\n%s\n</svg>\n' % (nota, f, CABECERA, cuerpo))
        destino = os.path.join(DESTINO, clave + '.svg')
        io.open(destino, 'w', encoding='utf-8', newline='\n').write(texto)
        print('-> datos/dibujos-habitat/%-14s %5d B  (%d figuras)'
              % (clave + '.svg', len(texto.encode('utf-8')), n))
        hechos += 1
    print('%d dibujo(s). Ahora: python scripts/construir.py' % hechos)


if __name__ == '__main__':
    main()
