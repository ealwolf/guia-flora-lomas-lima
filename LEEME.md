# Guía de Flora de las Lomas de Lima — app de campo

Catálogo de las **134 especies** de la guía de SERFOR (2015), para consultar en
el teléfono **sin conexión**: en la loma no hay señal.

> Los datos salen del PDF publicado por SERFOR. La extracción vive aparte, en
> `App - Monitoreo`, y aquí llega como copia congelada. Este proyecto no la
> modifica: le añade cosas encima.

---

## Cómo se usa en el teléfono

1. Copia la carpeta **`app/`** completa al teléfono (13 MB).
2. Ábrela con Chrome: el archivo **`app/index.html`**.
3. Menú de Chrome → *Añadir a pantalla de inicio*, y queda como un icono más.

No necesita internet, ni cuenta, ni instalar nada, ni tienda de aplicaciones.

**Si al abrirla se ve en blanco**, usa `app/todo-en-uno.html` en su lugar: es la
misma app con todo dentro de un único archivo. Algunos navegadores no dejan que
un archivo local cargue los `.js` que tiene al lado, y ese respaldo lo evita.
Vale la pena probar primero `index.html`, que es la versión que se actualiza
copiando un archivo pequeño en vez de uno grande.

---

## Estructura

```
Guía de Flora de las Lomas de Lima/
│
├── app/                    ← ESTO es lo que se copia al teléfono
│   ├── index.html
│   ├── todo-en-uno.html    respaldo, todo en un archivo
│   ├── css/estilos.css     la apariencia. Edítala si quieres cambiarla.
│   ├── js/app.js           la lógica
│   ├── js/datos.js         las 134 especies        ← generado
│   ├── js/mapa.js          el mapa de las 22 lomas ← generado
│   ├── js/iconos.js        iconos Phosphor         ← generado
│   └── img/                295 fotos de la guía
│
├── datos/
│   ├── crudo/              copia congelada del PDF. NO EDITAR.
│   ├── propio/             tus correcciones. Ningún script escribe aquí.
│   │   └── color_flor.csv
│   └── iconos-phosphor.json
│
├── scripts/
│   └── construir.py        datos/ → app/js/
│
└── docs/
    └── guia_flora_lomas_lima_2015.pdf   la fuente
```

Sólo tres archivos de `app/` se generan; el resto se escribe a mano y no se
sobrescribe nunca.

---

## Actualizar los datos

```bash
python scripts/construir.py
```

Luego copia al teléfono **sólo `app/js/datos.js`** (263 KB). Las 295 fotos
—que son el 98 % del peso— no se mueven. Cambiar la apariencia es editar
`app/css/estilos.css` y no toca los datos para nada.

---

## Qué se puede hacer en la app

- **Buscar** por nombre común, científico, familia, grupo, loma o hábitat. Sin
  tildes también encuentra: *amancaes* halla *Amancáes*.
- **Filtrar por color de flor** desde la propia portada. Es lo que se busca en
  campo cuando no sabes qué planta tienes delante.
- Filtrar por grupo, mes de floración, altitud, loma, hábitat y familia.
- **Altitud**: mueve el control a una cota y deja sólo las especies cuyo rango
  la incluye. Útil cuando sabes a qué altura estás.
- Ficha con **todo lo que trae el libro**: las cuatro secciones de texto
  (Descripción, Hábitat, Distribución, Situación actual), altura, floración,
  origen, endemismo, categoría de amenaza, hábitats y las fotos.
- **Perfil de altitud** y **mapa de las lomas**, con los vectores del propio
  libro: no son imágenes, son dibujos que se adaptan al tamaño de la pantalla y
  al modo claro u oscuro.

Funciona en vertical y en horizontal; en horizontal la ficha se reparte en dos
columnas. Sigue el modo claro u oscuro del teléfono.

---

## El color de la flor no está en el PDF

La guía no trae un campo de color: se dedujo leyendo la descripción de cada
especie. 111 salen del texto, 9 son gramíneas y helechos marcados como *sin flor
vistosa*, y **14 quedan pendientes de revisar**.

Para corregirlos, edita `datos/propio/color_flor.csv` (trae la sugerencia y la
frase exacta del libro como evidencia) y vuelve a ejecutar `construir.py`. Tu
valor manda siempre sobre el automático.

---

## Créditos

**Guía de Flora de las Lomas de Lima.** Miguel Lleellish, Jael Odar y Huber
Trinidad. SERFOR, 2015. ISBN 978-612-46908-0-8.
Fotografías: M. Lleellish, J. Odar, H. Castillo, G. Pino y D. Mac Donald.

> Cita recomendada: Lleellish M., J. Odar & H. Trinidad. 2015. *Guía de Flora de
> las Lomas de Lima*. Servicio Nacional Forestal y de Fauna Silvestre. Lima,
> Perú. 162 pp.

El contenido y las fotografías son de sus autores. Antes de publicar esta app
fuera del equipo conviene consultar con SERFOR las condiciones de reutilización.
