"""Arma los archivos que consume la app a partir de los datos del proyecto.

    datos/crudo/    extracción del PDF, congelada. No se edita nunca.
    datos/propio/   tus correcciones (color de la flor, y lo que venga después).
        |
        v
    app/js/datos.js     las 134 especies y los catálogos
    app/js/mapa.js      el mapa de las 22 lomas en SVG
    app/js/iconos.js    los iconos Phosphor incrustados

Se generan como archivos .js que declaran una variable global, no como .json:
así funcionan al abrir index.html directamente desde el teléfono, donde fetch()
está bloqueado por seguridad del navegador.

Uso:  python scripts/construir.py
"""
import os, sys, io, csv, json, re, datetime, collections, hashlib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRUDO = os.path.join(RAIZ, 'datos', 'crudo')
PROPIO = os.path.join(RAIZ, 'datos', 'propio')
APPJS = os.path.join(RAIZ, 'app', 'js')

MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
         'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']

# Con punto y en minuscula: una abreviatura «siempre se cierra con un punto» y
# lleva la caja de la palabra abreviada, que aqui es un nombre comun (DPD,
# «abreviatura» 1 y 2c). «set.» y no «sept.»: el DPD da setiembre como la forma
# preferida en el Peru. Las del calendario se quedan sin punto: son rotulos de
# una tira de doce celdas de 26 px, no texto seguido.
MESES_ABR = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.',
             'jul.', 'ago.', 'set.', 'oct.', 'nov.', 'dic.']

# muestras para los filtros por color
COLORES = [
    ('Blanco',           '#f8f7f4'),
    ('Amarillo',         '#f2c14e'),
    ('Anaranjado',       '#e8853a'),
    ('Rojo',             '#c8443c'),
    ('Rosado',           '#e08aa8'),
    ('Morado/lila',      '#8f7bb8'),
    ('Azul',             '#5b8ac4'),
    ('Verde',            '#7aa661'),
    ('Sin flor vistosa', '#b9b3a8'),
]

META = {
    'titulo': 'Guía de Flora de las Lomas de Lima',
    'autores': 'Miguel Lleellish, Jael Odar y Huber Trinidad',
    'editor': 'SERFOR — Servicio Nacional Forestal y de Fauna Silvestre',
    'anio': 2015,
    'isbn': '978-612-46908-0-8',
    'cita': ('Lleellish M., J. Odar & H. Trinidad. 2015. Guía de Flora de las '
             'Lomas de Lima. Servicio Nacional Forestal y de Fauna Silvestre. '
             'Lima, Perú. 162 pp.'),
    'fotografias': 'M. Lleellish, J. Odar, H. Castillo, G. Pino y D. Mac Donald',
}


def rango_meses(ini, fin):
    """«ago.-oct.», con guion y sin espacios, igual que los intervalos de cifras.

    Se arma con los numeros de mes y no con el texto del PDF, que trae
    «Ago - Oct», «Jul -Oct» y «---» segun la pagina. Los numeros aguantan
    tambien el caso que cruza el ano: «Dic - Mar» es 12 y 3, no un minimo y un
    maximo.
    """
    if not ini:
        return ''
    a = MESES_ABR[ini - 1]
    return a if (not fin or fin == ini) else a + '-' + MESES_ABR[fin - 1]


def intervalo(a, b, unidad):
    """«25-50 cm», como pide la RAE para los intervalos.

    Diccionario panhispanico de dudas, guion2 3.1b: «Indica intervalos
    expresados tanto en numeros arabigos como en romanos: las paginas 23-45».
    Guion, sin espacios, y no raya ni semirraya.

    Se arma con las cifras y no con el texto del PDF, que venia de cinco
    maneras distintas: «20 - 30 cm», «10- 40 cm», «2 5 - 5 0 cm» (cifras en
    objetos de texto sueltos), «20 - 30 cm.» y «60 a 80 cm». Las 134 especies
    tienen las dos cifras, asi que no se pierde nada.
    """
    if a is None:
        return ''
    if b is None or b == a:
        return '%d %s' % (a, unidad)
    return '%d-%d %s' % (a, b, unidad)


def leer(ruta):
    if not os.path.exists(ruta):
        return []
    with open(ruta, encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))


def ent(v, d=None):
    v = (v or '').strip()
    return int(v) if v.isdigit() else d


def lista(v, sep=','):
    return [x.strip() for x in (v or '').split(sep) if x.strip()]


def main():
    esp = leer(os.path.join(CRUDO, 'especie.csv'))
    if not esp:
        sys.exit('falta datos/crudo/especie.csv')
    img = leer(os.path.join(CRUDO, 'especie_imagen.csv'))
    lomas = leer(os.path.join(CRUDO, 'loma.csv'))
    colauto = {r['especie_id']: r for r in leer(os.path.join(CRUDO, 'especie_color.csv'))}
    colrev = {r['especie_id']: r for r in leer(os.path.join(PROPIO, 'color_flor.csv'))}
    rojos = json.load(open(os.path.join(CRUDO, 'perfil_rojo.json'), encoding='utf-8'))
    # los sinonimos no estan en la guia: son aporte propio
    sinon = {r['especie_id']: lista(r.get('sinonimos', ''), ';')
             for r in leer(os.path.join(PROPIO, 'sinonimos.csv'))}
    # lomas vistas por nosotros que la guia no cita: van aparte para no
    # mezclarlas con lo que dice el libro
    propias = {r['especie_id']: lista(r.get('lomas_anadidas', ''), ';')
               for r in leer(os.path.join(PROPIO, 'loma_propia.csv'))}
    # erratas de la extraccion que no se pueden arreglar con una regla general
    correcciones = leer(os.path.join(PROPIO, 'correcciones_texto.csv'))

    # fotos por especie, principales primero
    fotos = collections.defaultdict(list)
    for m in sorted(img, key=lambda m: (m['tipo'] != 'principal', int(m['orden']))):
        if m['tipo'] in ('principal', 'detalle'):
            fotos[m['especie_id']].append(os.path.basename(m['archivo']))

    porid = {r['especie_id']: r for r in esp}
    for c in correcciones:
        fila = porid.get(c['especie_id'])
        if fila is None or c['campo'] not in fila:
            print('   aviso: correccion sin destino:', c['especie_id'], c['campo'])
        elif c['buscar'] not in fila[c['campo']]:
            # o ya se arreglo aguas arriba, o el texto cambio: mejor saberlo
            print('   aviso: ya no aparece y se puede quitar:', repr(c['buscar']))
        else:
            fila[c['campo']] = fila[c['campo']].replace(c['buscar'], c['reemplazar'])

    idpor = {l['nombre']: l['loma_id'] for l in lomas}
    ids = {l['loma_id'] for l in lomas}
    especies, revisados = [], 0
    for r in esp:
        eid = r['especie_id']
        deguia = [idpor[x] for x in lista(r['lomas'], ';') if x in idpor]
        propia = []
        for x in propias.get(eid, []):
            if x not in ids:
                print('   aviso: loma desconocida en loma_propia.csv:', x)
            elif x not in deguia:
                propia.append(x)
        a = colauto.get(eid, {})
        v = colrev.get(eid, {})
        color = (v.get('color_flor') or '').strip() or a.get('color_flor_auto', '')
        todos = lista((v.get('color_flor_todos') or '').strip()
                      or a.get('color_flor_todos_auto', ''))
        if (v.get('revisado') or '').upper() == 'TRUE':
            revisados += 1
        especies.append({
            'id': eid,
            'n': ent(r['numero_guia']),
            'pag': ent(r['pagina_pdf']),
            'comun': r['nombre_comun'],
            'cientifico': r['nombre_cientifico'],
            'autoria': r['autor_cientifico'],
            'sinonimos': sinon.get(eid, []),
            'familia': r['familia'],
            'grupo': r['grupo'],
            'origen': r['origen'],
            'endemico': r['endemico'] == 'true',
            'amenaza': r['amenaza'],
            'altura': [ent(r['altura_min_cm']), ent(r['altura_max_cm'])],
            'alturaTxt': intervalo(ent(r['altura_min_cm']), ent(r['altura_max_cm']), 'cm'),
            'altitud': [ent(r['altitud_min_msnm']), ent(r['altitud_max_msnm'])],
            'altitudTxt': r['altitud_texto'],
            'flor': [MESES.index(m) + 1 for m in lista(r['floracion_meses'], ';')
                     if m in MESES],
            'florTxt': rango_meses(ent(r['floracion_inicio_mes']),
                                   ent(r['floracion_fin_mes'])),
            'habitats': lista(r['habitats']),
            'cara': r['cara'],
            'lomas': deguia + propia,
            'lomasPropias': propia,
            'color': color,
            'colores': todos,
            'desc': r['descripcion'],
            'hab': r['habitat'],
            'dist': r['distribucion'],
            'sit': r['situacion_actual'],
            'fotos': fotos.get(eid, []),
            # el trazo rojo tal como lo dibuja la guia: dice en que cara de la
            # loma esta la especie, no solo entre que cotas
            'perfil': rojos.get(eid, ''),
        })

    def cuenta(clave):
        c = collections.Counter()
        for e in especies:
            v = e[clave]
            (c.update(v) if isinstance(v, list) else c.update([v])) if v else None
        return c

    cfam, cgru, chab = cuenta('familia'), cuenta('grupo'), cuenta('habitats')
    # se cuenta por 'colores' porque el filtro acepta cualquiera de ellos
    ccol, clom = cuenta('colores'), cuenta('lomas')

    dimg = os.path.join(RAIZ, 'app', 'img')
    pesomb = sum(os.path.getsize(os.path.join(dimg, f))
                 for f in os.listdir(dimg)) / 1024 / 1024

    datos = {
        'meta': META | {'especies': len(especies),
                        'generado': datetime.date.today().isoformat(),
                        'colorRevisado': revisados,
                        'nFotos': len(os.listdir(dimg)),
                        'pesoFotos': round(pesomb, 1)},
        'meses': MESES,
        'especies': especies,
        'lomas': [{'id': l['loma_id'], 'n': ent(l['legend_n']), 'nombre': l['nombre'],
                   'sectores': l['sectores'], 'lat': float(l['lat_wgs84']),
                   'lon': float(l['lon_wgs84']), 'nEsp': clom.get(l['loma_id'], 0)}
                  for l in sorted(lomas, key=lambda x: ent(x['legend_n']) or 0)],
        'habitats': [{'nombre': k, 'n': v} for k, v in sorted(chab.items())],
        'familias': [{'nombre': k, 'n': v} for k, v in sorted(cfam.items())],
        'grupos': [{'nombre': k, 'n': v} for k, v in sorted(cgru.items(),
                                                            key=lambda x: -x[1])],
        'colores': [{'nombre': k, 'hex': h, 'n': ccol.get(k, 0)}
                    for k, h in COLORES if ccol.get(k, 0)],
        'origenes': [{'codigo': 'Nat', 'nombre': 'Nativa',
                      'def': 'Originaria del Perú.'},
                     {'codigo': 'Exo', 'nombre': 'Exótica',
                      'def': 'Proviene de otros continentes o países.'},
                     {'codigo': 'Int', 'nombre': 'Introducida',
                      'def': 'Nativa del Perú, pero de ecosistemas no asociados a las lomas.'}],
        'amenazas': [{'codigo': 'NT', 'nombre': 'Casi amenazado'},
                     {'codigo': 'VU', 'nombre': 'Vulnerable'},
                     {'codigo': 'EN', 'nombre': 'En peligro'},
                     {'codigo': 'CR', 'nombre': 'En peligro crítico'}],
        'perfil': json.load(open(os.path.join(CRUDO, 'perfil.json'), encoding='utf-8')),
    }

    os.makedirs(APPJS, exist_ok=True)
    p = os.path.join(APPJS, 'datos.js')
    with open(p, 'w', encoding='utf-8') as fh:
        fh.write('window.GUIA=')
        json.dump(datos, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write(';\n')
    print('-> app/js/datos.js  %.0f KB  (%d especies)'
          % (os.path.getsize(p) / 1024, len(especies)))

    # mapa
    svg = open(os.path.join(CRUDO, 'mapa.svg'), encoding='utf-8').read()
    pm = os.path.join(APPJS, 'mapa.js')
    with open(pm, 'w', encoding='utf-8') as fh:
        fh.write('window.MAPA_SVG=')
        json.dump(svg, fh, ensure_ascii=False)
        fh.write(';\n')
    print('-> app/js/mapa.js   %.0f KB' % (os.path.getsize(pm) / 1024))

    # iconos
    fi = os.path.join(RAIZ, 'datos', 'iconos-phosphor.json')
    if os.path.exists(fi):
        ph = json.load(open(fi, encoding='utf-8'))
        cuerpo = {k: v['body'] for k, v in ph.get('icons', {}).items()}
        # los propios van despues: dibujados aqui, no descargados
        fp = os.path.join(RAIZ, 'datos', 'iconos-propios.json')
        if os.path.exists(fp):
            mios = json.load(open(fp, encoding='utf-8'))
            cuerpo.update({k: v['body'] for k, v in mios.get('icons', {}).items()})
        pi = os.path.join(APPJS, 'iconos.js')
        with open(pi, 'w', encoding='utf-8') as fh:
            fh.write('window.ICONOS=')
            json.dump(cuerpo, fh, ensure_ascii=False, separators=(',', ':'))
            fh.write(';\n')
        print('-> app/js/iconos.js %.0f KB  (%d iconos)'
              % (os.path.getsize(pi) / 1024, len(cuerpo)))

    # versión de un solo archivo, por si el navegador del teléfono no deja
    # cargar los .js vecinos al abrir desde file://
    idx = os.path.join(RAIZ, 'app', 'index.html')
    if os.path.exists(idx):
        html = open(idx, encoding='utf-8').read()
        for js in ('js/datos.js', 'js/mapa.js', 'js/iconos.js', 'js/app.js'):
            cuerpo = open(os.path.join(RAIZ, 'app', js), encoding='utf-8').read()
            html = html.replace('<script src="%s"></script>' % js,
                                '<script>%s</script>' % cuerpo)
        css = open(os.path.join(RAIZ, 'app', 'css', 'estilos.css'), encoding='utf-8').read()
        html = html.replace('<link rel="stylesheet" href="css/estilos.css">',
                            '<style>%s</style>' % css)
        pu = os.path.join(RAIZ, 'app', 'todo-en-uno.html')
        open(pu, 'w', encoding='utf-8').write(html)
        print('-> app/todo-en-uno.html %.0f KB  (respaldo: no carga archivos vecinos)'
              % (os.path.getsize(pu) / 1024))

    escribir_sw()

    nimg = len(os.listdir(os.path.join(RAIZ, 'app', 'img')))
    nprop = sum(len(e['lomasPropias']) for e in especies)
    if nprop:
        print('\nlomas añadidas por observación propia: %d' % nprop)
    print('\nrevisión de color: %d/%d especies marcadas como revisadas'
          % (revisados, len(especies)))
    print('imágenes en app/img: %d' % nimg)


NUCLEO = ['./', 'index.html', 'manifest.webmanifest',
          'css/estilos.css',
          'js/datos.js', 'js/mapa.js', 'js/iconos.js', 'js/app.js',
          'icono/icono-192.png', 'icono/icono-512.png',
          'icono/icono-512-maskable.png', 'icono/apple-touch-icon.png']


def firma(rutas):
    h = hashlib.sha256()
    for r in rutas:
        h.update(open(r, 'rb').read())
    return h.hexdigest()[:12]


def escribir_sw():
    """El service worker, con la lista de todo lo que hay que guardar.

    Las fotos van en un almacén aparte del resto: así, cuando cambian los
    datos, el teléfono vuelve a bajar unos cientos de KB y no los 12 MB.
    """
    app = os.path.join(RAIZ, 'app')
    fotos = sorted(os.listdir(os.path.join(app, 'img')))
    nucleo = [x for x in NUCLEO if x != './']

    vn = firma([os.path.join(app, x) for x in nucleo])
    # las fotos no se leen enteras: con los nombres y los tamaños basta para
    # saber si cambió algo, y son 12 MB que no hay que recorrer en cada build
    hf = hashlib.sha256()
    # subir este numero tira las fotos guardadas con las reglas anteriores
    hf.update(b'contrato-2')
    for f in fotos:
        hf.update(f.encode())
        hf.update(str(os.path.getsize(os.path.join(app, 'img', f))).encode())
    vf = hf.hexdigest()[:12]

    plant = open(os.path.join(RAIZ, 'scripts', 'sw.plantilla.js'),
                 encoding='utf-8').read()
    js = (plant.replace('__NUCLEO__', 'flora-nucleo-' + vn)
               .replace('__FOTOS__', 'flora-fotos-' + vf)
               .replace('__LISTA_NUCLEO__', json.dumps(NUCLEO, indent=2))
               .replace('__LISTA_FOTOS__',
                        json.dumps(['img/' + f for f in fotos], indent=2)))
    p = os.path.join(app, 'sw.js')
    open(p, 'w', encoding='utf-8', newline='\n').write(js)
    print('-> app/sw.js        %.0f KB  (%d archivos: %d fotos + %d del nucleo)'
          % (os.path.getsize(p) / 1024, len(fotos) + len(NUCLEO),
             len(fotos), len(NUCLEO)))


if __name__ == '__main__':
    main()
