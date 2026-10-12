# Cómo colaborar

Se agradecen dos cosas sobre todo: **errores de dato** y **especies vistas
donde el libro no las cita**.

## Avisar de un error

Abre un *issue* o escribe a ealcantara@lomasdeparaiso.org. Ayuda mucho si
incluyes:

- El número de la especie en la guía (el «N.º 16» de la ficha).
- Qué dice la app y qué dice el libro, con la página.
- Si es una observación de campo: la loma, la fecha y una foto si la hay.

**Cada aviso se comprueba contra el libro antes de tocar nada.**

## La regla que no se rompe

`datos/crudo/` **no se edita a mano. Nunca.** Es el libro y su extracción, y su
valor es justamente que nadie los haya tocado: es lo que permite comprobar
cualquier cifra contra el original y rehacer la extracción desde cero.

Todo lo que se corrige o se añade va en `datos/propio/`, en el CSV que le
toque, y la app lo distingue en pantalla de lo que dice el libro. Si una
corrección no cabe en esa capa, entonces hace falta una columna nueva, no una
edición del crudo.

## Si tocas el código

- La app es JavaScript sin compilar y sin dependencias. No hay paso de
  construcción para `app/js/app.js`: se edita y ya.
- Los comentarios explican **por qué**, no qué. Si cambias algo que tenía un
  porqué escrito, actualiza el porqué.
- Después de cualquier cambio: `python scripts/construir.py` y probar la app de
  verdad en el navegador.
- Las medidas se miden. En este proyecto hay muchas decisiones tomadas con un
  número delante (anchos, contrastes, tiempos, tamaños); si cambias una,
  vuelve a medirla.
