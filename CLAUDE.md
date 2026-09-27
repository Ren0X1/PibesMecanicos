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
    CarDetail.jsx   la ficha: mantenimientos, ejes, trabajos, recambios
    MaintenanceWall.jsx  la web apagada, y la tira del administrador
    ...
supabase/           el esquema y las migraciones, numeradas
test/               vitest + jsdom
```

---

## Las cosas que hay que saber

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

### 4 bis. Nada de confirm() del navegador

Preguntar «¿seguro?» se hace con `useConfirm()` de `ui.jsx`, que
devuelve una promesa y pinta el modal de la casa. El `confirm()`
del navegador sale con el tipo del sistema y el nombre del
servidor encima, en medio de una interfaz cuidada al píxel. Había
doce; no queda ninguno.

### 5. Las gráficas son de área y solo hay una

`AreaChart.jsx`. Se quitó `recharts` del proyecto entero (el
paquete bajó 395 kB). Si necesitas enseñar una serie, es esa.

### 6. Las piezas que van por eje

Neumáticos, discos, pastillas, amortiguadores y silentblocks no
son una pieza: son **dos ejes**, cada uno con su `type_id`
(`neumaticos_del`, `neumaticos_tras`…) y su `axle`. En un coche
cada eje tiene dos lados, en las columnas `last_km_izq`,
`last_date_izq`, `last_km_der` y `last_date_der`.

Tres reglas que no se pueden romper:

- **En moto no hay lados.** Una rueda delante y otra detrás. Lo
  decide `hasSides(mt, vehicleType)`, nunca el tipo a solas. En
  moto además cambian el nombre (`nameMoto`: «horquilla») y el
  intervalo (`defKmMoto`: un trasero son 12.000 km, no 45.000).
- **El aviso lo manda el lado que peor está.** `last_km` y
  `last_date` de la fila son los de ese lado, y por eso el resto
  de la aplicación —la tabla, el PDF, el gasto por taller— puede
  seguir leyéndolos sin saber nada de lados. Si cambias solo el
  izquierdo, el próximo se recalcula desde el derecho, que sigue
  siendo el viejo. Eso lo hacen `worstOf()` y `nextFrom()`.
- **El coste y el recambio son del eje**, no del lado: «los dos
  delanteros por 180 €», y delante y detrás pueden llevar medidas
  distintas (`part_id`).
- **Abrir la ficha no puede reescribir los lados.** Si el eje ya
  tiene lados apuntados, el formulario entra SIN lado elegido y
  guardar así los deja como estaban: solo toca coste, taller,
  recambio y notas. Arrancaba en «los dos» y bastaba abrirlo para
  enlazar un recambio para perder el lado que se había cambiado
  aparte. Lo vigila `test/ejeFormulario.test.jsx`.

Un `next_km` a cero **no** es «vencido hace doscientos mil»: es
una pieza que no se mide en kilómetros (silentblocks, rótulas).
`getMaintStatus` lo sabe; si tocas esa función, respétalo.

### 7. Lo que no está en la lista: los trabajos libres

`custom_jobs`. Nombre a mano, fecha, km, coste, taller y
recambio, varias entradas por vehículo y **sin avisos**: es un
cuaderno. Su coste es gasto de taller y suma donde suman los
mantenimientos —Gastos, estadísticas, lo gastado por taller y los
dos exportes—. Si tocas alguno de esos sitios, acuérdate de ellos.

### 8. Modo mantenimiento

`app_settings`, fila `maintenance`. Un administrador lo enciende
desde su panel («La web») y la aplicación entera pasa a ser
`MaintenanceWall`: los demás ven un aviso y no pueden tocar nada.
El administrador sigue entrando —es quien tiene que volver a
encenderla— y ve una tira amarilla arriba.

Se pregunta al entrar y cada minuto. **Si la consulta falla, se
entra como siempre**: una web caída por no poder preguntar si
está caída sería peor que el problema que viene a resolver. No lo
cambies a «cerrado por si acaso».

### 8 bis. La demo no es la puerta de atrás

El interruptor de mantenimiento se pregunta **siempre a Supabase**,
también estando en `/demo`: por eso `App.jsx` importa
`getMaintenanceMode` de `supabase.js` y no de la fachada. Con la
web apagada, entrar en la demo era saltarse el cartel de
«cerrado». Y el acceso que ofrece el muro va con `sinDemo`, que
quita ese botón del formulario.

El administrador **de la demo no es administrador de la web**: su
rol es de mentira, como el resto de la demo.

### 9. Que la base no se duerma

Un proyecto de Supabase sin consultas se pausa solo. Quien lo
evita es `.github/workflows/keepalive.yml`: cada seis horas mira
el ajuste `keepalive` y, si está puesto, hace un SELECT y apunta
la hora en `keepalive_ping`. Usa los mismos secretos que el
despliegue.

El interruptor vive en el panel, pestaña «La web», al lado del
modo mantenimiento, y enseña cuándo fue el último toque; si pasa
de un día, avisa.

Lo que hay que saber para no llevarse un chasco: **mientras el
workflow exista, la comprobación del interruptor ya es una
consulta**. Apagarlo deja de hacer el SELECT, pero para que la
base no reciba nada hay que desactivar el workflow en GitHub.
Está dicho en la propia pantalla, así que no lo quites.

---

## Verificar de verdad

Compilar no es verificar. Dos veces se dio por bueno algo que no
funcionaba: una porque el código se probó en Node, donde no existe
la restricción que lo rompía en el navegador; otra porque el error
solo aparecía al pintar el componente.

De ahí salieron las dos herramientas que hay:

**Los tests** (`npm test`, 173). Montan cada pantalla de verdad,
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

- `screens=<nombre>` monta solo esa pantalla (`car`, `moto`,
  `stats`, `reminders`, `workshops`, `groups`, `expense`, `admin`,
  `mmode`). `moto` es la ficha de la MT-07: es donde se comprueba
  que un eje sin lados se ve bien.
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

Las últimas son la **15** (permisos de la Data API, por el cambio
de Supabase del 30 de octubre: cada migración que cree una tabla
lleva su `GRANT` dentro), la **16** (las piezas por eje, los lados,
`part_id` y `custom_jobs`), la **17** (`app_settings`, el modo
mantenimiento) y la **18** (las dos filas de `keepalive`).

La 16 reparte los registros viejos sin perder nada: el coste va
solo en el eje delantero para que el total de dinero no cambie.

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
- el rol se puede editar desde el cliente;
- y el modo mantenimiento se puede apagar con la clave pública,
  como todo lo demás.

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
