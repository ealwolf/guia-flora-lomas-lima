# Derechos

Este proyecto junta cosas de dos procedencias y conviene saber cuál es cuál
antes de reutilizar nada.

## Lo que NO es nuestro

**El contenido de la guía.** Los textos descriptivos, las fotografías y los
datos de las 134 especies son de:

> Lleellish M., J. Odar & H. Trinidad. 2015. *Guía de Flora de las Lomas de
> Lima*. Servicio Nacional Forestal y de Fauna Silvestre. Lima, Perú. 162 pp.
> ISBN 978-612-46908-0-8
>
> Fotografías: M. Lleellish, J. Odar, H. Castillo, G. Pino y D. Mac Donald.

El PDF original está en `datos/crudo/libro/` y lo que se extrajo de él en
`datos/crudo/tablas/` y `datos/crudo/img/`. Están aquí **para que cualquiera
pueda comprobar de dónde sale cada dato y rehacer la extracción**, no como una
publicación alternativa del libro.

La guía es de libre acceso en el
[portal del SERFOR](https://www.gob.pe/institucion/serfor/informes-publicaciones/1124091-guia-de-flora-de-las-lomas-de-lima-2015),
que es la fuente oficial y la que conviene citar.

**Si quieres usar esos textos o esas fotografías para algo tuyo, el permiso te
lo tiene que dar el SERFOR, no nosotros.**

## Lo que sí es nuestro

Bajo licencia MIT, en [LICENSE](LICENSE):

| Qué | Dónde |
| --- | --- |
| El código de la app | `app/` |
| Los guiones de construcción y de extracción | `scripts/` |
| Los 16 dibujos de hábitat y tipo de planta | `datos/dibujos-habitat/`, `datos/dibujos-grupo/` |
| La capa de correcciones y lo deducido | `datos/propio/` |
| El esquema del dato y la organización del proyecto | |

Autor: Eduardo Alcántara, Lomas de Paraíso.

Los iconos son de [Phosphor Icons](https://phosphoricons.com), también con
licencia MIT.

## Postura

- **Esto no es una aplicación oficial.** No está hecha, revisada ni respaldada
  por el SERFOR ni por los autores de la guía.
- **No hay ánimo de lucro.** No se vende, no tiene publicidad, no recoge datos
  de nadie y nadie gana dinero con ella. No está autorizado cobrar por ella.
- **Se cita siempre la fuente**, en la app y aquí, con enlace al portal
  oficial.
- **Falta pedir la autorización.** Para difundir la guía en esta forma hace
  falta el permiso del SERFOR, y **todavía no se ha solicitado**. Mientras
  tanto, el proyecto se mantiene con esta postura, y cuando se pida y haya
  respuesta se dirá aquí cuál fue.
- **Retirada inmediata.** Si el SERFOR o cualquiera de los autores pide que se
  retire el contenido de la guía, se retira sin discusión. Basta con escribir a
  ealcantara@lomasdeparaiso.org.

## Si quieres partir de aquí

La parte reutilizable sin pedirle permiso a nadie es la máquina: la app, los
guiones, el esquema y los dibujos. Es decir, **todo lo necesario para hacer una
guía digital con tu propio contenido**, que es para lo que se publica esto.

Lo que no puedes reutilizar sin permiso del SERFOR es el contenido de *esta*
guía en concreto.

## Cómo citar

Si usas el proyecto, cita la guía original, que es donde está el trabajo de
campo:

> Lleellish M., J. Odar & H. Trinidad. 2015. *Guía de Flora de las Lomas de
> Lima*. SERFOR, Lima, Perú.

Y, si viene al caso, esta app como lo que es:

> Alcántara E. *Guía de Flora de las Lomas de Lima, app de campo*. Lomas de
> Paraíso. https://github.com/ealwolf/guia-flora-lomas-lima
