import { describe, it, expect, beforeEach } from 'vitest'
import { getMaintStatus, getMaintenanceForVehicle, MAINT_TYPES, fuelLabel, transLabel, driveLabel } from '../src/lib/constants.js'
import { snooze, unsnooze, isSnoozed, getSnoozed, daysLeft, SNOOZE_DAYS } from '../src/lib/snooze.js'
import { monthlySpend } from '../src/components/SpendChart.jsx'
import { ACCENTS, DEFAULT_ACCENT, setAccentId, getAccentId, theme, setThemeMode, getThemeMode } from '../src/lib/theme.js'
import { setLang } from '../src/lib/i18n.js'

const DAY = 86400000
const iso = ms => new Date(ms).toISOString().slice(0, 10)

describe('estado de un mantenimiento', () => {
  const base = { next_km: 100000, next_date: null }

  it('vencido cuando se pasan los kilómetros', () => {
    expect(getMaintStatus({ ...base }, 100001)).toBe('overdue')
  })

  it('próximo dentro de los últimos 2.000 km', () => {
    expect(getMaintStatus({ ...base }, 98500)).toBe('warn')
  })

  it('al día si queda margen', () => {
    expect(getMaintStatus({ ...base }, 50000)).toBe('ok')
  })

  it('vencido también por fecha, aunque sobren kilómetros', () => {
    const ayer = iso(Date.now() - DAY)
    expect(getMaintStatus({ next_km: 999999, next_date: ayer }, 10)).toBe('overdue')
  })

  it('próximo por fecha dentro de 30 días', () => {
    const en10 = iso(Date.now() + 10 * DAY)
    expect(getMaintStatus({ next_km: 999999, next_date: en10 }, 10)).toBe('warn')
  })

  it('la fecha vacía no cuenta', () => {
    expect(getMaintStatus({ next_km: 999999, next_date: '' }, 10)).toBe('ok')
  })
})

describe('mantenimientos según el vehículo', () => {
  it('las bujías no salen en un diésel', () => {
    const ids = getMaintenanceForVehicle('coche', 'Diésel').map(m => m.id)
    expect(ids).not.toContain('bujias')
  })

  it('los calentadores solo salen en diésel', () => {
    expect(getMaintenanceForVehicle('coche', 'Diésel').map(m => m.id)).toContain('calentadores')
    expect(getMaintenanceForVehicle('coche', 'Gasolina').map(m => m.id)).not.toContain('calentadores')
  })

  it('la cadena solo sale en moto, y la correa solo en coche', () => {
    expect(getMaintenanceForVehicle('moto', 'Gasolina').map(m => m.id)).toContain('cadena')
    expect(getMaintenanceForVehicle('coche', 'Gasolina').map(m => m.id)).not.toContain('cadena')
    expect(getMaintenanceForVehicle('coche', 'Gasolina').map(m => m.id)).toContain('correa_dist')
  })

  it('todos los tipos tienen nombre traducible', () => {
    setLang('es')
    const sinNombre = MAINT_TYPES.filter(m => !m.name || m.name === `maint.${m.id}`)
    expect(sinNombre.map(m => m.id)).toEqual([])
  })

  it('las etiquetas de combustible y transmisión se traducen', () => {
    setLang('en')
    expect(fuelLabel('Gasolina')).toBe('Petrol')
    expect(transLabel('Automático')).toBe('Automatic')
    expect(driveLabel('ciudad')).toBe('City')
    setLang('es')
    expect(fuelLabel('Gasolina')).toBe('Gasolina')
  })
})

describe('silenciar avisos', () => {
  const U = 'u-test'

  it('oculta y devuelve el aviso pasados los días', () => {
    expect(isSnoozed(U, 'a')).toBe(false)
    snooze(U, 'a')
    expect(isSnoozed(U, 'a')).toBe(true)
  })

  it('el plazo por defecto son diez días', () => {
    const until = snooze(U, 'b')
    expect(daysLeft(until)).toBe(SNOOZE_DAYS)
  })

  it('caduca solo cuando pasa el plazo', () => {
    const map = { c: Date.now() - 1000 }
    localStorage.setItem(`pm_snoozed_v1_${U}`, JSON.stringify(map))
    expect(isSnoozed(U, 'c')).toBe(false)
    expect(getSnoozed(U).c).toBeUndefined()   // se limpia al leer
  })

  it('se puede recuperar a mano', () => {
    snooze(U, 'd')
    unsnooze(U, 'd')
    expect(isSnoozed(U, 'd')).toBe(false)
  })

  it('cada usuario tiene lo suyo', () => {
    snooze('u1', 'x')
    expect(isSnoozed('u2', 'x')).toBe(false)
  })
})

describe('gasto mensual', () => {
  it('devuelve siempre doce meses, aunque no haya datos', () => {
    const m = monthlySpend([], [])
    expect(m).toHaveLength(12)
    expect(m.every(x => x.total === 0)).toBe(true)
  })

  it('reparte cada gasto en su mes', () => {
    const hoy = iso(Date.now())
    const m = monthlySpend(
      [{ last_date: hoy, cost: 100 }],
      [{ date: hoy, total_cost: 50 }]
    )
    const ultimo = m[m.length - 1]
    expect(ultimo.maint).toBe(100)
    expect(ultimo.fuel).toBe(50)
    expect(ultimo.total).toBe(150)
  })

  it('ignora lo que cae fuera de los doce meses', () => {
    const viejo = iso(Date.now() - 400 * DAY)
    const m = monthlySpend([{ last_date: viejo, cost: 999 }], [])
    expect(m.reduce((a, b) => a + b.total, 0)).toBe(0)
  })

  it('aguanta registros sin fecha o sin coste', () => {
    const m = monthlySpend([{ cost: 10 }, { last_date: null, cost: 5 }], [{ date: iso(Date.now()) }])
    expect(m).toHaveLength(12)
    expect(Number.isNaN(m[11].total)).toBe(false)
  })
})

describe('tema y acentos', () => {
  beforeEach(() => { setAccentId(DEFAULT_ACCENT); setThemeMode('dark') })

  it('el acento por defecto es mandarina', () => {
    expect(DEFAULT_ACCENT).toBe('mandarina')
    expect(theme.accent).toBe(ACCENTS.mandarina.dark)
  })

  it('cambiar de acento cambia el color al momento', () => {
    setAccentId('turquesa')
    expect(getAccentId()).toBe('turquesa')
    expect(theme.accent).toBe(ACCENTS.turquesa.dark)
  })

  it('un acento inventado cae al de por defecto', () => {
    setAccentId('inexistente')
    expect(getAccentId()).toBe(DEFAULT_ACCENT)
  })

  it('cada acento tiene versión clara y oscura distintas', () => {
    for (const [id, a] of Object.entries(ACCENTS)) {
      expect(a.dark, id).toMatch(/^#[0-9a-f]{6}$/i)
      expect(a.light, id).toMatch(/^#[0-9a-f]{6}$/i)
      expect(a.dark, id).not.toBe(a.light)
    }
  })

  it('el tema claro cambia el fondo y el acento', () => {
    const oscuro = { bg: theme.bg, accent: theme.accent }
    setThemeMode('light')
    expect(getThemeMode()).toBe('light')
    expect(theme.bg).not.toBe(oscuro.bg)
    expect(theme.accent).not.toBe(oscuro.accent)
  })

  it('la paleta de gráficas sigue al acento', async () => {
    const { css } = await import('../src/lib/theme.js')
    setAccentId('mandarina')
    const a = css.chartColors[0]
    setAccentId('turquesa')
    expect(css.chartColors[0]).not.toBe(a)
  })
})
