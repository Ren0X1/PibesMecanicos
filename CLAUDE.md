# Pibes Mecánicos — notas para quien venga después

Aplicación web para llevar el mantenimiento de coches y motos:
kilómetros, revisiones, ITV, repostajes, gastos, recordatorios y
grupos para compartir vehículos entre amigos.

Se publica en `loscolegones.com` con GitHub Pages. El autor es
Alejandro Mendoza ([Ren0X1](https://github.com/Ren0X1)).

**Antes de tocar nada visual, lee [STYLE.md](STYLE.md).** Aquí
está cómo funciona; allí, cómo tiene que verse.

---

## Cómo se arranca

```bash
npm install
npm run dev      # servidor de desarrollo
npm run check    # eslint + tests + build. Esto es lo que hay que pasar
```

`npm run check` es el único criterio: si pasa, el cambio está
listo; si no, no lo está.

**Deja siempre el servidor apagado al terminar.** Es una petición
explícita del autor, y se han quedado procesos vivos más de una
vez. En Windows:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 5170 -and $_.LocalPort -le 5210 }
```

---

## El mapa

```
src/
  lib/
    theme.js        el sistema de diseño entero (colores, tipos, css)
    strings.js      598 claves × 6 idiomas
    i18n.js         t(), fmtNum, fmtMoney, fmtDate, fmtMonth
    api.js          FACHADA: decide entre Supabase y la demo
    supabase.js     la de verdad
    demo/           la de mentira (seed, store, modo)
    constants.js    tipos de mantenimiento, combustibles, estados
    useTouch.js     useIsTouch / useCanSwipe / useMediaQuery
    prefs.js        idioma, tema y acento del perfil
    snooze.js       ocultar un aviso diez días
  components/
    TwoColumn.jsx   la maqueta de dos columnas y sus piezas
    AreaChart.jsx   LA gráfica: no hay otra
    ...
supabase/           el esquema y las migraciones, numeradas
test/               vitest + jsdom
```

---

## Las cinco cosas que hay que saber

### 1. La fachada de datos

`src/lib/api.js` está **generado**: por cada función exporta una
que despacha entre la implementación real y la de la demo.

```js
const impl = () => (isDemo() ? demo : real)
```

Si añades una función a `supabase.js`, tienes que añadirla también
a `demo/store.js` **con la misma firma**. Hay un test que compara
las dos listas y falla si se descuadran.

### 2. El modo demo

`/demo` entra en un mundo aparte: no se habla con Supabase, todo
sale de datos estáticos en el navegador y los cambios del
visitante se quedan en su sesión. Es la pieza de portafolio del
autor, así que tiene que verse bien y estar traducida entera.

Detalles que se olvidan:

- Las fechas del seed son **relativas a hoy**, para que la demo no
  envejezca.
- El seed lleva estampado el idioma con el que se generó; al
  cambiar de idioma se regenera solo.
- `resetDemo()` borra **todo**: datos, avisos ocultados,
  onboarding y la pista de los gestos.

### 3. El tema es un Proxy

Leer `theme.accent` devuelve el color de ahora mismo. Un objeto de
estilo declarado a nivel de módulo congela el tema con el que
arrancó la página. Usa funciones o *getters*. Está explicado en
STYLE.md, punto 1, y es el fallo que más veces ha vuelto.

### 4. Todo string pasa por el diccionario

Sin excepciones, en los seis idiomas. Hay dos tests que lo
vigilan: uno busca claves repetidas y otro busca castellano suelto
en las pantallas. Si el segundo te salta, la solución es una clave
nueva, no una excepción en el test.

### 5. Las gráficas son de área y solo hay una

`AreaChart.jsx`. Se quitó `recharts` del proyecto entero (el
paquete bajó 395 kB). Si necesitas enseñar una serie, es esa.

---

## Verificar de verdad

Compilar no es verificar. Dos veces se dio por bueno algo que no
funcionaba: una porque el código se probó en Node, donde no existe
la restricción que lo rompía en el navegador; otra porque el error
solo aparecía al pintar el componente.

De ahí salieron las dos herramientas que hay:

**Los tests** (`npm test`, 110). Montan cada pantalla de verdad,
en los seis idiomas, en los dos temas y —en `wide.test.jsx`— con
`matchMedia` diciendo que sí, que es la única forma de probar la
mitad ancha del código.

**El banco de pruebas visual**: `preview.html`, que Vite no
compila para producción. Sirve para mirar un componente aislado y
para sacarle una captura sin pasar por el acceso:

```
/preview.html                  las gráficas sueltas
/preview.html?screens=car      una pantalla entera con datos de la demo
/preview.html?screens=stats&hover=0.4&click=Statistics&probe=1
```

- `screens=<nombre>` monta solo esa pantalla (`car`, `stats`,
  `reminders`, `workshops`, `groups`, `expense`, `admin`).
- `hover=0..1` señala esa fracción del ancho en todas las gráficas,
  para capturar el estado con el ratón encima.
- `click=<texto>` pulsa lo que ponga eso: sirve para llegar a una
  pestaña que no sea la primera.
- `probe=1` pinta arriba qué elementos se salen a lo ancho.

Captura con Chrome sin ventana:

```bash
chrome --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1440,1200 --virtual-time-budget=9000 \
  --screenshot=out.png "http://localhost:5199/preview.html?screens=stats"
```

Ojo: en Windows la ventana **no baja de 500 px de ancho**. Pedir
390 da una página de 500 recortada, y parece que se desborda
cuando no. Para móvil, captura a 500.

---

## La base de datos

PostgreSQL en Supabase. El esquema y las migraciones están en
`supabase/`, numeradas y en orden; `00 - LEEME` explica cómo se
aplica la última. **Cada migración nueva lleva el número
siguiente**, ceros a la izquierda, y se escribe para poder
ejecutarse dos veces sin romper nada.

La última es la **14**, que añade `workshop_id` a
`maintenance_records`: es lo que permite decir cuánto se ha
gastado en cada taller.

---

## Seguridad: está pendiente

El acceso **no tiene seguridad real**, y conviene decirlo claro
antes de que alguien dé por hecho que sí:

- los PIN se guardan y se comparan **en claro**;
- las políticas RLS son `USING (true)` con permisos al rol
  anónimo: con la clave pública se puede leer y escribir todo;
- el bloqueo por intentos fallidos vive **en el navegador**, así
  que se salta recargando;
- la búsqueda de usuario mete el texto en un `ilike` sin escapar
  los comodines;
- el rol se puede editar desde el cliente.

Para un cuaderno de mantenimiento entre amigos es asumible, y el
autor lo sabe. Arreglarlo es una fase aparte: hashear los PIN,
cerrar las políticas por usuario, mover el límite de intentos al
servidor y escapar el `ilike`. **No lo mezcles con un cambio de
diseño.**

---

## Lo que queda

- El icono de la aplicación para iPhone y PWA. **El favicon (🔧)
  no se toca**: es una petición explícita.
- La fase de seguridad de arriba.
- Rotar una clave de API de Resend que se llegó a pegar en un
  chat.

---

## Cómo trabaja el autor

- Escribe en español; el código y los comentarios, también.
- Pide propuestas antes de aplicar cambios grandes, y elige por
  código (`C-3`, `M1`, `G2`).
- Quiere ver capturas, no descripciones: «ábrelo, saca una captura
  y juzga tú mismo».
- Y quiere el servidor apagado al terminar.
