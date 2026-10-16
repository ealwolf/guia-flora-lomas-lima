# -*- coding: utf-8 -*-
"""De los dibujos editados a mano en assets/dibujos/ a los que usa la app.

    python scripts/importar-editados.py

Es una copia con nombre, nada más: estos dibujos ya vienen en el lienzo y con
el trazo del juego, así que no hay nada que convertir. Lo único que hace este
guión es llevarlos a la carpeta que lee la construcción y decir cuáles han
cambiado.

No valida: de eso se encarga scripts/construir.py, que ya conoce las reglas y
avisa con el nombre del archivo y el porqué. Tenerlas escritas en dos sitios
sería tenerlas distintas dentro de un año.

No confundir con importar-dibujos.py, que es otra cosa: aquél lee lo que
exporta Affinity -lienzo de 360x450, transformaciones anidadas, un grosor por
figura- y lo aplana. Éste no toca nada.
"""
import io, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'assets', 'dibujos')

# nombre en assets/dibujos  ->  carpeta de destino, nombre que espera la app
MAPA = {
    'habitat-lomaArborea':   ('dibujos-habitat', 'arborea'),
    'habitat-lomaArbustiva': ('dibujos-habitat', 'arbustiva'),
    'habitat-lomaHerbacea':  ('dibujos-habitat', 'herbacea'),
    'habitat-zonaCactaceas': ('dibujos-habitat', 'cactaceas'),
    'habitat-laderaArenosa': ('dibujos-habitat', 'arenosa'),
    'habitat-laderaRocosa':  ('dibujos-habitat', 'rocosa'),
    'habitat-crestaRocosa':  ('dibujos-habitat', 'cresta'),
    'habitat-fondoQuebrada': ('dibujos-habitat', 'quebrada'),
    'tipo-herbaceas':  ('dibujos-grupo', 'herbaceas'),
    'tipo-arbustivas': ('dibujos-grupo', 'arbustivas'),
    'tipo-cactaceas':  ('dibujos-grupo', 'cactaceas'),
    'tipo-trepadoras': ('dibujos-grupo', 'trepadoras'),
    'tipo-arboreas':   ('dibujos-grupo', 'arboreas'),
    'tipo-helechos':   ('dibujos-grupo', 'helechos'),
    'tipo-ephedrales': ('dibujos-grupo', 'ephedrales'),
    'tipo-parasitas':  ('dibujos-grupo', 'parasitas'),
}

# Cuatro de los hábitats los produce importar-dibujos.py desde Affinity y los
# sobrescribe en cada pasada. Editarlos aquí es perder el trabajo al siguiente
# `python scripts/importar-dibujos.py`, así que se avisa.
DE_AFFINITY = {'habitat-laderaArenosa', 'habitat-laderaRocosa',
               'habitat-crestaRocosa', 'habitat-fondoQuebrada'}


def main():
    if not os.path.isdir(ORIGEN):
        raise SystemExit('no hay carpeta assets/dibujos/')
    cambiados, avisos = 0, []
    for f in sorted(os.listdir(ORIGEN)):
        if not f.endswith('.svg'):
            continue
        base = f[:-4]
        if base not in MAPA:
            raise SystemExit('assets/dibujos/%s: no sé qué dibujo es. Añádelo '
                             'a MAPA, en %s' % (f, os.path.basename(__file__)))
        carpeta, clave = MAPA[base]
        nuevo = io.open(os.path.join(ORIGEN, f), encoding='utf-8').read()
        destino = os.path.join(RAIZ, 'datos', carpeta, clave + '.svg')
        viejo = io.open(destino, encoding='utf-8').read() if os.path.exists(destino) else None
        if nuevo == viejo:
            continue
        io.open(destino, 'w', encoding='utf-8', newline='\n').write(nuevo)
        print('-> datos/%s/%s.svg' % (carpeta, clave))
        cambiados += 1
        if base in DE_AFFINITY:
            avisos.append(base)

    print('%d dibujo(s) actualizado(s).' % cambiados)
    for a in avisos:
        print('   OJO: %s lo rehace importar-dibujos.py desde Affinity y se '
              'perderá en la siguiente pasada de aquel guión.' % a)
    if cambiados:
        print('Ahora: python scripts/construir.py  (es quien comprueba las reglas)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
