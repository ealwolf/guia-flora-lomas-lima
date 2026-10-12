"""Extract all 134 species from the SERFOR 2015 guide into structured CSV/JSON.

Sources per field
  header / body / panel text -> character-level text reconstruction
  endemismo                  -> green filled circle  (0.000, 0.651, 0.314)
  categoria de amenaza       -> yellow filled box    (1.000, 0.949, 0.000)
  rango de altitud           -> red stroked polyline, interpolated against the
                                200 / 1000 tick labels on the same page
  lomas                      -> red filled polygons on the mini-map, matched to
                                the 22 clusters identified in data/build/
Usage:  python scripts/01_extract_species.py
"""
import fitz, os, re, csv, json, sys, io, unicodedata, collections

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
# --- rutas de este repositorio -------------------------------------------
# Copiado de «App - Monitoreo», el proyecto donde se hizo la extraccion. Lo
# unico que cambia respecto al original son estas rutas; la logica es la
# misma que produjo el dato que hay en datos/crudo/.
#
# SALIDA se puede apuntar a otra carpeta para comprobar que la extraccion
# reproduce lo congelado sin sobrescribirlo:
#     SALIDA_CRUDO=/tmp/prueba python scripts/extraer-especies.py
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRUDO = os.path.join(ROOT, 'datos', 'crudo')
PDF = os.path.join(CRUDO, 'libro', 'guia_flora_lomas_lima_2015.pdf')
SALIDA = os.environ.get('SALIDA_CRUDO') or CRUDO
TABLAS = os.path.join(SALIDA, 'tablas')
IMG = os.path.join(SALIDA, 'img')
os.makedirs(TABLAS, exist_ok=True)
FIRST, LAST = 17, 152
SKIP = {19, 39}                       # class divider pages (Liliopsida / Magnoliopsida)

YEL = (1.0, 0.949, 0.0)
GRN = (0.0, 0.651, 0.314)
RED = (0.929, 0.11, 0.141)

MES = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7,
       'ago': 8, 'set': 9, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12}
MESN = {v: k.capitalize() for k, v in
        {'Ene': 1, 'Feb': 2, 'Mar': 3, 'Abr': 4, 'May': 5, 'Jun': 6, 'Jul': 7,
         'Ago': 8, 'Set': 9, 'Oct': 10, 'Nov': 11, 'Dic': 12}.items()}
GRUPO_FIX = {'Cactaceae': 'Cactáceas', 'Parasita': 'Parásitas',
             'Ephedrales': 'Ephedrales'}
FAMILIA_FIX = {'Poaceace': 'Poaceae'}          # errata de la guía (especie #20)

# Los 8 hábitats definidos en la p.12. "canto rodado" es un sustrato, no un
# hábitat, y "roquedal" aparece dentro de la definición de cresta rocosa.
HABITATS = [
    ('Fondo de quebrada', ['fondo de quebrada']),
    ('Ladera rocosa', ['ladera rocosa', 'ladera pedregosa']),
    ('Ladera arenosa', ['ladera arenosa']),
    ('Loma herbácea', ['loma herbacea']),
    ('Loma arbustiva', ['loma arbustiva', 'ladera arbustiva']),
    ('Loma arbórea', ['loma arborea']),
    ('Cresta rocosa', ['cresta rocosa', 'roquedal']),
    ('Zona de cactáceas', ['zona de cactaceas']),
]
RX_ALTITUD = re.compile(
    r'(?:(?:entre|desde|hasta|sobre|sobrepasar|de|a)\s+(?:los\s+)?)?'
    r'\d{2,4}(?:\s*(?:a|y|-|hasta)\s*(?:los\s+)?\d{2,4})?\s*msnm', re.I)
ORIGEN_FIX = {'Nat': 'Nat', 'Int': 'Int', 'Exo': 'Exo'}


def near(c, ref, t=0.03):
    return c is not None and all(abs(a - b) < t for a, b in zip(c, ref))


def slug(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def tidy(s):
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\s+([,;.:%])', r'\1', s)
    s = re.sub(r'([,;])(?=[^\s\d])', r'\1 ', s)
    s = re.sub(r'\(\s+', '(', s)
    s = re.sub(r'\s+\)', ')', s)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()


# --------------------------------------------------------------------------
def flow_chars(page, y0, y1, keep):
    """Rebuild reading order from character positions (span order is unreliable
    in this PDF: italics and accented glyphs are emitted as separate runs).
    `keep(font, size)` selects which spans participate."""
    chars = []
    for b in page.get_text('rawdict')['blocks']:
        if b['type'] != 0:
            continue
        for ln in b['lines']:
            for sp in ln['spans']:
                sz = round(sp['size'], 1)
                if not keep(sp['font'], sz):
                    continue
                sid = id(sp)
                for ch in sp['chars']:
                    bx0, by0, bx1, by1 = ch['bbox']
                    if by0 < y0 or by0 > y1:
                        continue
                    chars.append((round(ch['origin'][1], 1), bx0, bx1,
                                  ch['c'], sz, sid))
    if not chars:
        return ''
    chars.sort(key=lambda c: (c[0], c[1]))
    lines, cur = [], [chars[0]]
    for c in chars[1:]:
        if abs(c[0] - cur[-1][0]) <= 1.2:
            cur.append(c)
        else:
            lines.append(cur)
            cur = [c]
    lines.append(cur)
    out = []
    for ln in lines:
        ln.sort(key=lambda c: c[1])
        s, prev_x, prev_sid = '', None, None
        for _y, bx0, bx1, ch, sz, sid in ln:
            if (prev_x is not None and sid != prev_sid
                    and bx0 - prev_x > 0.15 * sz
                    and s and s[-1] != ' ' and ch != ' '):
                s += ' '
            s += ch
            prev_x, prev_sid = bx1, sid
        out.append(s.strip())
    return '\n'.join(out)


def flow_text(page, y0, y1, smin=6.8, smax=8.2):
    return flow_chars(page, y0, y1, lambda f, s: smin <= s <= smax)


SCI_FONTS = ('ArialNarrow-Italic-Bold', 'ArialMT-BoldItalic')


def glyph_text(page, y0, y1, keep, gap=0.12):
    """Reconstruct a heading from glyph positions alone.

    The guide sets some headings with a letter missing from the main run and
    painted separately on top of a reserved blank (e.g. 'Poa a nua' + 'n').
    Literal spaces are therefore unreliable: drop them and infer word breaks
    from the x-gap between consecutive glyphs.
    """
    g = []
    for b in page.get_text('rawdict')['blocks']:
        if b['type'] != 0:
            continue
        for ln in b['lines']:
            for sp in ln['spans']:
                sz = round(sp['size'], 1)
                if not keep(sp['font'], sz):
                    continue
                for ch in sp['chars']:
                    bx0, by0, bx1, by1 = ch['bbox']
                    if by0 < y0 or by0 > y1 or ch['c'].isspace():
                        continue
                    g.append((round(ch['origin'][1], 1), bx0, bx1, ch['c'], sz))
    if not g:
        return ''
    rowsy = collections.Counter(c[0] for c in g)
    base = rowsy.most_common(1)[0][0]
    g = [c for c in g if abs(c[0] - base) <= 1.5]
    g.sort(key=lambda c: c[1])
    s, prev = '', None
    for _y, bx0, bx1, ch, sz in g:
        if prev is not None and bx0 - prev > gap * sz:
            s += ' '
        s += ch
        prev = bx1
    return s.strip()


def header_fields(page):
    out = {'nombre_comun': None, 'nombre_cientifico': None, 'autor': None,
           'familia': None, 'grupo': None, 'numero': None}
    sci, aut = [], []
    for b in page.get_text('dict')['blocks']:
        if b['type'] != 0:
            continue
        for ln in b['lines']:
            for sp in ln['spans']:
                f, sz = sp['font'], round(sp['size'], 1)
                t = sp['text'].strip()
                x0, y0, x1, y1 = sp['bbox']
                if not t:
                    continue
                if f == 'ARCENA' and sz > 15 and y0 < 46:
                    out['nombre_comun'] = ((out['nombre_comun'] or '') + ' ' + t).strip()
                elif (f.startswith('ArialNarrow-Italic-BoldI')
                      or f == 'ArialMT-BoldItalic') and sz >= 9.0 and 30 < y0 < 56:
                    sci.append((x0, t))
                elif f == 'ArialMT' and 7.5 <= sz <= 8.5 and 38 < y0 < 56:
                    aut.append((x0, t))
                elif f == 'ArialNarrow-Italic-Bold' and y0 < 40:
                    out['familia'] = t
                elif f == 'ARCENA' and 10 < sz < 14:
                    out['grupo'] = t
                elif (f == 'ArialMT-Bold' and sz == 8 and 50 < y0 < 70
                      and (x0 < 25 or x0 > 306)):
                    out['numero'] = t
    if sci:
        txt = glyph_text(page, 30, 56,
                         lambda f, s: f.startswith(SCI_FONTS) and s >= 9.0)
        txt = re.sub(r'\s*\.\s*', '. ', txt)
        txt = re.sub(r'\bsubsp\b\.?\s*', 'subsp. ', txt)
        out['nombre_cientifico'] = tidy(txt) or tidy(' '.join(t for _, t in sorted(sci)))
    if aut:
        aut.sort()
        out['autor'] = tidy(' '.join(t for _, t in aut))
    if out['nombre_comun']:
        txt = glyph_text(page, 12, 46, lambda f, s: f == "ARCENA" and s > 15, 0.12)
        if txt:
            out['nombre_comun'] = tidy(txt)
    return out


def panel_fields(page):
    """Altura / Floración / Origen read by pairing each label with the value
    printed ~10 pt below it."""
    labels, values, cats = {}, [], {}
    for b in page.get_text('dict')['blocks']:
        if b['type'] != 0:
            continue
        for ln in b['lines']:
            for sp in ln['spans']:
                t = sp['text'].strip()
                sz = round(sp['size'], 1)
                x0, y0, x1, y1 = sp['bbox']
                if y0 < 490:
                    continue
                key = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
                if sz <= 5.4 and key in ('altura', 'floracion', 'origen'):
                    labels[key] = sp['bbox']
                elif 5.5 <= sz <= 9.5:
                    values.append((x0, y0, x1, y1, t))
                # the highlighted category is set in a larger face than the rest
                if 3.0 <= sz <= 6.0 and t in ('NT', 'VU', 'EN', 'CR'):
                    cats[t] = sp['bbox']
    got = {}
    for key, lb in labels.items():
        parts = []
        for x0, y0, x1, y1, t in values:
            if y0 < lb[3] - 1 or y0 > lb[3] + 16:
                continue
            # match on the value's centre so a wide neighbouring field
            # (e.g. "Ago - Nov" next to "Nat") cannot bleed in
            if not (lb[0] - 12 <= (x0 + x1) / 2 <= lb[2] + 12):
                continue
            parts.append((x0, t))
        parts.sort()
        got[key] = tidy(' '.join(t for _, t in parts)) if parts else None
    return got, cats


def amenaza(page, cats):
    """The yellow box is painted behind the applicable category label, so the
    label whose centre falls inside the box is the answer."""
    for g in page.get_drawings():
        if not (near(g['fill'], YEL) and g['rect'].y0 > 520):
            continue
        r = g['rect']
        for k, bb in cats.items():
            cx = (bb[0] + bb[2]) / 2
            if r.x0 - 1 <= cx <= r.x1 + 1:
                return k
    return None


def endemico(page):
    return any(near(g['fill'], GRN) and 495 < g['rect'].y0 < 525
               for g in page.get_drawings())


def altitud(page):
    ticks = {}
    for b in page.get_text('dict')['blocks']:
        if b['type'] != 0:
            continue
        for ln in b['lines']:
            for sp in ln['spans']:
                t = sp['text'].strip()
                if (round(sp['size'], 1) <= 4.0 and t in ('200', '1000')
                        and sp['bbox'][1] > 490 and sp['bbox'][0] < 160):
                    ticks[t] = (sp['bbox'][1] + sp['bbox'][3]) / 2
    if '200' not in ticks or '1000' not in ticks:
        return None, None
    y200, y1000 = ticks['200'], ticks['1000']
    ys = []
    for g in page.get_drawings():
        r = g['rect']
        if near(g['color'], RED) and r.x1 < 216 and r.y0 > 490:
            ys += [r.y0, r.y1]
    if not ys:
        return None, None

    def conv(y):
        return 200 + (y200 - y) * 800.0 / (y200 - y1000)
    lo, hi = conv(max(ys)), conv(min(ys))
    # el eje mide 25,3 pt para 800 m (1 pt = 32 m): redondear a 25 m
    # fingiría una precisión que el dibujo no tiene
    r50 = lambda v: int(round(max(0, v) / 50.0) * 50)
    return r50(lo), r50(hi)


def lomas_from_map(page, clusters):
    hits = []
    for g in page.get_drawings():
        r = g['rect']
        if not near(g['fill'], RED):
            continue
        if r.x0 <= 216 or r.width > 40 or r.height > 40:
            continue
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        best, bd = None, 1e9
        for c in clusters:
            d = max(abs(c['x'] - cx), abs(c['y'] - cy))
            if d < bd:
                best, bd = c, d
        if best is not None and bd < 2.0:
            hits.append(best['nombre'])
    seen, out = set(), []
    for n in hits:
        if n not in seen:
            seen.add(n); out.append(n)
    return out


def sin_tildes(s):
    s = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()


def habitats_de(texto):
    h = sin_tildes(texto)
    return [nom for nom, claves in HABITATS if any(k in h for k in claves)]


def cara_de(texto):
    h = sin_tildes(texto)
    occ = re.search(r'\b(occidental(?:es)?|marinas?)\b', h) is not None
    ori = re.search(r'\b(oriental(?:es)?|andinas?)\b', h) is not None
    return 'Ambas' if occ and ori else 'Occidental' if occ else 'Oriental' if ori else ''


def altitud_citada(texto):
    hits = [re.sub(r'\s+', ' ', m.group()).strip() for m in RX_ALTITUD.finditer(texto)]
    return '; '.join(dict.fromkeys(hits))


def parse_altura(t):
    if not t:
        return None, None
    s = t.replace(',', '.')
    # digits are sometimes emitted as separate runs ("1 0 - 4 0 cm"); and a few
    # pages use "a" instead of a dash ("600 a 800 cm")
    s = re.sub(r'(?<=\d)\s+(?=\d)', '', s)
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:[-–]|\ba\b)\s*(\d+(?:\.\d+)?)\s*(cm|m)\b',
                  s, re.I)
    if m:
        a, b, u = float(m.group(1)), float(m.group(2)), m.group(3).lower()
    else:
        m = re.search(r'(\d+(?:\.\d+)?)\s*(cm|m)\b', s, re.I)
        if not m:
            return None, None
        a = b = float(m.group(1)); u = m.group(2).lower()
    k = 100.0 if u == 'm' else 1.0
    return int(round(a * k)), int(round(b * k))


def parse_floracion(t):
    if not t:
        return None, None, ''
    got = re.findall(r'([A-Za-zÁÉÍÓÚáéíóú]{3})', t)
    ms = [MES[g.lower()] for g in got if g.lower() in MES]
    if not ms:
        return None, None, ''
    a, b = ms[0], ms[-1]
    seq, m = [], a
    while True:
        seq.append(m)
        if m == b:
            break
        m = 1 if m == 12 else m + 1
        if len(seq) > 12:
            break
    return a, b, ';'.join(MESN[x] for x in seq)


LETRA = '[A-Za-zAEIOUNaeiounÁÉÍÓÚÑáéíóúñ]'
ACENT = 'ÁÉÍÓÚáéíóúñÑ'


def reparar_acentos(filas, campos):
    """Une palabras partidas por una vocal acentuada.

    El PDF dibuja algunos glifos acentuados en un run aparte, y eso mete un
    espacio falso ("Pachac amac", "Am erica"). Se une solo si el corte toca una
    vocal acentuada y la palabra resultante ya existe en el corpus, para no
    tocar separaciones legitimas como "el cual es".

    Se recorre token a token: un re.sub no sirve porque las coincidencias no se
    solapan y el primer par consume la palabra de la izquierda.
    """
    solo = re.compile(LETRA + '+$')
    corpus = ' '.join(f[c] for f in filas for c in campos)
    vocab = collections.Counter(re.findall(LETRA + '{3,}', corpus))
    n = 0

    def pasada(txt):
        nonlocal n
        toks = txt.split(' ')
        out, i = [], 0
        while i < len(toks):
            a = toks[i]
            b = toks[i + 1] if i + 1 < len(toks) else ''
            nucleo = b.rstrip('.,;:)') if b else ''
            cola = b[len(nucleo):] if b else ''
            if (a and nucleo and solo.match(a) and solo.match(nucleo)
                    and (a[-1] in ACENT or nucleo[0] in ACENT)
                    and vocab[a + nucleo] >= 3):
                out.append(a + nucleo + cola)
                n += 1
                i += 2
                continue
            out.append(a)
            i += 1
        return ' '.join(out)

    for f in filas:
        for c in campos:
            prev = None
            while prev != f[c]:
                prev = f[c]
                f[c] = pasada(f[c])
    return n


def split_body(txt):
    t = ' '.join(l.strip() for l in txt.split('\n'))
    # a few pages omit the colon after the heading (e.g. p.114 "Distribución De
    # origen Americano."), so fall back to a colon-less form anchored on a
    # following capital letter.
    keys = [('descripcion', r'Descripci[oó]n\s*:', r'Descripci[oó]n\s+(?=[A-ZÁÉÍÓÚ])'),
            ('habitat', r'H[aá]bitat\s*:', r'H[aá]bitat\s+(?=[A-ZÁÉÍÓÚ])'),
            ('distribucion', r'Distribuci[oó]n\s*:', r'Distribuci[oó]n\s+(?=[A-ZÁÉÍÓÚ])'),
            ('situacion', r'Situaci[oó]n\s+actual[^:]*:',
             r'Situaci[oó]n\s+actual[^.]{0,30}?\s+(?=[A-ZÁÉÍÓÚ])')]
    pos = []
    for name, pat, alt in keys:
        m = re.search(pat, t) or re.search(alt, t)
        if m:
            pos.append((m.start(), m.end(), name))
    pos.sort()
    out = {k[0]: '' for k in keys}
    for i, (s, e, name) in enumerate(pos):
        end = pos[i + 1][0] if i + 1 < len(pos) else len(t)
        out[name] = tidy(t[e:end])
    return out


# --------------------------------------------------------------------------
def main():
    doc = fitz.open(PDF)
    cl = json.load(open(os.path.join(CRUDO, 'tablas', '_lomas_clusters.json'),
                        encoding='utf-8'))
    ACC = {'Amancaes': 'Amancáes', 'Lucumo': 'Lúcumo',
           'Pachacamac': 'Pachacámac', 'Villa Maria': 'Villa María'}
    clusters = [{'x': c['x'], 'y': c['y'], 'nombre': ACC.get(c['loma'], c['loma'])}
                for c in cl]

    rows, warn = [], []
    seq = 0
    for pn in range(FIRST, LAST + 1):
        if pn in SKIP:
            continue
        page = doc[pn - 1]
        h = header_fields(page)
        if not h['nombre_cientifico']:
            warn.append((pn, 'sin nombre científico')); continue
        seq += 1
        raw = h['numero'] or ''
        digits = re.sub(r'\D', '', raw)
        if digits:
            num = int(digits)
            if raw != digits:
                warn.append((pn, f'número impreso {raw!r} -> {num}'))
        else:
            num = seq
            warn.append((pn, f'número ausente ({raw!r}) -> secuencia {seq}'))

        pv, cats = panel_fields(page)
        amin, amax = parse_altura(pv.get('altura'))
        fi, ff, fmeses = parse_floracion(pv.get('floracion'))
        lo, hi = altitud(page)
        body = split_body(flow_text(page, 262, 492))
        lomas = lomas_from_map(page, clusters)
        grupo = h['grupo'] or ''
        grupo = GRUPO_FIX.get(grupo, grupo)

        rows.append({
            'especie_id': slug(h['nombre_cientifico']),
            'numero_guia': num,
            'pagina_pdf': pn,
            'nombre_comun': tidy(h['nombre_comun'] or ''),
            'nombre_cientifico': h['nombre_cientifico'],
            'autor_cientifico': h['autor'] or '',
            'familia': FAMILIA_FIX.get(h['familia'] or '', h['familia'] or ''),
            'grupo': grupo,
            'origen': ORIGEN_FIX.get(pv.get('origen') or '', pv.get('origen') or ''),
            'endemico': 'true' if endemico(page) else 'false',
            'amenaza': amenaza(page, cats) or '',
            'altura_min_cm': amin if amin is not None else '',
            'altura_max_cm': amax if amax is not None else '',
            'altura_texto': pv.get('altura') or '',
            'floracion_inicio_mes': fi or '',
            'floracion_fin_mes': ff or '',
            'floracion_meses': fmeses,
            'floracion_texto': pv.get('floracion') or '',
            'altitud_min_msnm': lo if lo is not None else '',
            'altitud_max_msnm': hi if hi is not None else '',
            'altitud_texto': altitud_citada(body['habitat']),
            'habitats': ', '.join(habitats_de(body['habitat'])),
            'cara': cara_de(body['habitat']),
            'lomas': '; '.join(lomas),
            'n_lomas': len(lomas),
            'descripcion': body['descripcion'],
            'habitat': body['habitat'],
            'distribucion': body['distribucion'],
            'situacion_actual': body['situacion'],
            'fuente': f'SERFOR 2015, p.{pn}',
        })

    nrep = reparar_acentos(rows, ('descripcion', 'habitat',
                                 'distribucion', 'situacion_actual'))

    cols = list(rows[0].keys())
    out = os.path.join(TABLAS, 'especie.csv')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader(); w.writerows(rows)
    json.dump(rows, open(os.path.join(TABLAS, 'especie.json'), 'w',
                         encoding='utf-8'), ensure_ascii=False, indent=1)

    el = os.path.join(TABLAS, 'especie_loma.csv')
    n = 0
    with open(el, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh)
        w.writerow(['especie_id', 'numero_guia', 'nombre_cientifico',
                    'loma_id', 'loma', 'pagina_pdf', 'origen_dato'])
        for r in rows:
            for nm in [x for x in r['lomas'].split('; ') if x]:
                w.writerow([r['especie_id'], r['numero_guia'],
                            r['nombre_cientifico'], slug(nm), nm,
                            r['pagina_pdf'], 'mapa'])
                n += 1

    print(f'especies: {len(rows)}   -> {TABLAS}/especie.csv')
    print(f'palabras reunidas tras corte por acento: {nrep}')
    print(f'especie_loma: {n} filas -> {TABLAS}/especie_loma.csv')

    def miss(k):
        return [r['numero_guia'] for r in rows if r[k] in ('', None)]
    print('\ncompletitud:')
    for k in ('nombre_comun', 'familia', 'grupo', 'origen', 'altura_min_cm',
              'floracion_inicio_mes', 'altitud_min_msnm', 'descripcion',
              'habitat', 'distribucion', 'situacion_actual', 'lomas'):
        m = miss(k)
        print(f'  {k:22s} {len(rows)-len(m):3d}/{len(rows)}'
              + (f'   faltan: {m[:14]}' if m else ''))
    print('\nendémicas:', sum(1 for r in rows if r['endemico'] == 'true'),
          ' amenazadas (VU):', sum(1 for r in rows if r['amenaza']))
    print('grupos:', dict(collections.Counter(r['grupo'] for r in rows)))
    print('origen:', dict(collections.Counter(r['origen'] for r in rows)))
    if warn:
        print('\navisos:')
        for pn, msg in warn:
            print(f'  p.{pn}: {msg}')


if __name__ == '__main__':
    main()
