# Guía de Flora de las Lomas de Lima — app de campo

Catálogo de las **134 especies** de la guía de SERFOR (2015), para consultar en
el teléfono **sin conexión**: en la loma no hay señal.

> Los datos salen del PDF publicado por SERFOR. La extracción vive aparte, en
> `App - Monitoreo`, y aquí llega como copia congelada. Este proyecto no la
> modifica: le añade cosas encima.

---

## Cómo se usa en el teléfono

Se **instala como app** desde una dirección web, y a partir de ahí funciona sin
conexión: en la primera visita con wifi el teléfono se guarda las 295 fotos y
todo lo demás, y en la loma ya no necesita señal para nada.

1. Publica la carpeta **`app/`** como sitio (ver abajo). Tiene que ser
   **HTTPS**: es la única condición.
2. Abre esa dirección con Chrome en el teléfono, **con wifi**.
3. Al entrar se guarda sola la app (textos, mapa, perfiles: unos 400 KB). Las
   fotos **no**: son 12 MB del plan de datos de alguien, y esa decisión es suya.
4. Pulsa el botón **↓** de la cabecera. Ahí está todo lo de guardar:
   *Descargar las 295 fotos* y, cuando el navegador lo permite,
   *Instalar como app*.
5. Deja la app abierta hasta que diga **«Lista para el campo»** (un par de
   minutos con wifi). Se puede cancelar a media descarga y seguir después.
6. Comprueba que funciona: modo avión y ábrela.

**Nada de ventanas flotantes.** La app no interrumpe para pedir que la
instales ni para bajar las fotos: el botón **↓** lleva un punto verde cuando
queda algo por hacer, y se entra cuando se quiera. Dentro se ve cuántas fotos
hay guardadas y cuánto ocupan, y se pueden **descargar, continuar, cancelar o
borrar del dispositivo** en cualquier momento.

Después de eso no vuelve a necesitar internet. Si algún día hay wifi, se pone
al día sola.

### Por qué no se puede abrir el archivo y ya

Se intentó y no funciona en Android moderno. Al abrir un archivo desde el
gestor de archivos, Chrome no recibe una dirección `file://` sino una
`content://`, y con esa las rutas relativas no resuelven:

| | Qué pasa |
|---|---|
| `index.html` | no carga `css/` ni `js/` → interfaz rota |
| `todo-en-uno.html` | eso va incrustado → interfaz bien, pero **sin fotos** |

Comprobado en un Pixel 6a. `todo-en-uno.html` sigue ahí porque para mirar los
textos desde el PC va bien, pero para el campo la vía es la de arriba.

---

## Publicar la carpeta `app/`

Cualquier alojamiento estático con HTTPS sirve. La carpeta `app/` es la raíz
del sitio: `index.html` tiene que quedar en `/`, no en `/app/`.

**[Netlify Drop](https://app.netlify.com/drop)**: arrastras la carpeta `app/`
a la página y en un minuto tienes una dirección. Para volver a publicar,
arrastras otra vez. Sin cuenta, sin git, sin instalar nada.

**Si algún día quieres que sólo entres tú** — Cloudflare Pages: subes la
carpeta igual, y en *Zero Trust → Access* pones una regla que exija tu correo.
Cloudflare manda un código de un solo uso y nadie más puede abrirla. Es gratis
hasta 50 personas, y no estorba al uso sin conexión: la comprobación es al
entrar con red, y en el campo la app ya está guardada en el teléfono.

### Que no salga en los buscadores

No depende del alojamiento: son dos archivos que ya están en `app/`.

- **`app/_headers`** manda `X-Robots-Tag: noindex` en todo el sitio. Ésta es la
  que cuenta: prohíbe indexar, y vale también para las 295 fotos. La leen tanto
  Netlify como Cloudflare Pages, y el archivo en sí no se publica.
- **`app/robots.txt`** pide que no lo rastreen, y `index.html` lleva además su
  `<meta name="robots">`.

Una dirección que no está enlazada en ningún sitio no la encuentra nadie, pero
así queda dicho de las tres formas. El mismo `_headers` impide que `sw.js` se
quede cacheado, que si no las actualizaciones no llegarían al teléfono.

> Aunque la dirección no se enlace en ningún sitio, publicar es publicar. El
> texto y las fotos son de SERFOR y de los fotógrafos. Para uso propio de
> identificación en campo es otra cosa, pero conviene tenerlo presente si algún
> día esto se comparte.

### Actualizar lo publicado

```bash
python scripts/construir.py
```

y vuelve a subir la carpeta. El teléfono nota el cambio la próxima vez que la
abras con red. **Sólo baja lo que cambió**: las fotos y el resto se guardan por
separado a propósito, así que corregir un color de flor son unos 400 KB, no los
12 MB otra vez.

---

## Estructura

```
Guía de Flora de las Lomas de Lima/
│
├── app/                    ← ESTO es lo que se publica como sitio
│   ├── index.html
│   ├── manifest.webmanifest  nombre, colores e iconos de la app instalada
│   ├── sw.js               guarda todo para usarlo sin red ← generado
│   ├── todo-en-uno.html    respaldo de un solo archivo    ← generado
│   ├── css/estilos.css     la apariencia. Edítala si quieres cambiarla.
│   ├── js/app.js           la lógica
│   ├── js/datos.js         las 134 especies        ← generado
│   ├── js/mapa.js          el mapa de las 22 lomas ← generado
│   ├── js/iconos.js        iconos Phosphor         ← generado
│   ├── icono/              el icono de la app
│   └── img/                295 fotos de la guía
│
├── datos/
│   ├── crudo/              copia congelada del PDF. NO EDITAR.
│   ├── propio/             tus correcciones. Ningún script escribe aquí.
│   │   ├── color_flor.csv
│   │   └── sinonimos.csv
│   ├── iconos-phosphor.json
│   └── iconos-propios.json   los dibujados aquí (la flor de la app)
│
├── scripts/
│   ├── construir.py        datos/ → app/js/ y app/sw.js
│   ├── sw.plantilla.js     de donde sale sw.js
│   └── icono.py            dibuja el icono (se ejecuta una vez)
│
└── docs/
    └── guia_flora_lomas_lima_2015.pdf   la fuente
```

Los archivos marcados como generados se rehacen en cada construcción; el resto
se escribe a mano y no se sobrescribe nunca.

---

## Actualizar los datos

```bash
python scripts/construir.py
```

Vuelve a publicar la carpeta y listo. Cambiar la apariencia es editar
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
- Encima de la rejilla, **una ficha por cada filtro puesto**, con su icono y
  quitable de una en una; el texto buscado es una más. Al final de la fila,
  *Quitar todo*. Sin ellas, elegir una sugerencia cambiaba el número de
  resultados y nada más: no se veía por qué.
- **Altitud**, de dos formas: *una cota* (las especies cuyo rango incluye esa
  altura, útil cuando sabes dónde estás) o *un rango* (las que aparecen en algún
  punto de ese tramo). Empieza sin filtrar y se apaga con el botón **Quitar**.
- Las fotos son **las del PDF, sin tocar**: ni recortadas ni reescaladas en
  disco. En las tarjetas se encuadran a 4:3 para que la rejilla salga pareja,
  pero eso es sólo el encuadre de la miniatura. En la ficha se ven **enteras**
  —26 de las 295 son verticales— y al tocarlas se abren a tamaño completo.
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
- **Funciona sin conexión** una vez guardada, y se instala con su propio icono.
  Todo eso se maneja desde el botón **↓** de la cabecera, en su propia vista:
  las fotos sólo se descargan si las pides, y se pueden borrar del dispositivo
  cuando quieras. 12 MB no se bajan a espaldas de nadie.

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

### Saber si ya está instalada no se puede

Y por eso la app no lo afirma. `display-mode: standalone` dice si **esta
ventana** es la app instalada, no si existe una instalación: abierta en una
pestaña normal, una app instalada responde que no. Lo único fiable es lo
contrario — el navegador **no** ofrece instalar lo que ya está instalado — así
que el botón sale sólo cuando Chrome acaba de avisar de que se puede. Sin esa
señal, la sección entera se esconde en vez de decir algo que podría ser falso.
La excepción es el iPhone, donde Safari no avisa nunca y sólo queda explicar el
camino a mano.

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
