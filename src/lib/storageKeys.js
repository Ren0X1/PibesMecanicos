/* ─────────────────────────────────────────────────────────────
   Nombres de las claves de localStorage

   Están todos aquí y no repartidos por el código porque el
   reinicio de la demo necesita borrarlos, y una clave escrita a
   mano en dos sitios es una clave que tarde o temprano se escribe
   distinta en uno de los dos.

   Este módulo no importa nada a propósito: lo usa tanto el almacén
   de la demo como las preferencias, y cualquier dependencia
   cruzada entre ambos sería circular.
   ───────────────────────────────────────────────────────────── */

export const K = {
  demoDb: 'pm_demo_db_v1',
  theme: 'pm_theme',
  lang: 'pm_lang',
  accent: 'pm_accent',
  swipeHint: 'pm_swipe_hint_v1',
  user: 'pm_user',
  lockout: 'pm_lockout',
  snoozed: (userId) => `pm_snoozed_v1_${userId || 'anon'}`,
  onboarded: (userId) => `pm_onboarded_${userId}`,
}

export function remove(...keys) {
  for (const k of keys) {
    try { localStorage.removeItem(k) } catch {}
  }
}
