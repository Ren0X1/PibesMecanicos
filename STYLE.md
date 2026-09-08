# Acero — sistema de diseño

Pibes Mecánicos es una herramienta de taller, no una revista. Lo
que se mira aquí son cifras: kilómetros, fechas, euros. Todo lo
demás está para que esas cifras se lean rápido y sin ruido.

El sistema se llama **Acero**. Se resume en una frase: *fondo
grafito, un solo color, cero esquinas redondeadas y filetes de un
píxel en vez de sombras.*

---

## 1. La regla de oro

**Ningún valor de color, tipografía o medida se escribe suelto en
un componente.** Todo sale de `src/lib/theme.js`, que es la única
fuente. Si hace falta un color nuevo, se añade allí.

`theme` es un `Proxy`: al leer `theme.accent` devuelve el color
del tema y del acento que estén activos **en ese momento**. Por
eso:

```js
// MAL: se congela el color del tema con el que arrancó la página
const PANEL = { background: theme.card }

// BIEN: se resuelve en cada pintado
const panel = () => ({ background: theme.card })
```

Lo mismo con los objetos de `css`: son *getters*, no constantes.
Un objeto de estilo declarado a nivel de módulo que lea `theme.X`
deja de responder al cambio de tema claro/oscuro y al cambio de
acento. Ha pasado ya dos veces.

---

## 2. Color

### Fondo y superficies

El fondo es grafito y no lo elige el usuario. Sí elige el acento.

| Papel        | Oscuro    | Claro     | Para qué |
|--------------|-----------|-----------|----------|
| `bg`         | `#121213` | `#f0f0ef` | el fondo de todo |
| `card`       | `#1a1a1b` | `#f9f9f8` | paneles y tarjetas |
| `cardHover`  | `#212123` | `#f2f2f0` | la fila señalada |
| `border`     | `#292929` | `#d8d8d6` | el filete de siempre |
| `rule`       | `#424244` | `#1f1f20` | el filete que separa de verdad |
| `input`      | `#0e0e0f` | `#ffffff` | campos de escribir |

### Texto

`white` para titulares y cifras, `text` para el cuerpo, `muted`
para lo secundario y `mutedLight` para lo que casi no importa.
Cuatro niveles, ni uno más.

### Estado

Verde, ámbar y rojo significan siempre lo mismo —al día, próximo,
vencido— y no se usan para decorar. Cada uno trae su versión
`Soft` para fondos.

### Acento

Ocho, y el usuario elige. Cada uno lleva dos versiones porque un
tono que luce sobre grafito es ilegible sobre papel:

```
mandarina (por defecto) · turquesa · manzana · oro
coral · frambuesa · púrpura · marfil
```

Los nombres **no** se guardan en `theme.js`: salen del diccionario
con `t('accent.<id>')`, porque son texto que se lee.

En las gráficas el mantenimiento va en el acento y el combustible
en verde, siempre, en toda la aplicación.

---

## 3. Tipografía

| Familia         | Dónde |
|-----------------|-------|
| **Archivo**     | todo el cuerpo |
| **Archivo Black** | titulares (`css.h1`, `css.h2`), en mayúsculas y muy apretados |
| **IBM Plex Mono** | cifras (`css.num`) y micro-rótulos (`css.lbl`) |

Dos costumbres que dan el carácter:

- **Las cifras van en mono**, con `font-variant-numeric: tabular-nums`,
  para que una columna de importes quede alineada por la coma.
- **Los rótulos son mono, diminutos, en mayúsculas y espaciados**
  (`css.lbl`: 9–10 px, `letter-spacing` amplio). Un rótulo nunca
  compite con el dato que rotula.

---

## 4. Forma

- **Radio cero.** En ninguna parte. `index.html` lo impone y los
  componentes no lo desmienten.
- **Sin sombras.** La jerarquía la marca un filete de 1 px y el
  cambio de fondo entre `bg` y `card`.
- **Lo seleccionado se marca con un filete al canto**, de 3 px en
  el acento, no con un relleno.
- **Sin animaciones**, salvo transiciones de 0,15 s en el estado
  «encima».

---

## 5. Maqueta

Cuatro anchuras, y el corte es de **anchura, no de dispositivo**:
un iPad de lado tiene sitio para dos columnas aunque se maneje con
el dedo.

| Desde     | Qué pasa |
|-----------|----------|
| 0         | una columna, barra de pestañas abajo, gestos |
| **1024**  | dos columnas: contenido y columna fija de contexto (iPad mini de lado) |
| **1400**  | la columna de contexto se ensancha; los grupos pasan a tres columnas |
| **1800**  | el contenido se ensancha hasta 1760 px |

La anchura máxima del contenido vive en una variable de CSS,
`--pm-max`, que usan **tanto la barra de arriba como las vistas**.
Si se cambia en un sitio y no en el otro, la barra deja de estar
alineada con el contenido, que es un fallo que ya se vio.

### El lenguaje de dos columnas

Es el elegido para todas las pantallas anchas y vive en
`src/components/TwoColumn.jsx`:

- **Izquierda:** el contenido, lo que cambia.
- **Derecha:** lo que hay que mirar hoy. Se queda pegada al hacer
  scroll (`position: sticky`) y **no cambia al cambiar de
  pestaña**.

Piezas que aporta: `Panel`, `Figure` (una cifra grande con su
rótulo), `Row` (rótulo y cifra con filete) y `AttentionList` (lo
que reclama atención, con su filete de color al canto).

Cuando no hay sitio, la propiedad `narrow` decide: `below` (por
defecto), `above` o `hide`. Se usa `hide` para lo que en estrecho
ya está a un toque en otra pestaña; repetirlo solo alarga la
página.

---

## 6. Gráficas

**Todas son de área**, sin excepción: `src/components/AreaChart.jsx`.
No queda ni una librería de gráficas en el proyecto.

- Dos siluetas apiladas: abajo el combustible, arriba el total.
  La franja de en medio es el taller.
- Detrás, una copia desenfocada del propio dibujo
  (`feGaussianBlur`). Sin ella el contorno se queda plano sobre el
  grafito.
- El lienzo es `viewBox="0 0 100 100"` con
  `preserveAspectRatio="none"`: la misma gráfica sirve para una
  columna de 290 px y para un panel de 900. Los trazos no se
  estiran gracias a `vector-effect="non-scaling-stroke"`.
- **Nada que tenga forma o tamaño propio puede ir dentro del SVG**:
  un círculo saldría hecho un óvalo y el texto, deformado. El
  punto del mes y el rótulo van en HTML por encima.
- Al pasar el ratón o el dedo sale el mes y las cifras. El ancho
  se reparte en tantas franjas como datos, así que no hay que
  acertarle a la línea.

---

## 7. Texto

Todo lo que se lee pasa por `src/lib/strings.js`, en **seis
idiomas**: inglés (el de por defecto), español, chino, alemán,
francés y ruso. El diccionario está ordenado por clave, con los
seis idiomas en la misma línea, para que una traducción que falte
se vea de un vistazo.

Números, monedas y fechas se formatean con `fmtNum`, `fmtMoney`,
`fmtDate` y `fmtMonth`, que usan el `Intl` del idioma activo. No
se llama a `toLocaleString()` a pelo ni se fija un idioma.

Dos tests lo vigilan: uno comprueba que no haya claves repetidas
—la segunda pisa a la primera sin decir nada— y otro busca texto
en castellano metido directamente en las pantallas.

---

## 8. Lo que no se hace

- Redondear esquinas.
- Poner sombras.
- Escribir un color, una fuente o un texto a pelo en un componente.
- Declarar un objeto de estilo a nivel de módulo que lea `theme`.
- Usar una gráfica que no sea la de área.
- Distinguir móvil de escritorio por el «user agent» o por el
  ancho de pantalla cuando lo que importa es cómo se apunta: para
  eso están `useIsTouch` y `useCanSwipe`.
