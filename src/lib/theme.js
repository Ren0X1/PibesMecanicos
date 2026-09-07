/* ─────────────────────────────────────────────────────────────
   SISTEMA VISUAL "ACERO" · acento Mandarina

   Estructura de cuadro de mandos (indicadores, cifras
   monoespaciadas, fondo grafito) con disciplina de imprenta
   suiza: cero esquinas redondeadas, filetes en lugar de
   sombras y versalitas monoespaciadas en todo metadato.

   El fondo es grafito NEUTRO — sin una gota de matiz. Lo único
   que da color a la interfaz es el acento y los tres estados.
   ───────────────────────────────────────────────────────────── */

export const FONT = {
  sans: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif",
  display: "'Archivo Black', Archivo, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, Consolas, monospace",
}

// ─── Paletas ───

const dark = {
  bg: '#121213', card: '#1a1a1b', cardHover: '#212123',
  border: '#292929', rule: '#424244', input: '#0e0e0f',
  text: '#d2d2d5', white: '#ededf0', muted: '#98989d', mutedLight: '#6e6e74',
  green: '#3ddc8f', greenSoft: 'rgba(61,220,143,0.10)',
  yellow: '#f0b429', yellowSoft: 'rgba(240,180,41,0.10)',
  red: '#f4555f', redSoft: 'rgba(244,85,95,0.11)',
}

const light = {
  bg: '#f0f0ef', card: '#f9f9f8', cardHover: '#f2f2f0',
  border: '#d8d8d6', rule: '#1f1f20', input: '#ffffff',
  text: '#292929', white: '#141415', muted: '#5c5c5e', mutedLight: '#8b8b8e',
  green: '#157a49', greenSoft: 'rgba(21,122,73,0.09)',
  yellow: '#96680c', yellowSoft: 'rgba(150,104,12,0.09)',
  red: '#b8232f', redSoft: 'rgba(184,35,47,0.09)',
}

/* ─── Acentos ──────────────────────────────────────────────────
   El fondo grafito no cambia nunca: lo único que el usuario elige
   es el color de acento. Cada uno trae dos versiones, porque un
   tono que luce sobre negro es ilegible sobre papel — es el mismo
   color a la luminosidad que pide cada fondo.

   No están ni el verde menta ni el rojo cereza a propósito:
   chocaban con el verde de «al día» y el rojo de «vencido», y un
   acento que se confunde con un estado hace la interfaz peor. */

export const ACCENTS = {
  mandarina: { label: 'Mandarina', dark: '#ff7a1f', light: '#a84a0c' },
  turquesa:  { label: 'Turquesa',  dark: '#2dd4bf', light: '#0d7d70' },
  manzana:   { label: 'Manzana',   dark: '#9fd93a', light: '#5c7a12' },
  oro:       { label: 'Oro',       dark: '#eac136', light: '#8a6a10' },
  coral:     { label: 'Coral',     dark: '#ff7a68', light: '#bd4536' },
  frambuesa: { label: 'Frambuesa', dark: '#e8446f', light: '#b52350' },
  purpura:   { label: 'Púrpura',   dark: '#a855f7', light: '#6d28d9' },
  marfil:    { label: 'Marfil',    dark: '#ecdfc4', light: '#7a6a48' },
}

export const DEFAULT_ACCENT = 'mandarina'

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/* Aclara u oscurece mezclando con blanco o negro. Sirve para el
   estado «encima» sin tener que declarar un tono más por acento. */
const shift = (hex, amount) => {
  const [r, g, b] = hexToRgb(hex)
  const to = amount > 0 ? 255 : 0
  const k = Math.abs(amount)
  const mix = (c) => Math.round(c + (to - c) * k)
  return `#${[mix(r), mix(g), mix(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

let accentId = DEFAULT_ACCENT
try { accentId = localStorage.getItem('pm_accent') || DEFAULT_ACCENT } catch {}
if (!ACCENTS[accentId]) accentId = DEFAULT_ACCENT

export function getAccentId() { return accentId }

/* Quien pinte con estos colores necesita enterarse de los cambios:
   el tema vive fuera de React, así que se avisa a mano. */
const themeListeners = new Set()
export function onThemeChange(fn) {
  themeListeners.add(fn)
  return () => themeListeners.delete(fn)
}
const notifyTheme = () => themeListeners.forEach(fn => fn())

export function setAccentId(id) {
  if (!ACCENTS[id]) id = DEFAULT_ACCENT
  accentId = id
  try { localStorage.setItem('pm_accent', id) } catch {}
  notifyTheme()
}

/* Los cuatro campos de acento se calculan al vuelo a partir del
   acento elegido y del tema activo. */
function accentFields(isLight) {
  const base = ACCENTS[accentId][isLight ? 'light' : 'dark']
  const [r, g, b] = hexToRgb(base)
  return {
    accent: base,
    accentHover: shift(base, isLight ? -0.18 : 0.2),
    accentInk: isLight ? light.card : dark.bg,
    accentSoft: `rgba(${r},${g},${b},${isLight ? 0.1 : 0.13})`,
  }
}

// ─── Tema reactivo mediante Proxy ───

let mode = 'dark'
try { mode = localStorage.getItem('pm_theme') || 'dark' } catch {}

const ACCENT_KEYS = new Set(['accent', 'accentHover', 'accentInk', 'accentSoft'])

export const theme = new Proxy({}, {
  get(_, prop) {
    const isLight = mode === 'light'
    if (ACCENT_KEYS.has(prop)) return accentFields(isLight)[prop]
    return (isLight ? light : dark)[prop]
  }
})

export function getThemeMode() { return mode }

export function setThemeMode(m) {
  mode = m
  try { localStorage.setItem('pm_theme', m) } catch {}
  const palette = m === 'light' ? light : dark
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = palette.bg
  document.documentElement.setAttribute('data-theme', m)
  document.body.style.background = palette.bg
  document.body.style.color = palette.text
  notifyTheme()
}

// ─── Helpers de estilo (getters: siempre leen el tema vivo) ───

export const css = {
  get container() { return { maxWidth: 1120, margin: '0 auto', padding: '0 18px' } },
  get flex() { return { display: 'flex', alignItems: 'center', gap: 8 } },
  get flexBetween() { return { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },

  /* Ficha: filete de un píxel, sin radio y sin sombra. */
  get card() {
    return {
      background: theme.card, border: `1px solid ${theme.border}`,
      borderRadius: 0, padding: 16, marginBottom: 10,
    }
  },

  /* Botón principal: macizo, versalitas monoespaciadas. */
  btn(bg, color) {
    return {
      background: bg || theme.accent, color: color || theme.accentInk,
      border: 'none', borderRadius: 0, padding: '9px 14px',
      fontFamily: FONT.mono, fontSize: 10, fontWeight: 500,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
      transition: 'background .15s, opacity .15s', whiteSpace: 'nowrap',
    }
  },
  btnSm(bg, color) {
    return {
      background: bg || theme.accent, color: color || theme.accentInk,
      border: 'none', borderRadius: 0, padding: '6px 9px',
      fontFamily: FONT.mono, fontSize: 9, fontWeight: 500,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
      whiteSpace: 'nowrap',
    }
  },
  get btnOutline() {
    return {
      background: 'transparent', color: theme.muted,
      border: `1px solid ${theme.border}`, borderRadius: 0, padding: '9px 14px',
      fontFamily: FONT.mono, fontSize: 10, fontWeight: 500,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
      whiteSpace: 'nowrap',
    }
  },

  get input() {
    return {
      background: theme.input, color: theme.text,
      border: `1px solid ${theme.border}`, borderRadius: 0,
      padding: '10px 12px', width: '100%', fontSize: 13.5,
      fontFamily: FONT.sans, outline: 'none', boxSizing: 'border-box',
    }
  },
  get select() {
    return {
      background: theme.input, color: theme.text,
      border: `1px solid ${theme.border}`, borderRadius: 0,
      padding: '10px 12px', width: '100%', fontSize: 13.5,
      fontFamily: FONT.sans, outline: 'none', boxSizing: 'border-box',
    }
  },

  /* La versalita monoespaciada: cose todo el sistema. */
  get lbl() {
    return {
      fontFamily: FONT.mono, fontSize: 9, fontWeight: 500,
      letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.mutedLight,
    }
  },
  get label() { return { ...css.lbl, display: 'block', marginBottom: 6, color: theme.muted } },

  /* Titulares en Archivo Black, versales, muy cerrados de interletrado. */
  get h1() { return { fontFamily: FONT.display, fontSize: 24, letterSpacing: '-0.035em', textTransform: 'uppercase', lineHeight: 1, margin: 0, color: theme.white } },
  get h2() { return { fontFamily: FONT.display, fontSize: 18, letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 1.05, margin: 0, color: theme.white } },
  get h3() { return { fontFamily: FONT.display, fontSize: 14.5, letterSpacing: '-0.025em', textTransform: 'uppercase', lineHeight: 1.1, margin: 0, color: theme.white } },
  get subtitle() { return { ...css.lbl, margin: 0, marginTop: 6 } },

  /* Distintivo: rectángulo con filete, nunca una píldora. */
  badge(bg, color) {
    return {
      background: bg, color, border: `1px solid ${color}40`,
      padding: '3px 7px', borderRadius: 0,
      fontFamily: FONT.mono, fontSize: 8.5, fontWeight: 500,
      letterSpacing: '0.13em', textTransform: 'uppercase',
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
    }
  },

  /* Cifras: siempre monoespaciadas y de ancho fijo. */
  get num() { return { fontFamily: FONT.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' } },

  get grid2() { return { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
  get overlay() { return { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 } },
  get modal() { return { background: theme.card, borderRadius: 0, border: `1px solid ${theme.rule}`, padding: 22, width: '100%', maxWidth: 540, maxHeight: '86vh', overflowY: 'auto' } },

  get th() { return { ...css.lbl, letterSpacing: '0.17em', padding: '10px 9px 8px', textAlign: 'left', borderBottom: `1px solid ${theme.rule}` } },
  get td() { return { padding: '10px 9px', borderBottom: `1px solid ${theme.border}`, fontSize: 13 } },
}
