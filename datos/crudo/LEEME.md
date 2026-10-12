# Lo crudo

**Nada de esta carpeta es nuestro y nada se edita. Nunca.**

```
libro/    el PDF publicado por el SERFOR. El origen de todo.
tablas/   lo que se extrajo de él en texto: las 134 fichas, las 22 lomas,
          el mapa y los perfiles de altitud.
img/      lo que se extrajo en imagen: las 295 fotografías, tal cual.
```

Su valor es que está congelado. Permite coger cualquier dato de la app y
comprobarlo contra el libro, y permite rehacer la extracción desde cero y
comparar.

Lo que esta app añade o corrige vive en `datos/propio/`, separado a propósito.
Si encuentras un error aquí, **no lo arregles aquí**: ponlo en `propio/`.

## Rehacerlo

```bash
python scripts/extraer-especies.py     # libro/ -> tablas/
python scripts/extraer-imagenes.py     # libro/ -> img/ y completa las tablas
```

El segundo depende del primero: añade a `especie.csv` las dos columnas de
fotos. Comprobado que los dos juntos reproducen lo que hay aquí: las tres
tablas idénticas y las 295 fotografías byte a byte.

Para probar sin tocar lo congelado, se les da otra carpeta de salida:

```bash
SALIDA_CRUDO=/tmp/prueba python scripts/extraer-especies.py
```

`_lomas_clusters.json` es lo único de `tablas/` que no sale del PDF: son los 22
grupos de polígonos del mapa, identificados aparte, y el extractor los necesita
para saber qué loma es cada mancha roja.

## Los derechos

El contenido de esta carpeta es del SERFOR y de los autores de la guía. Ver
[DERECHOS.md](../../DERECHOS.md) en la raíz del proyecto.
