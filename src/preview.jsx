import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { theme, css } from './lib/theme.js'
import AreaChart, { toAreaData } from './components/AreaChart.jsx'
import SpendChart, { monthlySpend } from './components/SpendChart.jsx'
import { enterDemo } from './lib/demo/mode.js'
import * as demoStore from './lib/demo/store.js'
import UserStats from './components/UserStats.jsx'
import ExpenseTab from './components/ExpenseTab.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import CarDetail from './components/CarDetail.jsx'
import Reminders from './components/Reminders.jsx'
import Workshops from './components/Workshops.jsx'
import Groups from './components/Groups.jsx'

/* ─────────────────────────────────────────────────────────────
   Banco de pruebas visual.

   Existe para poder mirar un componente aislado —y para poder
   sacarle una captura sin pasar por el acceso ni por el
   asistente— en vez de dar por bueno que algo se ve bien porque
   compila.

   Solo en desarrollo: vite compila únicamente index.html.
   ───────────────────────────────────────────────────────────── */

/* Los parámetros se leen una sola vez, nada más cargar: al entrar
   en modo demo se reescribe la URL y se pierde la consulta. */
const QS = new URLSearchParams(location.search)

const monthsAgo = (n) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n, 15)
  return d.toISOString().slice(0, 10)
}

/* Un año realista: gasolina constante y algún pico de taller. */
const maintenance = [
  { last_date: monthsAgo(10), cost: 96 },
  { last_date: monthsAgo(8), cost: 138 },
  { last_date: monthsAgo(5), cost: 25 },
  { last_date: monthsAgo(3), cost: 612 },
  { last_date: monthsAgo(0), cost: 14 },
]
const fuelLogs = Array.from({ length: 12 }, (_, i) => ({
  date: monthsAgo(11 - i),
  total_cost: 130 + Math.round(Math.sin(i * 1.3) * 22) + i * 2,
}))

const months = monthlySpend(maintenance, fuelLogs)
const data = toAreaData(months)

const byCar = [
  { label: 'BMW', total: 2480 },
  { label: 'Yamaha', total: 760 },
  { label: 'Seat', total: 930 },
  { label: 'Vespa', total: 310 },
]

function Panel({ title, right, children, style }) {
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      display: 'flex', flexDirection: 'column', ...style,
    }}>
      <div style={{
        borderBottom: `1px solid ${theme.border}`, padding: '10px 13px',
        display: 'flex', justifyContent: 'space-between', gap: 10,
      }}>
        <span style={css.lbl}>{title}</span>
        {right && <span style={{ ...css.lbl, color: theme.accent }}>{right}</span>}
      </div>
      {children}
    </div>
  )
}

function Note({ children }) {
  return (
    <p style={{
      ...css.lbl, textTransform: 'none', letterSpacing: '.02em',
      fontSize: 12, margin: '0 0 12px',
    }}>{children}</p>
  )
}

/* Con ?hover=0.35 se señala esa fracción del ancho en todos los
   gráficos a la vez. Sirve para capturar el estado con el ratón
   encima, que de otro modo no sale en una captura sin sesión. */
function useHoverProbe() {
  useEffect(() => {
    const q = QS

    /* ?click=Statistics pulsa lo que ponga eso, sea un botón o un
       div con onClick. Sin esto no hay forma de mirar una pestaña
       que no sea la primera desde una captura sin ratón. */
    const label = q.get('click')
    if (label) {
      setTimeout(() => {
        const want = label.toLowerCase()
        const hit = [...document.querySelectorAll('*')].filter(el =>
          el.textContent.trim().toLowerCase().includes(want) &&
          ![...el.children].some(c => c.textContent.trim().toLowerCase().includes(want)))
        hit[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }, 400)
    }

    const r = parseFloat(q.get('hover'))
    if (!(r >= 0 && r <= 1)) return
    /* Se repite: las pantallas cargan sus datos y montan el gráfico
       más tarde, así que un solo disparo se quedaría corto. */
    const probe = () => {
      for (const svg of document.querySelectorAll('svg[viewBox="0 0 100 100"]')) {
        const el = svg.parentElement
        const b = el.getBoundingClientRect()
        if (!b.width) continue
        el.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true, clientX: b.left + b.width * r, clientY: b.top + b.height / 2,
        }))
      }
    }
    const ids = [600, 1400, 2400, 3400].map(ms => setTimeout(probe, ms))
    return () => ids.forEach(clearTimeout)
  }, [])
}

/* ?probe pinta arriba qué elementos se salen a lo ancho. Un
   desbordamiento horizontal en móvil no se ve en la captura: solo
   se nota que «falta» algo por la derecha. */
function useOverflowProbe() {
  useEffect(() => {
    if (!QS.has('probe')) return
    const id = setTimeout(() => {
      const w = document.documentElement.clientWidth
      const malos = []
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.right > w + 1 && r.width > 0) {
          malos.push({ el, over: Math.round(r.right - w), w: Math.round(r.width) })
        }
      }
      /* Solo interesan los más profundos: si un hijo se sale, todos
         sus padres salen también y el listado no diría nada. */
      const hojas = malos.filter(m => !malos.some(o => o !== m && m.el.contains(o.el)))
      const caja = document.createElement('pre')
      caja.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b00;color:#fff;font:10px monospace;padding:6px;margin:0;white-space:pre-wrap;max-height:40vh;overflow:auto'
      const salto = String.fromCharCode(10)
      caja.textContent = `ancho ${w} · scroll ${document.documentElement.scrollWidth}` + salto +
        hojas.slice(0, 12).map(m =>
          `+${m.over}px  ${m.el.tagName.toLowerCase()}  w=${m.w}  «${(m.el.textContent || '').trim().slice(0, 50)}»`
        ).join(salto)
      document.body.appendChild(caja)
    }, 1500)
    return () => clearTimeout(id)
  }, [])
}

function Preview() {
  useHoverProbe()
  return (
    <div style={{ padding: 26, maxWidth: 1500, margin: '0 auto' }}>
      <h1 style={{ ...css.h1, fontSize: 28, marginBottom: 6 }}>Gráfico de área</h1>
      <p style={{ ...css.lbl, marginBottom: 26 }}>
        naranja = mantenimiento · verde = combustible · pasa el ratón por encima
      </p>

      <section style={{ marginBottom: 34 }}>
        <h2 style={{ ...css.h2, fontSize: 16, marginBottom: 6 }}>Tres anchos, un componente</h2>
        <Note>
          El mismo gráfico en la columna de contexto, en un panel ancho y en la
          tarjeta del coche. Al señalar un mes salen la guía, los puntos de las
          dos series y las cifras; por debajo de 110 px de alto el aviso se
          reduce a una línea, siempre dentro del recuadro.
        </Note>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 290 }}>
            <Panel title="Columna de contexto" right="290 px">
              <div style={{ padding: '12px 12px 8px' }}>
                <AreaChart data={data} height={70} showAverage showLabels />
              </div>
            </Panel>
          </div>
          <div style={{ flex: 1 }}>
            <Panel title="Panel ancho" right="12 meses">
              <div style={{ padding: '14px 14px 10px' }}>
                <AreaChart data={data} height={190} showAverage showLabels />
              </div>
            </Panel>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 34 }}>
        <h2 style={{ ...css.h2, fontSize: 16, marginBottom: 6 }}>Con la cifra del mes</h2>
        <Note>Tal cual sale en la tarjeta del coche y en el resumen.</Note>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 330 }}>
            <Panel title="Gasto">
              <SpendChart maintenance={maintenance} fuelLogs={fuelLogs} />
            </Panel>
          </div>
          <div style={{ width: 520 }}>
            <Panel title="Gasto" right="panel">
              <SpendChart maintenance={maintenance} fuelLogs={fuelLogs} height={120} />
            </Panel>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ ...css.h2, fontSize: 16, marginBottom: 6 }}>Serie única</h2>
        <Note>
          Sin desglose —reparto por vehículo, por categoría, por usuario— se
          dibuja una sola silueta y el aviso enseña solo el total.
        </Note>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <Panel title="Por vehículo">
            <div style={{ padding: 12 }}>
              <AreaChart data={byCar} height={130} showLabels />
            </div>
          </Panel>
          <Panel title="Sin halo">
            <div style={{ padding: 12 }}>
              <AreaChart data={byCar} height={130} glow={false} showLabels />
            </div>
          </Panel>
          <Panel title="Miniatura">
            <div style={{ padding: 12 }}>
              <AreaChart data={byCar} height={56} />
            </div>
          </Panel>
        </div>
      </section>
    </div>
  )
}

/* ?screens monta las pantallas completas con los datos de la demo,
   para poder mirar los gráficos donde de verdad viven y no solo
   sueltos. Hay que entrar en modo demo antes de montar nada: la
   fachada de api.js decide de dónde saca los datos en cada
   llamada. */
function Screens() {
  const [datos, setDatos] = useState(null)
  useHoverProbe()
  useOverflowProbe()

  useEffect(() => {
    demoStore.resetDemo()
    Promise.all([
      demoStore.getCars(demoStore.DEMO_USER_ID),
      demoStore.getDemoUser(),
    ]).then(async ([cars, user]) => {
      const car = cars[0]
      setDatos({
        user,
        car,
        maintenance: await demoStore.getMaintenanceRecords(car.id),
        fuelLogs: await demoStore.getFuelLogs(car.id),
      })
    })
  }, [])

  if (!datos) return null

  /* ?screens=admin monta solo esa, para que quepa en una captura. */
  const only = QS.get('screens')
  const show = name => !only || only === name

  /* En móvil el banco no mete padding propio: si lo hiciera, las
     pantallas saldrían estrechadas y parecería que se desbordan
     cuando el que sobra es el banco. */
  const pad = window.innerWidth < 700 ? 0 : 26

  return (
    <div style={{ padding: pad }}>
      {show('car') && (
        <>
          <h2 style={{ ...css.h2, fontSize: 16, margin: '10px 0' }}>Ficha completa</h2>
          <CarDetail car={datos.car} onBack={() => {}} onCarUpdated={() => {}} onToast={() => {}} />
        </>
      )}

      {show('reminders') && (
        <>
          <h2 style={{ ...css.h2, fontSize: 16, margin: '10px 0' }}>Avisos</h2>
          <Reminders user={datos.user} onToast={() => {}} />
        </>
      )}

      {show('workshops') && (
        <>
          <h2 style={{ ...css.h2, fontSize: 16, margin: '10px 0' }}>Talleres</h2>
          <Workshops user={datos.user} onToast={() => {}} />
        </>
      )}

      {show('groups') && (
        <>
          <h2 style={{ ...css.h2, fontSize: 16, margin: '10px 0' }}>Grupos</h2>
          <Groups user={datos.user} onToast={() => {}} />
        </>
      )}

      {show('expense') && (
        <>
          <h2 style={{ ...css.h2, fontSize: 16, margin: '10px 0' }}>Gastos del vehículo</h2>
          <ExpenseTab
            maintenance={datos.maintenance}
            fuelLogs={datos.fuelLogs}
            isMobile={false}
            currentKm={datos.car.current_km}
          />
        </>
      )}

      {show('stats') && (
        <>
          <h2 style={{ ...css.h2, fontSize: 16, margin: '34px 0 10px' }}>Resumen</h2>
          <UserStats user={datos.user} onToast={() => {}} />
        </>
      )}

      {show('admin') && (
        <>
          <h2 style={{ ...css.h2, fontSize: 16, margin: '34px 0 10px' }}>Administración</h2>
          <AdminPanel onToast={() => {}} />
        </>
      )}
    </div>
  )
}

const screens = QS.has('screens')
if (screens) enterDemo()

createRoot(document.getElementById('root')).render(screens ? <Screens /> : <Preview />)
