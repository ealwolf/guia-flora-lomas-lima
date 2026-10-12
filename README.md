# Guía de Flora de las Lomas de Lima

**Las 134 especies de la guía del SERFOR (2015), en el teléfono y sin señal.**
En la loma no hay cobertura: la app se instala, se guarda entera y funciona en
modo avión.

## Qué es esto

Un catálogo de campo para las 22 lomas de Lima. Se busca por nombre, color de
flor, altitud, mes de floración, hábitat y loma; cada especie trae sus fotos,
su rango de altitud dibujado sobre el perfil del cerro y el mapa de dónde se
registró.

**Y es también un ejemplo completo de cómo se pasa de un PDF a una guía
digital.** El repositorio trae la cadena entera y comprobable: el libro
original, lo que se extrajo de él, lo que se le añadió encima, los guiones que
lo convierten y la app que resulta.

Si trabajas en una institución con guías de campo en PDF y quieres hacer algo
parecido, puedes tomar esto como punto de partida: la licencia lo permite y la
estructura está pensada para que se entienda.

## Cómo verla funcionando

```bash
git clone https://github.com/USUARIO/guia-flora-lomas-lima.git
cd guia-flora-lomas-lima
pip install -r requirements.txt
python scripts/construir.py     # fabrica datos y fotos (unos 30 s la primera vez)
python scripts/servir.py        # abre http://127.0.0.1:8911
```

`construir.py` genera lo que no se versiona por derivado: los datos en
JavaScript, el mapa, los iconos, el service worker y las 295 fotos
recomprimidas a AVIF. Las veces siguientes es instantáneo, porque sólo rehace
lo que cambió.

Para publicarla, `python scripts/publicar.py` deja un espejo de `app/` y un
zip. La carpeta `app/` se puede arrastrar tal cual a cualquier alojamiento
estático. La única condición es **HTTPS**, que es lo que exige un service
worker.

## Cómo está organizado

```
datos/crudo/     el libro y lo que se extrajo de él. Intocable.
  libro/           el PDF publicado por el SERFOR
  tablas/          las 134 fichas, las 22 lomas, el mapa, los perfiles
  img/             las 295 fotografías tal como salieron
datos/propio/    lo que esta app añade. Separado a propósito.
scripts/         los guiones que convierten lo uno en lo otro.
app/             lo que se publica.
```

Esa separación es la regla principal del proyecto: **lo que dice el libro y lo
que decimos nosotros nunca se mezclan.** Si la app muestra algo que no está en
el libro (el color de la flor, un sinónimo, una loma observada), vive en
`datos/propio/` y la app lo distingue en pantalla.

## Se puede rehacer desde el PDF

El dato de `datos/crudo/` está congelado, pero no es un callejón sin salida:
los dos guiones que lo produjeron están aquí.

```bash
python scripts/extraer-especies.py     # del PDF a las tablas
python scripts/extraer-imagenes.py     # del PDF a las 295 fotos
```

Comprobado: partiendo del PDF de este repositorio, reproducen `especie.csv`,
`especie_loma.csv` y `especie_imagen.csv` idénticos, y las 295 fotografías byte
a byte. Para probarlo sin tocar lo congelado, se les puede dar otra carpeta de
salida:

```bash
SALIDA_CRUDO=/tmp/prueba python scripts/extraer-especies.py
```

## Qué tiene por dentro

- **Funciona sin conexión de verdad.** Un service worker guarda la app al
  entrar (unos 400 KB) y las fotos sólo si la persona las pide (3,5 MB), porque
  son datos de su plan y la decisión es suya.
- **Sin dependencias en el navegador.** JavaScript sin compilar, sin marcos y
  sin paso de construcción para la app.
- **Sin rastreo.** No recoge ningún dato, no hay estadísticas y no envía nada a
  ningún servidor.
- **Dibujos propios** para los hábitats y los tipos de planta, en SVG de una
  sola tinta, que siguen el tema claro u oscuro.

## Los derechos, en corto

El contenido de la guía, textos y fotografías, **es del SERFOR y de sus
autores**, no de este proyecto. El código, los dibujos y las correcciones son
propios y están bajo licencia MIT. Esto no es una aplicación oficial ni está
respaldada por el SERFOR.

Está todo en [DERECHOS.md](DERECHOS.md), y conviene leerlo antes de reutilizar
nada.

## Más

- [LEEME.md](LEEME.md): cómo funciona por dentro, decisión por decisión.
- [CONTRIBUTING.md](CONTRIBUTING.md): cómo avisar de un error.
- La guía original, en el [portal del SERFOR](https://www.gob.pe/institucion/serfor/informes-publicaciones/1124091-guia-de-flora-de-las-lomas-de-lima-2015).
- Dudas o errores: ealcantara@lomasdeparaiso.org
