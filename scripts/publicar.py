# -*- coding: utf-8 -*-
"""Deja flora-lomas-app/ y su zip igual que app/.

Se hacia a mano, copiando una lista de archivos escrita de memoria. Un dia se
quedo fuera js/datos.js y el paquete salio con el sello «generado» del dia
anterior; coincidian por casualidad porque se construian el mismo dia. Esto
copia el arbol entero, borra lo que sobre y solo escribe lo que ha cambiado,
que con 295 fotos importa.

    python scripts/publicar.py
"""
import filecmp, os, shutil, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(RAIZ, 'app')
PUB = os.path.join(RAIZ, 'flora-lomas-app')
ZIP = os.path.join(RAIZ, 'flora-lomas-app')          # make_archive le pone .zip


def rutas(base):
    for dir_, _, nombres in os.walk(base):
        for n in nombres:
            yield os.path.relpath(os.path.join(dir_, n), base).replace('\\', '/')


def main():
    if not os.path.isdir(APP):
        sys.exit('falta app/: ejecuta antes construir.py')

    quedan = set(rutas(PUB)) if os.path.isdir(PUB) else set()
    nuevos = copiados = 0

    for rel in rutas(APP):
        quedan.discard(rel)
        a, b = os.path.join(APP, rel), os.path.join(PUB, rel)
        if os.path.exists(b) and filecmp.cmp(a, b, shallow=False):
            continue                                  # igual: no se toca
        os.makedirs(os.path.dirname(b), exist_ok=True)
        nuevos += not os.path.exists(b)
        shutil.copy2(a, b)
        copiados += 1

    for rel in quedan:                                # lo que ya no esta en app/
        os.remove(os.path.join(PUB, rel))

    for dir_, _, _ in sorted(os.walk(PUB), reverse=True):
        if dir_ != PUB and not os.listdir(dir_):
            os.rmdir(dir_)

    if os.path.exists(ZIP + '.zip'):
        os.remove(ZIP + '.zip')
    shutil.make_archive(ZIP, 'zip', PUB)

    total = sum(1 for _ in rutas(PUB))
    print('-> flora-lomas-app  %d archivos (%d copiados, %d nuevos, %d borrados)'
          % (total, copiados, nuevos, len(quedan)))
    print('-> flora-lomas-app.zip  %.2f MB' % (os.path.getsize(ZIP + '.zip') / 1048576))

    sobra = [r for r in rutas(APP)
             if not filecmp.cmp(os.path.join(APP, r), os.path.join(PUB, r), shallow=False)]
    if sobra:
        sys.exit('   NO coinciden: ' + ', '.join(sobra[:5]))
    print('   espejo exacto de app/')


if __name__ == '__main__':
    main()
