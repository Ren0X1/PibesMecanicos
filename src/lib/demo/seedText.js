import { SEED_STRINGS } from './seedStrings.js'
import { getLang, DEFAULT_LANG } from '../i18n.js'

/* Traductor de los datos de ejemplo.

   Va aparte del t() general por dos motivos: el diccionario de la
   demo no tiene por qué cargarse cuando nadie entra en la demo, y
   así queda claro de un vistazo qué texto es interfaz y qué texto
   es contenido inventado. */
export function s(key) {
  const entry = SEED_STRINGS[key]
  if (!entry) return key
  return entry[getLang()] ?? entry[DEFAULT_LANG] ?? key
}
