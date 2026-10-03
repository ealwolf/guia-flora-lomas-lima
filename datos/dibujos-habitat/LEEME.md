# Los dibujos de los hábitats

Los ocho hábitats que la guía define en la página 12, dibujados para esta app
a partir de bocetos a mano del proyecto. **No salen del PDF**: son ilustración
propia, y por eso viven en `datos/` y no en `datos/crudo/`.

Van en tres familias, y el reparto está en `HABITATS`, en `app/js/app.js`:

| Familia | Dibujos |
| --- | --- |
| Lo que crece | `arborea` `arbustiva` `herbacea` `cactaceas` |
| El suelo de la ladera | `arenosa` `rocosa` |
| La forma del terreno | `cresta` `quebrada` |

Dentro de cada familia el dibujo es **el mismo** salvo en lo que las separa: el
porte de la planta, la arena o la roca, el pico o el valle. Ésa es toda la
idea, así que al retocar uno hay que mirar a sus hermanos: las dos laderas
comparten la curva del cerro letra por letra, y las cuatro primeras comparten
la línea del suelo en y=82.

## Las reglas

- Lienzo `0 0 80 100` (4:5) y el mismo envoltorio en los ocho. `construir.py`
  lo comprueba y no deja construir si uno se desvía.
- **Sin color.** Todo es `currentColor`: el dibujo sigue al tema claro u oscuro
  y se pone verde al elegir la ficha, sin una sola regla de color aparte.
- Los rellenos tenues (`opacity` .1–.12) son sombra, nunca información.
- Dos grosores y no más: 2 para la línea principal, 1.4 para el detalle.
- Sin `id`, `<text>`, `<style>` ni `<defs>`: los ocho acaban incrustados en la
  misma página y los nombres chocarían.
- Se ven a 60 × 75 px. Nada más fino que 2 unidades.

El `<svg>` de fuera lo pone `dibujoHabitat()`, en `app/js/app.js`; `construir.py`
guarda sólo el interior, así que el archivo puede abrirse y verse por su cuenta
sin que eso cambie lo que llega a la app.
