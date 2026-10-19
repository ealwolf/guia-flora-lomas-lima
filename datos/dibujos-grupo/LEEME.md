# Los dibujos de «Tipo de planta»

Los ocho tipos de planta que usa la guía, dibujados para esta app.
**No salen del PDF**: son ilustración propia, y por eso viven en `datos/` y no
en `datos/crudo/`.

| Archivo | Tipo de planta | Especies |
| --- | --- | --- |
| `herbaceas.svg` | Herbáceas | 102 |
| `arbustivas.svg` | Arbustivas | 13 |
| `cactaceas.svg` | Cactáceas | 8 |
| `trepadoras.svg` | Trepadoras | 5 |
| `arboreas.svg` | Arbóreas | 3 |
| `helechos.svg` | Helechos | 1 |
| `ephedrales.svg` | Ephedrales | 1 |
| `parasitas.svg` | Parásitas | 1 |

## Por qué «Tipo de planta» y no «Grupo» ni «Porte»

En el libro la columna se llama `grupo`, y así sigue llamándose en el dato, en
el estado guardado y en el filtro. Lo que cambió es el rótulo, porque «Grupo»
no decía nada: seis renglones más abajo, en el mismo panel, hay otro grupo
que sí es taxonomía pura -«Familia»- y nada los distinguía.

Y lo que guarda la columna no es un criterio sino tres:

| Criterio | Valores | Especies |
| --- | --- | --- |
| Porte, cómo está armada la planta | Herbáceas, Arbustivas, Arbóreas, Trepadoras | 123 |
| Linaje que el libro aparta porque se reconoce de lejos | Cactáceas, Helechos, Ephedrales | 10 |
| Modo de vida | Parásitas | 1 |

Por eso tampoco servía «Porte», que sería exacto para 123 y falso para once:
un cactus no es un porte, es una familia. «Tipo de planta» es lo único cierto
de las ocho, y es también lo que de verdad hacen estos dibujos, que es
enseñar de qué clase de planta se habla sin tener que leer la palabra.

## Las reglas: las mismas que los hábitats

Lienzo `0 0 80 100`, mismo envoltorio, todo en `currentColor` y un solo grosor
-1,2, y 0,84 para el detalle-, que lo pone la app y no el archivo. Sin
rellenos: los tenues que hubo (`opacity` .12) eran sombra y se quitaron, para
que el color y el estilo los decida el código. `scripts/construir.py` lo
comprueba con el mismo lector que usa para los hábitats, así que un dibujo
que se salga del juego no entra.

Están en [LEEME de los hábitats](../dibujos-habitat/LEEME.md) con más detalle.

## Lo único que cambia, y es lo importante

**Aquí se dibuja UNA planta; allí, un paisaje.**

Cuatro de estos ocho se llaman casi igual que cuatro hábitats -arbórea,
arbustiva, herbácea, cactáceas- y no son lo mismo: el hábitat dice qué crece
*alrededor* de la especie, el tipo de planta dice qué *es* la especie. Los dos
filtros están en el mismo panel, a cinco renglones de distancia.

Si los dibujos se parecieran, nadie distinguiría los filtros. Por eso:

- El hábitat es una escena: varias plantas, y la línea del suelo cruza el
  lienzo entero (`M0 82H80`) porque sus cuatro primeras son cuatro ventanas de
  un mismo campo.
- El tipo de planta es un ejemplar: una planta sola, centrada, y la línea del
  suelo es corta (`M22 86H58`) o no está, que es la firma contraria.

## Las parejas que se confunden

Al retocar uno, mirar a su pareja. Son tres y están resueltas así:

- **Arbóreas / Arbustivas**: el árbol tiene UN tronco, dibujado con dos
  líneas que convergen, y la copa en alto, con aire entre la copa y el suelo.
  La mata tiene tallos finos de una línea que salen de un pie ancho, y la copa
  le baja hasta el suelo por los dos lados. Lo demás -contorno de bultos,
  mancha tenue, ramitas de 1,4- es igual en los dos, para que se vea que lo
  único que cambia es el esqueleto.
- **Herbáceas / Trepadoras**: la hierba se sostiene sola, tallo casi vertical
  con hojas lanceoladas y una flor. La trepadora se enrosca en un tutor
  visible, con cortes de línea en cada cruce y zarcillos en espiral.
- **Ephedrales / Parásitas**: la efedra es todo recto: un haz rígido de
  tallos sin hojas con las marcas de los nudos, de pie sobre su línea de
  suelo. La cuscuta es una hebra curva en espiras apretadas alrededor de OTRA
  planta -el huésped es lo único con hojas- con los cabos colgando y sin línea
  de suelo.
