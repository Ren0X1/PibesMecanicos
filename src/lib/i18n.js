import { useState, useEffect } from 'react'
import { STRINGS } from './strings.js'

/* ─────────────────────────────────────────────────────────────
   Idiomas

   El inglés es el idioma por defecto y también el respaldo: si a
   una traducción le falta una clave, se sirve la inglesa antes que
   enseñar el identificador crudo en pantalla.

   Al arrancar sin preferencia guardada se prueba el idioma del
   navegador; si no es ninguno de los seis, inglés.
   ───────────────────────────────────────────────────────────── */

export const LANGS = [
  { id: 'en', label: 'English', native: 'English',  locale: 'en-GB' },
  { id: 'es', label: 'Spanish', native: 'Español',  locale: 'es-ES' },
  { id: 'zh', label: 'Chinese', native: '中文',      locale: 'zh-CN' },
  { id: 'de', label: 'German',  native: 'Deutsch',  locale: 'de-DE' },
  { id: 'fr', label: 'French',  native: 'Français', locale: 'fr-FR' },
  { id: 'ru', label: 'Russian', native: 'Русский',  locale: 'ru-RU' },
]

export const DEFAULT_LANG = 'en'
const IDS = LANGS.map(l => l.id)
const LOCALES = Object.fromEntries(LANGS.map(l => [l.id, l.locale]))

function detect() {
  try {
    const saved = localStorage.getItem('pm_lang')
    if (saved && IDS.includes(saved)) return saved
  } catch {}
  try {
    for (const nav of navigator.languages || [navigator.language]) {
      const short = String(nav).slice(0, 2).toLowerCase()
      if (IDS.includes(short)) return short
    }
  } catch {}
  return DEFAULT_LANG
}

let lang = detect()
const listeners = new Set()

export function getLang() { return lang }
export function getLocale() { return LOCALES[lang] || 'en-GB' }

export function setLang(id) {
  if (!IDS.includes(id)) id = DEFAULT_LANG
  lang = id
  try { localStorage.setItem('pm_lang', id) } catch {}
  document.documentElement.setAttribute('lang', id)
  listeners.forEach(fn => fn(id))
}

export function onLangChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* Hook: repinta el componente cuando cambia el idioma. */
export function useLang() {
  const [current, setCurrent] = useState(lang)
  useEffect(() => onLangChange(setCurrent), [])
  return current
}

/* Traduce. Acepta sustituciones: t('dash.units', { n: 2 }) */
export function t(key, vars) {
  const entry = STRINGS[key]
  if (!entry) {
    if (import.meta.env?.DEV) console.warn('[i18n] clave sin texto:', key)
    return key
  }
  let s = entry[lang] ?? entry[DEFAULT_LANG] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v)
  }
  return s
}

/* ─── Formato de cifras y fechas ───────────────────────────────
   No basta con traducir las palabras: en español 187.450 lleva
   punto y en inglés coma, y las fechas van al revés. Si se dejan
   fijas se cuela una mezcla que canta más que un texto sin
   traducir. */

export function fmtNum(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtMoney(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString(getLocale(), {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  })
}

export function fmtKm(n) {
  return `${fmtNum(n)} ${t('common.km')}`
}

/* Fecha a partir de un ISO (AAAA-MM-DD). */
export function fmtDate(iso) {
  if (!iso) return '—'
  const parts = String(iso).split('-')
  if (parts.length !== 3) return iso
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* Mes abreviado, para los ejes de las gráficas. */
export function fmtMonth(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(getLocale(), { month: 'short' })
}

if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', lang)

/* En desarrollo, avisa de las claves incompletas. En producción
   no se ejecuta y no cuesta nada. */
if (import.meta.env?.DEV) {
  const gaps = []
  for (const [key, entry] of Object.entries(STRINGS)) {
    const missing = IDS.filter(id => !entry[id])
    if (missing.length) gaps.push(`${key} → falta ${missing.join(', ')}`)
  }
  if (gaps.length) console.warn(`[i18n] ${gaps.length} claves incompletas:\n` + gaps.join('\n'))
  else console.info(`[i18n] ${Object.keys(STRINGS).length} claves completas en ${IDS.length} idiomas`)
}
