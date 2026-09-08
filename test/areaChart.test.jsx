import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

import AreaChart, { toAreaData } from '../src/components/AreaChart.jsx'
import { monthlySpend } from '../src/components/SpendChart.jsx'
import { setLang, fmtMoney, fmtMonth, t } from '../src/lib/i18n.js'

/* ─────────────────────────────────────────────────────────────
   El gráfico de área y su lectura con el ratón.

   Lo que se prueba aquí no es el aspecto —para eso está el banco
   de pruebas— sino el reparto del puntero: qué mes se selecciona
   según dónde se señala, y que lo que sale escrito sea el de ese
   mes y en el idioma activo.

   También quedan fijadas dos cosas que ya se rompieron una vez:
   que los puntos del mes NO son círculos del SVG —el lienzo va
   estirado y salían hechos un óvalo— y que el gráfico no se cae
   cuando la serie viene sin desglose.
   ───────────────────────────────────────────────────────────── */

const WIDTH = 800

const SERIES = [
  { label: 'ENE', total: 100, lower: 60, upper: 40 },
  { label: 'FEB', total: 250, lower: 150, upper: 100 },
  { label: 'MAR', total: 80, lower: 80, upper: 0 },
  { label: 'ABR', total: 400, lower: 100, upper: 300 },
]

let host, root, rect

beforeEach(() => {
  setLang('es')
  /* jsdom mide 0×0, y con ancho cero el gráfico no puede repartir
     el puntero entre los meses. Se le da un ancho de verdad. */
  rect = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, left: 0, top: 0, right: WIDTH, bottom: 200, width: WIDTH, height: 200, toJSON() {} }
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  host.remove()
  HTMLElement.prototype.getBoundingClientRect = rect
})

async function mount(el) {
  await act(async () => { root.render(el) })
  await act(async () => { await Promise.resolve() })
  return host
}

/* El div que escucha el ratón es el que envuelve al SVG. */
const wrapper = () => host.querySelector('svg').parentElement

async function hover(clientX) {
  await act(async () => {
    wrapper().dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 50 }))
  })
}

async function leave() {
  await act(async () => {
    wrapper().dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
  })
}

const text = () => host.textContent

describe('el gráfico se lee con el ratón', () => {
  it('en reposo no enseña ningún mes', async () => {
    await mount(<AreaChart data={SERIES} height={170} />)
    for (const s of SERIES) expect(text()).not.toContain(s.label)
  })

  it('señalar una franja enseña ese mes y su total', async () => {
    await mount(<AreaChart data={SERIES} height={170} />)
    // Cuatro meses en 800 px: la segunda franja va de 200 a 400.
    await hover(250)
    expect(text()).toContain('FEB')
    expect(text()).toContain(fmtMoney(250))
  })

  it('cada franja selecciona su mes', async () => {
    await mount(<AreaChart data={SERIES} height={170} />)
    const casos = [[10, 'ENE'], [250, 'FEB'], [450, 'MAR'], [780, 'ABR']]
    for (const [x, label] of casos) {
      await hover(x)
      expect(text()).toContain(label)
    }
  })

  it('no hay que acertarle a la línea: el borde también cuenta', async () => {
    await mount(<AreaChart data={SERIES} height={170} />)
    await hover(-40)
    expect(text()).toContain('ENE')
    await hover(WIDTH + 200)
    expect(text()).toContain('ABR')
  })

  it('desglosa taller y combustible', async () => {
    await mount(<AreaChart data={SERIES} height={170} />)
    await hover(250)
    expect(text()).toContain(t('common.maintenance'))
    expect(text()).toContain(t('common.fuel'))
    expect(text()).toContain(fmtMoney(100))
    expect(text()).toContain(fmtMoney(150))
  })

  it('al salir el ratón se apaga', async () => {
    await mount(<AreaChart data={SERIES} height={170} />)
    await hover(250)
    expect(text()).toContain('FEB')
    await leave()
    expect(text()).not.toContain('FEB')
  })

  it('el desglose sale en el idioma activo', async () => {
    setLang('de')
    await mount(<AreaChart data={SERIES} height={170} />)
    await hover(250)
    expect(text()).toContain('Wartung')
    expect(text()).toContain('Kraftstoff')
    // el idioma lo repone beforeEach, y para entonces ya se ha
    // desmontado: cambiarlo aquí repintaría fuera de act()
  })

  it('sin desglose enseña solo el total', async () => {
    await mount(<AreaChart data={[{ label: 'BMW', total: 2480 }, { label: 'Vespa', total: 310 }]} height={170} />)
    await hover(100)
    expect(text()).toContain('BMW')
    expect(text()).toContain(fmtMoney(2480))
    expect(text()).not.toContain(t('common.fuel'))
  })

  it('en un gráfico bajo el aviso es de una línea', async () => {
    await mount(<AreaChart data={SERIES} height={70} />)
    await hover(250)
    expect(text()).toContain('FEB')
    expect(text()).toContain(fmtMoney(250))
    // el desglose no cabe: ahí no sale
    expect(text()).not.toContain(t('common.maintenance'))
  })

  it('se puede apagar la interacción', async () => {
    await mount(<AreaChart data={SERIES} height={170} interactive={false} />)
    await hover(250)
    expect(text()).not.toContain('FEB')
  })

  it('el dedo vale igual que el ratón', async () => {
    await mount(<AreaChart data={SERIES} height={170} />)
    await act(async () => {
      const ev = new Event('touchstart', { bubbles: true })
      ev.touches = [{ clientX: 450, clientY: 50 }]
      wrapper().dispatchEvent(ev)
    })
    expect(text()).toContain('MAR')
  })
})

describe('el dibujo aguanta lo que le echen', () => {
  it('los puntos del mes no son círculos del SVG', async () => {
    // Con preserveAspectRatio="none" un <circle> sale hecho un óvalo:
    // por eso los puntos van en HTML, por encima del lienzo.
    await mount(<AreaChart data={SERIES} height={170} />)
    await hover(250)
    expect(host.querySelector('svg circle')).toBeNull()
  })

  it('una serie a cero no revienta ni parte por cero', async () => {
    const cero = [{ label: 'ENE', total: 0, lower: 0, upper: 0 }, { label: 'FEB', total: 0, lower: 0, upper: 0 }]
    await mount(<AreaChart data={cero} height={170} />)
    expect(host.querySelector('svg')).toBeTruthy()
    await hover(100)
    expect(text()).toContain('ENE')
  })

  it('con un solo mes sigue dibujando', async () => {
    await mount(<AreaChart data={[{ label: 'ENE', total: 120, lower: 100, upper: 20 }]} height={170} />)
    await hover(400)
    expect(text()).toContain('ENE')
  })

  it('sin datos no lanza', async () => {
    await mount(<AreaChart data={[]} height={170} />)
    expect(host.querySelector('svg')).toBeTruthy()
  })

  it('los extremos llevan su etiqueta cuando se piden', async () => {
    await mount(<AreaChart data={SERIES} height={170} showLabels />)
    expect(text()).toContain('ENE')
    expect(text()).toContain('ABR')
  })
})

describe('toAreaData', () => {
  it('traduce los meses de monthlySpend', async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const meses = monthlySpend([{ last_date: hoy, cost: 200 }], [{ date: hoy, total_cost: 50 }])
    const data = toAreaData(meses)
    expect(data).toHaveLength(12)
    const last = data[data.length - 1]
    expect(last.total).toBe(250)
    expect(last.upper).toBe(200)
    expect(last.lower).toBe(50)
    expect(last.label).toBe(fmtMonth(meses[meses.length - 1].date))
  })

  it('el mes sale en el idioma activo', () => {
    const meses = monthlySpend([], [])
    setLang('ru')
    const ru = toAreaData(meses)[0].label
    setLang('es')
    const es = toAreaData(meses)[0].label
    expect(ru).not.toBe(es)
  })
})
