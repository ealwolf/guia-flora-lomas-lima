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
│   │   ├── color_flor.csv
│   │   └── sinonimos.csv
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
- Al escribir aparece una **lista de sugerencias que dice de qué tipo es cada
  coincidencia**: *amarillo* es un color, *Malvaceae* una familia, *Amancáes*
  una loma y a la vez una especie. Elegir una aplica el filtro en vez de dejar
  el texto suelto; elegir una especie abre su ficha. También con las flechas y
  Enter. *julio* enciende el filtro de floración aunque esa palabra no esté en
  ningún texto del libro.
- **Filtrar por color de flor** desde la propia portada. Es lo que se busca en
  campo cuando no sabes qué planta tienes delante. Una especie sale en **todos
  los colores que tiene**, no sólo en el principal: 19 son blancas y amarillas
  a la vez, y si dudas entre los dos la encuentras por cualquiera. Delante van
  las que lo tienen como color principal; detrás, las que sólo lo tienen en un
  detalle (el centro amarillo de una flor blanca). La tarjeta muestra un punto
  por color.
- Filtrar por grupo, mes de floración, altitud, loma, hábitat y familia.
- **Altitud**, de dos formas: *una cota* (las especies cuyo rango incluye esa
  altura, útil cuando sabes dónde estás) o *un rango* (las que aparecen en algún
  punto de ese tramo). Empieza sin filtrar y se apaga con el botón **Quitar**.
- Ficha con **todo lo que trae el libro**: las cuatro secciones de texto
  (Descripción, Hábitat, Distribución, Situación actual), altura, floración,
  origen, endemismo, categoría de amenaza, hábitats y las fotos.
- **Perfil de altitud** y **mapa de las lomas**, con los vectores del propio
  libro: no son imágenes, son dibujos que se adaptan al tamaño de la pantalla y
  al modo claro u oscuro.
- El perfil reproduce **el trazo rojo tal como lo dibuja la guía**, que no sólo
  dice entre qué cotas vive la especie sino en qué cara de la loma: 85 de las
  134 aparecen sólo en la occidental (la que mira al mar), 15 sólo en la
  oriental y 34 en ambas.

- **Tema**: el botón de la cabecera abre un menú con automático, claro y
  oscuro. Por defecto sigue al teléfono, y lo que elijas se recuerda.

Funciona en vertical y en horizontal; desde tableta la cabecera se reduce a una
sola fila y la ficha se reparte en dos columnas.

---

## La cara de la loma se dice dos veces

El pie del perfil indica la cara según **el dibujo**; la ficha de Hábitats, la
que menciona **el texto**. Coinciden en 91 de 103 especies. En 12 la guía se
contradice a sí misma (por ejemplo *Tillandsia latifolia*: el perfil la pinta en
la cara occidental y el texto la describe en la oriental), así que se muestran
las dos con su procedencia en vez de elegir una por ti.

---

## El color de la flor no está en el PDF

La guía no trae un campo de color: se deduce leyendo la descripción de cada
especie. **133 de 134 tienen color**; sólo falta *Vasconcellea candicans*, cuya
flor ni se describe en el texto ni se ve en la foto.

| De dónde sale | Especies |
|---|---|
| Del texto de la descripción | 119 |
| Por familia (Poaceae, Pteridaceae, Ephedraceae → *sin flor vistosa*) | 9 |
| Criterio propio, anotado en `color_flor.csv` | 5 |
| Sin dato | 1 |

La familia manda sobre el texto: la guía llama «inconspicuas» a las flores de
*Ephedra*, y una espiga de gramínea color paja no es lo que busca quien filtra
por color en el campo.

Las 5 de criterio propio están marcadas `revisado = FALSE` con el motivo en
`notas_color`: son lecturas del libro y de la foto, no de un botánico. El valor
ya funciona en la app; falta que alguien las confirme. Para corregir cualquiera,
edita `datos/propio/color_flor.csv` y vuelve a ejecutar `construir.py`.

---

## Los sinónimos tampoco están en el PDF

La guía nombra cada especie una sola vez y no menciona sus nombres anteriores:
las palabras «sinónimo» y «basónimo» no aparecen en todo el libro. Pero en campo
y en la bibliografía antigua circulan los nombres viejos, así que la búsqueda
los acepta desde `datos/propio/sinonimos.csv`.

Vienen **2 sembrados** de la hoja de cálculo anterior de Lomas de Paraíso:

| Nombre en la guía | Se encuentra además por |
|---|---|
| *Oziroe biflora* | *Fortunatia biflora* |
| *Astrephia chaerophylloides* | *Valeriana chaerophylloides* |

Para añadir más, escribe en la fila de la especie; si tiene varios, sepáralos
con punto y coma. Luego `construir.py`. El sinónimo se busca igual que el
nombre válido, sale en las sugerencias etiquetado como tal y aparece en la
ficha bajo el nombre científico.

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
