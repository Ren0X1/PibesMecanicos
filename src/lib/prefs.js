import { setLang, getLang, DEFAULT_LANG } from './i18n.js'
import { setThemeMode, getThemeMode, setAccentId, getAccentId, DEFAULT_ACCENT } from './theme.js'
import { updateProfile } from './api.js'
import { K } from './storageKeys.js'

/* ─────────────────────────────────────────────────────────────
   Preferencias de usuario

   Viven en dos sitios a la vez y a propósito:

   · En la BASE DE DATOS, para que te sigan a cualquier navegador.
   · En localStorage, porque el idioma y el tema hay que aplicarlos
     ANTES de saber quién eres — si esperásemos al inicio de sesión
     se vería un fogonazo blanco y un cartel en el idioma que no es.

   La base de datos manda: al entrar, lo que diga el perfil pisa lo
   que hubiera guardado en el navegador.
   ───────────────────────────────────────────────────────────── */

const onboardedKey = (id) => K.onboarded(id)

/* Un usuario tiene que contestar si nunca ha contestado. Los que ya
   existían llegan con las columnas vacías, así que entran aquí
   igual que los nuevos.

   El respaldo en el navegador cubre el hueco entre desplegar la
   aplicación y lanzar la migración 13: sin él, mientras la columna
   no exista no habría dónde anotar la respuesta y el asistente
   volvería a salir en cada sesión. */
export function needsOnboarding(user) {
  if (!user) return false
  if (user.onboarded_at) return false
  try { if (localStorage.getItem(onboardedKey(user.id)) === '1') return false } catch {}
  return true
}

export function currentPrefs() {
  return { lang: getLang(), theme: getThemeMode(), accent: getAccentId() }
}

/* Aplica sin guardar: sirve para la vista previa en vivo. */
export function applyPrefs({ lang, theme, accent }) {
  if (lang) setLang(lang)
  if (theme) setThemeMode(theme)
  if (accent) setAccentId(accent)
}

/* Vuelca al perfil lo que ya tuviera guardado el usuario. */
export function adoptProfilePrefs(user) {
  if (!user) return
  applyPrefs({
    lang: user.lang || undefined,
    theme: user.theme || undefined,
    accent: user.accent || undefined,
  })
}

/* Guarda en el perfil y aplica. Si la base de datos falla —lo más
   probable, que aún no se haya lanzado la migración 13— no se
   pierde la elección: queda aplicada y guardada en el navegador,
   y se avisa de que solo vale para este dispositivo. */
export async function savePrefs(user, prefs, { markOnboarded = false } = {}) {
  const clean = {
    lang: prefs.lang || DEFAULT_LANG,
    theme: prefs.theme || 'dark',
    accent: prefs.accent || DEFAULT_ACCENT,
  }
  applyPrefs(clean)

  const patch = { ...clean }
  if (markOnboarded) {
    patch.onboarded_at = new Date().toISOString()
    try { localStorage.setItem(onboardedKey(user.id), '1') } catch {}
  }

  try {
    const updated = await updateProfile(user.id, patch)
    return { ok: true, user: updated }
  } catch (err) {
    console.warn('No se pudieron guardar las preferencias en la base de datos:', err.message)
    return { ok: false, error: err, user: { ...user, ...patch } }
  }
}
