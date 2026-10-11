# Bancos de prueba

Páginas sueltas para mirar una pieza de la app con datos que el dato real
todavía no da. **No se publican**: `scripts/publicar.py` sólo copia `app/`,
y esto vive fuera a propósito.

Cada una carga `app/css/estilos.css`, o sea las reglas de verdad. Lo único
propio de estas páginas son los mandos y el marco, así que si una regla
cambia en la app, cambia aquí; no hay una copia que se quede atrás.

## `visor-tira.html` — la tira de miniaturas del visor

La tira se centra, en pantalla ancha se para en 464 px y, si no cabe,
recorta la siguiente miniatura para que se vea que hay más. Ese recorte
**hoy no se ve nunca**: la ficha con más fotos de toda la guía tiene cuatro
-el reparto es 1 foto en 9 especies, 2 en 90, 3 en 34 y 4 en una- y cuatro
caben de sobra hasta en una pantalla de 320 px. Esta página mete hasta doce
para ver lo que pasará el día que haya fotos propias.

El marco de abajo es un `<iframe>` y no un `<div>` con ancho puesto, y eso
importa: la media query de la app corta en 601 px y una media query mira el
ancho de la ventana, no el de una caja. Dentro de un iframe la ventana es
el iframe, así que los botones de ancho cambian de verdad lo que la hoja de
estilos decide.

La chapa del centro dice, en cada ancho: cuánto mide la miniatura, cuánto
la tira, cuántas se ven enteras, si está centrada, si desborda y cuántos
píxeles de la siguiente asoman. Si alguna vez dice DESCENTRADA en rojo, o
que el corte cae justo en el borde de una miniatura, es que una regla se
rompió.

### El barrido

El botón «Barrer» ensancha el marco píxel a píxel de 300 a 1280 y comprueba
**lo único que de verdad no puede pasar: que al ensanchar la pantalla se
vean MENOS fotos que antes.** Imprime los anchos donde algo cambia y un
veredicto.

Lo encontró dos veces. La primera, el escalón de la media query en 601 px,
que al cruzarla cambiaba de golpe las tres cosas -miniatura, relleno y
tope- y hacía que una pantalla un píxel más ancha enseñara una foto menos.
La segunda, al arreglar aquello con `clamp(54px, 7vw, 64px)`: sobre el
papel es continuo, pero la miniatura engorda 0,07 px por píxel de pantalla
y la tira unos 0,94, y los redondeos no van al mismo paso, así que entre
779 y 908 px la última entraba y salía del borde diez veces. Invisible,
pero la flecha de la derecha se encendía y se apagaba al estirar la
ventana. De ahí que la miniatura hoy sea de tamaño fijo.

Si se vuelve a tocar el ancho de algo de la tira, pasar el barrido.

## Cómo abrirlas

Con un servidor, porque cargan la hoja de estilos y las fotos de `app/` por
ruta relativa y `file://` no deja:

    python -m http.server 8912

desde la raíz del proyecto, y luego
<http://127.0.0.1:8912/pruebas/visor-tira.html>.
