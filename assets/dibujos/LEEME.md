# Los dibujos, para editarlos a mano

Los 16 dibujos de los filtros **Hábitat** y **Tipo de planta**, cada uno en su
archivo y listo para abrir en cualquier editor vectorial.

```
habitat-*.svg    los 8 de «Hábitat»
tipo-*.svg       los 8 de «Tipo de planta»
```

## Cómo va el ida y vuelta

```
assets/dibujos/*.svg  ──  python scripts/importar-editados.py  ──▶  datos/dibujos-habitat/
                                                                    datos/dibujos-grupo/
                                                                             │
                                     python scripts/construir.py  ◀──────────┘
```

El primer guión sólo copia y renombra. El segundo es el que **comprueba las
reglas** y avisa con el nombre del archivo si alguna se rompe.

## Las reglas

Están contadas con detalle en
[datos/dibujos-habitat/LEEME.md](../../datos/dibujos-habitat/LEEME.md), y en
corto son:

- Lienzo `0 0 80 100` y el mismo envoltorio en los 16.
- **Sin color.** Todo es `currentColor`, y así el dibujo sigue al tema claro u
  oscuro y se pone verde al elegir la ficha, sin una sola regla de color.
- **Sólo líneas.** Un grosor, 1, y 0,7 para el detalle. Nada de rellenos:
  el color, el grosor y el estilo los pone la app, no el archivo.
- Sin `id`, `<text>`, `<style>` ni `<defs>`: los 16 acaban incrustados en la
  misma página y los nombres chocarían.
- Se ven a unos 110 x 137 px en escritorio y 80 x 100 en móvil. A ese tamaño,
  1 unidad es 1,33 px de trazo.

## Lo que conviene saber antes de tocar

**Los ocho de hábitat salen de Affinity.** Están en
`assets/source/illustrations-habitat.af` y llegan aquí por
`scripts/importar-dibujos.py`, que los **sobrescribe** en cada pasada.
Editarlos en esta carpeta es perder el trabajo la próxima vez que se corra
aquel guión: para ésos se edita el `.af` y se reexporta a `assets/*.svg`.

**Los ocho de tipo de planta están dibujados a mano** y sí se editan aquí.
Son los que quedan por pasar a Affinity. `importar-editados.py` avisa si
tocas uno de los de hábitat.

## La línea del suelo

Los cuatro de «Vegetación de alrededor» la llevan de `6` a `74`, corta, sin
tocar los filetes de su ficha. Estuvieron un tiempo pegados unos a otros, como
una franja, y entonces iba de `0` a `80` para empalmar con la del vecino. Ya
no: son cuatro fichas sueltas.
