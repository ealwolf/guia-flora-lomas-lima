"""Extract the species photographs from the SERFOR 2015 guide.

Orientation is the hard part. The rasters are NOT stored the way they appear on
the page: 293 of 295 need a transform, most commonly a vertical flip. Two
independent methods are combined:

  1. pixel matching - score all 8 orientations of the raster against a render of
     how the image actually appears on the page, and keep the best.
  2. placement matrix - the sign pattern of (a,b,c,d) determines the transform
     exactly.

Method 1 is unreliable for near-symmetric images (small square insets of dense
foliage), so the signature->orientation map is *learned* from the high-margin
results of method 1 and then applied to every image, including the ones that
cannot be checked at all because they are painted over.

Classification:
  principal - every image at least 50% of the largest image's area on the page
              (3 species are laid out with two photos side by side)
  detalle   - the rest, ordered top-to-bottom then left-to-right
  visible   - false when a later-drawn image completely covers this one; four
              leftover images in the PDF are invisible in the published page

Usage:
    python scripts/03_extract_images.py [--mapas] [--sheet]
"""
import fitz, os, sys, io, csv, json, hashlib, argparse, collections
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
# --- rutas de este repositorio -------------------------------------------
# Copiado de «App - Monitoreo», el proyecto donde se hizo la extraccion. Lo
# unico que cambia respecto al original son estas rutas; la logica es la
# misma que produjo el dato que hay en datos/crudo/.
#
# SALIDA se puede apuntar a otra carpeta para comprobar que la extraccion
# reproduce lo congelado sin sobrescribirlo:
#     SALIDA_CRUDO=/tmp/prueba python scripts/extraer-imagenes.py
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRUDO = os.path.join(ROOT, 'datos', 'crudo')
PDF = os.path.join(CRUDO, 'libro', 'guia_flora_lomas_lima_2015.pdf')
SALIDA = os.environ.get('SALIDA_CRUDO') or CRUDO
TABLAS = os.path.join(SALIDA, 'tablas')
IMG = os.path.join(SALIDA, 'img')
os.makedirs(TABLAS, exist_ok=True)
OUT_IMG = IMG
OUT_MAP = os.path.join(SALIDA, 'mapas')
MAP_CLIP = fitz.Rect(221, 414, 312, 542)
MAIN_RATIO = 0.5
GOOD_MARGIN = 5.0

OPS = {'none': None, 'flip_v': Image.FLIP_TOP_BOTTOM,
       'flip_h': Image.FLIP_LEFT_RIGHT, 'rot90': Image.ROTATE_90,
       'rot180': Image.ROTATE_180, 'rot270': Image.ROTATE_270,
       'transpose': Image.TRANSPOSE, 'transverse': Image.TRANSVERSE}


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def sg(v, t=1e-6):
    return 0 if abs(v) < t else (1 if v > 0 else -1)


def signature(tr):
    return (sg(tr[0]), sg(tr[1]), sg(tr[2]), sg(tr[3]))


def area(b):
    return (b[2] - b[0]) * (b[3] - b[1])


def classify(page):
    """-> list of (tipo, orden, info, visible)"""
    infos = page.get_image_info(xrefs=True)      # content-stream = draw order
    amax = max(area(i['bbox']) for i in infos)
    vis = []
    for k, im in enumerate(infos):
        b = fitz.Rect(im['bbox'])
        covered = any(
            fitz.Rect(l['bbox']).x0 <= b.x0 + 0.6 and
            fitz.Rect(l['bbox']).y0 <= b.y0 + 0.6 and
            fitz.Rect(l['bbox']).x1 >= b.x1 - 0.6 and
            fitz.Rect(l['bbox']).y1 >= b.y1 - 0.6 for l in infos[k + 1:])
        vis.append(not covered)
    main = [(im, v) for im, v in zip(infos, vis) if area(im['bbox']) >= MAIN_RATIO * amax]
    det = [(im, v) for im, v in zip(infos, vis) if area(im['bbox']) < MAIN_RATIO * amax]
    main.sort(key=lambda t: (round(t[0]['bbox'][1], 1), round(t[0]['bbox'][0], 1)))
    det.sort(key=lambda t: (round(t[0]['bbox'][1], 1), round(t[0]['bbox'][0], 1)))
    out = [('principal', k, im, v) for k, (im, v) in enumerate(main, 1)]
    out += [('detalle', k, im, v) for k, (im, v) in enumerate(det, 1)]
    return out


def score_orientations(raw, page, bbox):
    zoom = max(0.6, min(2.0, 96.0 / max(bbox.width, bbox.height)))
    pm = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=bbox)
    ref = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    if ref.width < 8 or ref.height < 8:
        return None
    a_ref = np.asarray(ref.resize((48, 48), Image.BILINEAR), float)
    src = Image.open(io.BytesIO(raw)).convert('RGB')
    scored = []
    for name, op in OPS.items():
        c = src if op is None else src.transpose(op)
        if (c.width >= c.height) != (ref.width >= ref.height):
            continue
        a = np.asarray(c.resize((48, 48), Image.BILINEAR), float)
        scored.append((float(np.abs(a - a_ref).mean()), name))
    if not scored:
        return None
    scored.sort()
    margin = (scored[1][0] - scored[0][0]) if len(scored) > 1 else 99.0
    return scored[0][1], margin


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mapas', action='store_true')
    ap.add_argument('--sheet', action='store_true')
    args = ap.parse_args()

    doc = fitz.open(PDF)
    rows = list(csv.DictReader(
        open(os.path.join(TABLAS, 'especie.csv'), encoding='utf-8-sig')))
    os.makedirs(OUT_IMG, exist_ok=True)
    if args.mapas:
        os.makedirs(OUT_MAP, exist_ok=True)

    # ---- pass 1: observe -------------------------------------------------
    obs = []
    for r in rows:
        pn = int(r['pagina_pdf'])
        page = doc[pn - 1]
        for tipo, orden, im, visible in classify(page):
            raw = doc.extract_image(im['xref'])['image']
            res = score_orientations(raw, page, fitz.Rect(im['bbox'])) if visible else None
            obs.append({'r': r, 'pn': pn, 'tipo': tipo, 'orden': orden,
                        'im': im, 'visible': visible, 'raw': raw,
                        'pix': res[0] if res else None,
                        'margin': res[1] if res else 0.0,
                        'sig': signature(im['transform'])})

    # ---- pass 2: learn signature -> orientation from confident cases ------
    votes = collections.defaultdict(collections.Counter)
    for o in obs:
        if o['pix'] and o['margin'] >= GOOD_MARGIN:
            votes[o['sig']][o['pix']] += 1
    rule = {k: v.most_common(1)[0][0] for k, v in votes.items()}
    print('regla aprendida  firma(a,b,c,d) -> orientación')
    for k in sorted(rule):
        tot = sum(votes[k].values())
        print(f'  {str(k):16s} -> {rule[k]:10s} '
              f'({votes[k][rule[k]]}/{tot} casos de alta confianza)')

    # ---- pass 3: apply ----------------------------------------------------
    man, disagree, unknown, reused = [], [], [], 0
    for o in obs:
        tag = rule.get(o['sig'])
        if tag is None:
            tag = o['pix'] or 'none'
            unknown.append((o['pn'], o['im']['xref'], o['sig'], tag))
        if o['pix'] and o['pix'] != tag:
            disagree.append((o['pn'], o['r']['especie_id'], o['tipo'], o['orden'],
                             o['pix'], tag, round(o['margin'], 2)))
        op = OPS[tag]
        r, im = o['r'], o['im']
        # nomenclatura uniforme: siempre tipo + índice, sin casos especiales
        suffix = f"{o['tipo']}{o['orden']}"
        name = f"{int(r['numero_guia']):03d}_{r['especie_id']}_{suffix}.jpg"
        path = os.path.join(OUT_IMG, name)
        if op is None:
            blob = o['raw']
            w, h = Image.open(io.BytesIO(blob)).size
        else:
            img = Image.open(io.BytesIO(o['raw'])).convert('RGB').transpose(op)
            buf = io.BytesIO()
            img.save(buf, 'JPEG', quality=92, subsampling=0, optimize=True)
            blob = buf.getvalue(); w, h = img.size
        if os.path.exists(path) and sha1(open(path, 'rb').read()) == sha1(blob):
            reused += 1
        else:
            open(path, 'wb').write(blob)
        pw = fitz.Rect(im['bbox']).width or 1
        man.append({
            'especie_id': r['especie_id'], 'numero_guia': r['numero_guia'],
            'pagina_pdf': o['pn'], 'tipo': o['tipo'], 'orden': o['orden'],
            'archivo': f'assets/pdf/{name}',
            'ancho_px': w, 'alto_px': h, 'dpi': round(w / (pw / 72)),
            'orientacion': tag,
            'verificada': 'true' if (o['pix'] and o['margin'] >= GOOD_MARGIN) else 'false',
            'margen': round(o['margin'], 2),
            'visible_en_pagina': 'true' if o['visible'] else 'false',
            'bytes': len(blob), 'sha1': sha1(blob),
            'fuente': f"SERFOR 2015, p.{o['pn']}",
        })

        if args.mapas and o['tipo'] == 'principal' and o['orden'] == 1:
            mn = f"{int(r['numero_guia']):03d}_{r['especie_id']}_mapa.png"
            doc[o['pn'] - 1].get_pixmap(matrix=fitz.Matrix(4, 4),
                                        clip=MAP_CLIP).save(os.path.join(OUT_MAP, mn))

    with open(os.path.join(TABLAS, 'especie_imagen.csv'), 'w',
              newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=list(man[0].keys()))
        w.writeheader(); w.writerows(man)

    tot = sum(m['bytes'] for m in man)
    print(f'\nimágenes: {len(man)}  ({tot/1e6:.1f} MB)  sin cambios: {reused}')
    print(f'principales: {sum(1 for m in man if m["tipo"]=="principal")}  '
          f'detalles: {sum(1 for m in man if m["tipo"]=="detalle")}')
    print('orientaciones:', dict(collections.Counter(m['orientacion'] for m in man)))
    print(f'verificadas contra la página: {sum(1 for m in man if m["verificada"]=="true")}')
    print(f'no visibles en la página: {sum(1 for m in man if m["visible_en_pagina"]=="false")}')
    if unknown:
        print(f'firmas desconocidas: {unknown}')
    print(f'\ndiscrepancias píxeles vs matriz: {len(disagree)}')
    for x in disagree:
        print(f'  p.{x[0]:3d} {x[1]:34s} {x[2]}{x[3]}  píxeles={x[4]:9s} '
              f'matriz={x[5]:9s} margen={x[6]}')

    # ---- foto_principal / n_detalles --------------------------------------
    by = collections.defaultdict(lambda: {'p': '', 'n': 0})
    for m in man:
        if m['tipo'] == 'principal' and int(m['orden']) == 1:
            by[m['especie_id']]['p'] = m['archivo']
        elif m['tipo'] == 'detalle':
            by[m['especie_id']]['n'] += 1
    for r in rows:
        r['foto_pdf'] = by[r['especie_id']]['p']
        r['n_detalles'] = by[r['especie_id']]['n']
    with open(os.path.join(TABLAS, 'especie.csv'), 'w', newline='',
              encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    json.dump(rows, open(os.path.join(TABLAS, 'especie.json'), 'w',
                         encoding='utf-8'), ensure_ascii=False, indent=1)
    print('especie.csv actualizado (foto_pdf, n_detalles)')

    if args.sheet:
        build_sheet(rows)


def build_sheet(rows):
    from PIL import ImageDraw
    COLS, TH = 10, 150
    items = [r for r in rows if r.get('foto_principal')]
    rn = (len(items) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * TH, rn * (TH + 14)), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for i, r in enumerate(items):
        im = Image.open(os.path.join(ROOT, r['foto_principal'])).convert('RGB')
        im.thumbnail((TH - 4, TH - 4))
        x, y = (i % COLS) * TH, (i // COLS) * (TH + 14)
        sheet.paste(im, (x + 2, y + 2))
        d.text((x + 2, y + TH - 1), f"{r['numero_guia']} {r['especie_id'][:20]}",
               fill=(0, 0, 0))
    p = os.path.join(ROOT, 'docs/especies_contactsheet.png')
    sheet.save(p)
    print('contact sheet ->', p)


if __name__ == '__main__':
    main()
