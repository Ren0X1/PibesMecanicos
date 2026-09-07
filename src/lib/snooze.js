/* ─────────────────────────────────────────────────────────────
   Silenciar avisos

   Descartar un aviso no lo borra: lo esconde diez días. Pasado ese
   plazo vuelve solo. La idea es que «ya lo sé, ahora no puedo»
   no acabe convertido en «se me olvidó para siempre» — que es lo
   que pasa cuando un aviso se puede eliminar de verdad.

   Se guarda en el navegador y por usuario: silenciar en el móvil
   no silencia en el portátil, y cada uno ve lo suyo.
   ───────────────────────────────────────────────────────────── */

import { K } from './storageKeys.js'

export const SNOOZE_DAYS = 10
const DAY = 86400000

const keyFor = (userId) => K.snoozed(userId)

function read(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return {}
    const map = JSON.parse(raw)
    // De paso se limpian los que ya han cumplido su plazo.
    const now = Date.now()
    let changed = false
    for (const [id, until] of Object.entries(map)) {
      if (!until || until <= now) { delete map[id]; changed = true }
    }
    if (changed) write(userId, map)
    return map
  } catch { return {} }
}

function write(userId, map) {
  try { localStorage.setItem(keyFor(userId), JSON.stringify(map)) } catch {}
}

/* Devuelve el mapa vigente: { idDelAviso: cuándoVuelve } */
export function getSnoozed(userId) {
  return read(userId)
}

export function isSnoozed(userId, id) {
  const until = read(userId)[id]
  return Boolean(until && until > Date.now())
}

export function snooze(userId, id, days = SNOOZE_DAYS) {
  const map = read(userId)
  map[id] = Date.now() + days * DAY
  write(userId, map)
  return map[id]
}

export function unsnooze(userId, id) {
  const map = read(userId)
  delete map[id]
  write(userId, map)
}

export function unsnoozeAll(userId) {
  write(userId, {})
}

/* Días que faltan para que un aviso silenciado reaparezca. */
export function daysLeft(until) {
  return Math.max(0, Math.ceil((until - Date.now()) / DAY))
}
