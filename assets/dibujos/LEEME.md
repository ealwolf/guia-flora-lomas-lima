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
- **Sólo líneas.** Un grosor, 2, y 1,4 para el detalle. Nada de rellenos: el
  color y el estilo los pone la app, no el archivo.
- Sin `id`, `<text>`, `<style>` ni `<defs>`: los 16 acaban incrustados en la
  misma página y los nombres chocarían.
- Se ven a unos 60 x 75 px. Nada más fino que 2 unidades.

## Dos cosas que conviene saber antes de tocar

**La copa de la tara.** `habitat-lomaArborea.svg` es el único que conserva un
relleno, y es a propósito: la copa de la tara es ancha y plana y **no tiene
contorno**, así que es una mancha tenue con las ramas cruzándola. Si se cierra
el contorno sale el árbol de los cuentos, y con hojas en bolas salen dos
piruletas; las dos cosas se probaron. Para pasarla a línea hay que redibujar
la copa, no sólo borrar el relleno.

**Los cuatro de Affinity.** `laderaArenosa`, `laderaRocosa`, `crestaRocosa` y
`fondoQuebrada` salen de `assets/source/illustrations-habitat.af` a través de
`scripts/importar-dibujos.py`, que los **sobrescribe** en cada pasada. Editar
aquí esos cuatro es perder el trabajo la próxima vez que se corra aquel
guión: para ésos se edita el `.af`. Los otros doce son de aquí y se editan
aquí. `importar-editados.py` avisa si tocas uno de los cuatro.

## La línea del suelo

Los cuatro de «Vegetación de alrededor» la llevan de `6` a `74`, corta, sin
tocar los filetes de su ficha. Estuvieron un tiempo pegados unos a otros, como
una franja, y entonces iba de `0` a `80` para empalmar con la del vecino. Ya
no: son cuatro fichas sueltas.
