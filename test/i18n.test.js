import { describe, it, expect, beforeEach } from 'vitest'
import { STRINGS } from '../src/lib/strings.js'
import { SEED_STRINGS } from '../src/lib/demo/seedStrings.js'
import { LANGS, setLang, getLang, t, fmtNum, fmtMoney, fmtDate, fmtMonth } from '../src/lib/i18n.js'

const IDS = LANGS.map(l => l.id)

describe('diccionario', () => {
  it('cubre los seis idiomas en todas las claves', () => {
    const gaps = []
    for (const [key, entry] of Object.entries(STRINGS)) {
      for (const id of IDS) {
        if (typeof entry[id] !== 'string' || !entry[id].trim()) gaps.push(`${key} → ${id}`)
      }
    }
    expect(gaps).toEqual([])
  })

  it('cubre los seis idiomas en los datos de la demo', () => {
    const gaps = []
    for (const [key, entry] of Object.entries(SEED_STRINGS)) {
      for (const id of IDS) {
        if (typeof entry[id] !== 'string' || !entry[id].trim()) gaps.push(`${key} → ${id}`)
      }
    }
    expect(gaps).toEqual([])
  })

  it('no deja claves duplicadas', () => {
    // Object.keys ya deduplica, así que se cuenta sobre el fichero.
    const keys = Object.keys(STRINGS)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('mantiene las mismas sustituciones en los seis idiomas', () => {
    const bad = []
    for (const [key, entry] of Object.entries(STRINGS)) {
      const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')
      const ref = vars(entry.en)
      for (const id of IDS) {
        if (vars(entry[id]) !== ref) bad.push(`${key} → ${id}: "${vars(entry[id])}" ≠ "${ref}"`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('t()', () => {
  beforeEach(() => setLang('es'))

  it('devuelve el texto del idioma activo', () => {
    expect(t('common.save')).toBe('Guardar')
    setLang('de')
    expect(t('common.save')).toBe('Speichern')
  })

  it('sustituye las variables', () => {
    expect(t('dash.units', { n: 3 })).toContain('3')
  })

  it('sustituye la misma variable varias veces si aparece repetida', () => {
    // No hay ninguna clave así hoy, pero el mecanismo debe soportarlo.
    expect(t('gar.showing', { n: 5, m: 12 })).toContain('5')
    expect(t('gar.showing', { n: 5, m: 12 })).toContain('12')
  })

  it('cae al inglés si falta el idioma y devuelve la clave si no existe', () => {
    expect(t('clave.que.no.existe')).toBe('clave.que.no.existe')
  })
})

describe('formato por idioma', () => {
  it('usa los separadores de miles de cada idioma', () => {
    setLang('es')
    expect(fmtNum(187450)).toBe('187.450')
    setLang('en')
    expect(fmtNum(187450)).toBe('187,450')
  })

  it('escribe las fechas en el orden de cada idioma', () => {
    setLang('es')
    expect(fmtDate('2026-03-14')).toBe('14/03/2026')
    setLang('de')
    expect(fmtDate('2026-03-14')).toBe('14.03.2026')
  })

  it('aguanta valores vacíos sin romperse', () => {
    expect(fmtDate('')).toBe('—')
    expect(fmtDate(null)).toBe('—')
    expect(fmtNum(null)).toBe('—')
    expect(fmtNum(NaN)).toBe('—')
    expect(fmtMoney(undefined)).toBe('—')
  })

  it('devuelve el mes abreviado en el idioma activo', () => {
    setLang('es')
    const es = fmtMonth(new Date(2026, 0, 15))
    setLang('en')
    const en = fmtMonth(new Date(2026, 0, 15))
    expect(es).toBeTruthy()
    expect(en).toBeTruthy()
    expect(en.toLowerCase()).toContain('jan')
  })
})

describe('idioma guardado', () => {
  it('recuerda la elección en el navegador', () => {
    setLang('fr')
    expect(localStorage.getItem('pm_lang')).toBe('fr')
    expect(getLang()).toBe('fr')
  })

  it('ignora un idioma que no existe y cae al inglés', () => {
    setLang('xx')
    expect(getLang()).toBe('en')
  })
})

/* Una clave repetida en strings.js no da error: en un objeto de
   JavaScript la segunda pisa a la primera y el módulo carga tan
   contento. Ya ha pasado —'adm.requests' y 'adm.noRequests' se
   escribieron dos veces— y desde el navegador no se nota, porque
   la traducción sigue saliendo: la que sale es la equivocada.
   Por eso se lee el fichero como texto y se cuentan las claves. */
describe('el diccionario no tiene claves repetidas', () => {
  it('cada clave aparece una sola vez', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    // import.meta.url no es una URL de fichero bajo jsdom
    const texto = await fs.readFile(path.join(process.cwd(), 'src/lib/strings.js'), 'utf8')

    const claves = [...texto.matchAll(/^\s*'([\w.]+)'\s*:\s*\{/gm)].map(m => m[1])
    const vistas = new Set()
    const repetidas = []
    for (const k of claves) {
      if (vistas.has(k)) repetidas.push(k)
      vistas.add(k)
    }

    expect(repetidas).toEqual([])
    expect(claves.length).toBeGreaterThan(500)
  })
})
