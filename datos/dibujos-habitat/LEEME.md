# Los dibujos de los hábitats

Los ocho hábitats que la guía define en la página 12, dibujados para esta app.
**No salen del PDF**: son ilustración propia, y por eso viven en `datos/` y no
en `datos/crudo/`.

Van en tres familias, y el reparto está en `HABITATS`, en `app/js/app.js`:

| Familia | Dibujos |
| --- | --- |
| Vegetación de alrededor | `arborea` `arbustiva` `herbacea` `cactaceas` |
| Tipo de ladera | `arenosa` `rocosa` |
| Relieve de loma | `cresta` `quebrada` |

## De dónde viene cada uno

Ahora mismo hay dos procedencias, y conviene saber cuál es cuál antes de
tocar nada:

- **`arenosa`, `rocosa`, `cresta`, `quebrada`** salen de Affinity
  (`assets/source/illustrations-habitat.af`), se exportan a `assets/` y entran
  con `python scripts/importar-dibujos.py`. **No se editan a mano**: lo que
  haya en `datos/dibujos-habitat/` se sobrescribe en cada importación. Se
  edita el `.af`, se exporta y se vuelve a pasar el guión.
- **`arborea`, `arbustiva`, `herbacea`, `cactaceas`** están escritos a mano,
  de los bocetos a lápiz del proyecto. Éstos sí se editan aquí. Están
  pendientes de rehacerse en Affinity como los otros cuatro; mientras tanto el
  juego tiene dos estilos, y se nota: los de Affinity llevan más detalle.

## Las reglas

- Lienzo `0 0 80 100` (4:5) y el mismo envoltorio en los ocho.
  `construir.py` lo comprueba y no deja construir si uno se desvía.
- **Sin color.** Todo es `currentColor`: el dibujo sigue al tema claro u
  oscuro y se pone verde al elegir la ficha, sin una sola regla de color
  aparte. Los dibujos de Affinity vienen en negro; el importador lo quita.
- Los rellenos tenues (`opacity` .1–.12) son sombra, nunca información.
- Un solo grosor, 2, y 1.4 para algún detalle. El importador **no respeta** el
  grosor del original: Affinity dibuja a 4 px sobre 360, que en este lienzo
  son 0,89, y esto se ve a 60 px de ancho —0,89 serían dos tercios de píxel y
  la arena desaparecía entera—. Se normaliza en `GROSOR`, en el importador.
- Sin `id`, `<text>`, `<style>` ni `<defs>`: los ocho acaban incrustados en la
  misma página y los nombres chocarían.
- Se ven a 60 × 75 px. Nada más fino que 2 unidades.

## Dentro de cada familia

El dibujo es **el mismo** salvo en lo que las separa: el porte de la planta,
la arena o la roca, el pico o el valle. Ésa es toda la idea, así que al
retocar uno hay que mirar a sus hermanos.

La primera familia va un paso más allá: los cuatro no son cuatro escenas, son
**cuatro ventanas de un mismo campo**. Por eso su línea del suelo es
`M0 82H80` y no `M6 82H74` — sale por los dos lados del lienzo, se corta con
él y sigue en la ficha de al lado. Si tocas uno, la línea se queda donde
está. Las plantas sueltas —árboles, matas, cactus— van enteras dentro de su
ficha, porque media mata cortada por el borde parece un fallo; la hierba no,
que es una estera y se corta con el lienzo como el suelo.

Del lado de la app, esa familia se pinta con la clase `franja`: los cuatro
tramos van pegados y sin filete, así que los lienzos se tocan y la línea
cruza los cuatro sin costura. Sólo el tramo elegido saca recuadro y fondo, y
la línea le pasa por dentro. Si algún día se le devuelve el filete a esas
fichas, la línea se parte: son 2 px por empalme.

El `<svg>` de fuera lo pone `dibujoHabitat()`, en `app/js/app.js`;
`construir.py` guarda sólo el interior, así que el archivo puede abrirse y
verse por su cuenta sin que eso cambie lo que llega a la app.
