import { useState, useEffect } from 'react'

/* ─────────────────────────────────────────────────────────────
   Idiomas

   El inglés es el idioma por defecto y también el respaldo: si a
   una traducción le falta una clave, se sirve la inglesa antes que
   enseñar el identificador crudo en pantalla.

   Al arrancar sin preferencia guardada se prueba el idioma del
   navegador; si no es ninguno de los seis, inglés.
   ───────────────────────────────────────────────────────────── */

export const LANGS = [
  { id: 'en', label: 'English',  native: 'English'  },
  { id: 'es', label: 'Spanish',  native: 'Español'  },
  { id: 'zh', label: 'Chinese',  native: '中文'      },
  { id: 'de', label: 'German',   native: 'Deutsch'  },
  { id: 'fr', label: 'French',   native: 'Français' },
  { id: 'ru', label: 'Russian',  native: 'Русский'  },
]

export const DEFAULT_LANG = 'en'
const IDS = LANGS.map(l => l.id)

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
  const table = DICT[lang] || DICT[DEFAULT_LANG]
  let s = table[key]
  if (s == null) s = DICT[DEFAULT_LANG][key]
  if (s == null) return key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
  }
  return s
}

/* Plural sencillo: dos formas, suficiente para lo que hay aquí.
   El ruso tiene tres, así que se resuelve con su propia regla. */
export function plural(n, one, many, few) {
  if (lang === 'ru') {
    const m10 = n % 10, m100 = n % 100
    if (m10 === 1 && m100 !== 11) return one
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few || many
    return many
  }
  return n === 1 ? one : many
}

if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', lang)

// ═══════════════════════════════════════════════════════════════
//  DICCIONARIO
// ═══════════════════════════════════════════════════════════════

const DICT = {

  // ─────────────────────────────── INGLÉS (base y respaldo)
  en: {
    'common.save': 'Save', 'common.saving': 'Saving', 'common.cancel': 'Cancel',
    'common.delete': 'Delete', 'common.edit': 'Edit', 'common.add': 'Add',
    'common.close': 'Close', 'common.back': 'Back', 'common.next': 'Next',
    'common.done': 'Done', 'common.loading': 'Loading', 'common.optional': 'Optional',
    'common.none': 'None', 'common.error': 'Error',

    'nav.vehicles': 'Vehicles', 'nav.summary': 'Summary', 'nav.alerts': 'Alerts',
    'nav.groups': 'Groups', 'nav.workshops': 'Workshops', 'nav.admin': 'Admin',
    'nav.logout': 'Log out', 'nav.settings': 'Settings',
    'nav.lightMode': 'Light mode', 'nav.darkMode': 'Dark mode',

    'login.tagline': 'The lads’ garage',
    'login.user': 'Username', 'login.userPh': 'username',
    'login.pin': 'PIN', 'login.enter': 'Sign in', 'login.entering': 'Signing in',
    'login.errEmpty': 'Enter your username and PIN',
    'login.errCreds': 'Wrong username or PIN',
    'login.errTooMany': 'Too many attempts. Wait {time}',
    'login.locked': 'Locked',
    'login.noDb': 'No database is configured in this environment. Open the demo to see it working.',
    'login.demoBody': 'Just want a look around? The demo comes with two vehicles and their full history, and you can change anything — no account needed, and nothing leaves your browser.',
    'login.demoBtn': 'Open the demo',

    'onb.welcome': 'Welcome',
    'onb.intro': 'Three quick questions before you start. You can change all of it later in Settings.',
    'onb.langQ': 'What language do you prefer?',
    'onb.themeQ': 'Light or dark?',
    'onb.accentQ': 'Pick your accent colour',
    'onb.accentNote': 'The background stays graphite. Only the accent changes.',
    'onb.dark': 'Dark', 'onb.light': 'Light',
    'onb.darkNote': 'Graphite background. Easier at night.',
    'onb.lightNote': 'Paper background. Easier in daylight.',
    'onb.finish': 'Start',
    'onb.saved': 'Preferences saved',
    'onb.step': 'Step {n} of 3',
    'onb.preview': 'Preview',

    'set.title': 'Settings',
    'set.language': 'Language', 'set.theme': 'Theme', 'set.accent': 'Accent colour',
    'set.saved': 'Preferences saved',
    'set.savedLocal': 'Saved on this device only — the database could not be reached',

    'dash.title': 'My vehicles',
    'dash.noneYet': 'None registered',
    'dash.units': '{n} vehicles', 'dash.unit': '1 vehicle',
    'dash.needAttention': '{n} need attention', 'dash.needAttention1': '1 needs attention',
    'dash.allGood': 'all up to date',
    'dash.empty': 'You have no vehicles yet',
    'dash.addFirst': 'Add your first',
    'dash.deleteConfirm': 'Delete this vehicle and all of its data?',
    'dash.added': 'Vehicle added', 'dash.deleted': 'Vehicle deleted',
    'dash.new': 'New vehicle',
    'dash.type': 'Vehicle type', 'dash.plate': 'Plate', 'dash.brand': 'Make',
    'dash.model': 'Model', 'dash.year': 'Year', 'dash.transmission': 'Transmission',
    'dash.fuel': 'Fuel', 'dash.currentKm': 'Current km', 'dash.notes': 'Notes',
    'dash.parts': '{n} parts',
    'dash.overdue': '{n} overdue', 'dash.upcoming': '{n} due soon',
    'dash.upToDate': 'All up to date', 'dash.noMaint': 'No maintenance yet',
    'dash.itvExpired': 'Inspection expired', 'dash.itvNegative': 'Inspection failed',
    'dash.itvDays': 'Inspection {n} d',
    'dash.gaugeLabel': 'State',

    'demo.banner': 'Demo mode — sample data. Change anything you like: nothing leaves your browser.',
    'demo.bannerShort': 'Demo · sample data',
    'demo.reset': 'Reset',
    'demo.resetConfirm': 'Back to the sample data? Anything you changed in the demo will be lost.',
    'demo.resetDone': 'Demo reset',
    'demo.exit': 'Leave the demo',

    'notif.title': 'Notifications',
    'notif.empty': 'Everything is up to date',
    'notif.urgent': 'Urgent', 'notif.attention': 'Due soon', 'notif.info': 'Info',
    'notif.dismiss': 'Hide for {n} days',
    'notif.hidden': '{n} hidden',
    'notif.showHidden': 'Show hidden',
    'notif.hideHidden': 'Hide them again',
    'notif.backIn': 'Back in {n} d',
    'notif.restore': 'Show again now',

    'swipe.hint': 'Swipe to change section',
  },

  // ─────────────────────────────── ESPAÑOL
  es: {
    'common.save': 'Guardar', 'common.saving': 'Guardando', 'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar', 'common.edit': 'Editar', 'common.add': 'Añadir',
    'common.close': 'Cerrar', 'common.back': 'Volver', 'common.next': 'Siguiente',
    'common.done': 'Listo', 'common.loading': 'Cargando', 'common.optional': 'Opcional',
    'common.none': 'Ninguno', 'common.error': 'Error',

    'nav.vehicles': 'Vehículos', 'nav.summary': 'Resumen', 'nav.alerts': 'Avisos',
    'nav.groups': 'Grupos', 'nav.workshops': 'Talleres', 'nav.admin': 'Admin',
    'nav.logout': 'Salir', 'nav.settings': 'Ajustes',
    'nav.lightMode': 'Modo claro', 'nav.darkMode': 'Modo oscuro',

    'login.tagline': 'El taller de los pibes',
    'login.user': 'Usuario', 'login.userPh': 'usuario',
    'login.pin': 'PIN', 'login.enter': 'Entrar', 'login.entering': 'Entrando',
    'login.errEmpty': 'Introduce usuario y PIN',
    'login.errCreds': 'Usuario o PIN incorrecto',
    'login.errTooMany': 'Demasiados intentos. Espera {time}',
    'login.locked': 'Bloqueado',
    'login.noDb': 'No hay base de datos configurada en este entorno. Entra en la demo para verla funcionando.',
    'login.demoBody': '¿Solo quieres echar un vistazo? La demo trae dos vehículos con su historial y se puede tocar todo — no hace falta cuenta y nada sale de tu navegador.',
    'login.demoBtn': 'Entrar en la demo',

    'onb.welcome': 'Bienvenido',
    'onb.intro': 'Tres preguntas rápidas antes de empezar. Todo esto se puede cambiar luego en Ajustes.',
    'onb.langQ': '¿En qué idioma lo prefieres?',
    'onb.themeQ': '¿Claro u oscuro?',
    'onb.accentQ': 'Elige tu color de acento',
    'onb.accentNote': 'El fondo sigue siendo grafito. Lo único que cambia es el acento.',
    'onb.dark': 'Oscuro', 'onb.light': 'Claro',
    'onb.darkNote': 'Fondo grafito. Más cómodo de noche.',
    'onb.lightNote': 'Fondo papel. Más cómodo con luz.',
    'onb.finish': 'Empezar',
    'onb.saved': 'Preferencias guardadas',
    'onb.step': 'Paso {n} de 3',
    'onb.preview': 'Vista previa',

    'set.title': 'Ajustes',
    'set.language': 'Idioma', 'set.theme': 'Tema', 'set.accent': 'Color de acento',
    'set.saved': 'Preferencias guardadas',
    'set.savedLocal': 'Guardado solo en este dispositivo — no se pudo llegar a la base de datos',

    'dash.title': 'Mis vehículos',
    'dash.noneYet': 'Ninguno registrado',
    'dash.units': '{n} unidades', 'dash.unit': '1 unidad',
    'dash.needAttention': '{n} requieren atención', 'dash.needAttention1': '1 requiere atención',
    'dash.allGood': 'todo al día',
    'dash.empty': 'Aún no tienes vehículos registrados',
    'dash.addFirst': 'Añadir el primero',
    'dash.deleteConfirm': '¿Eliminar este vehículo y todos sus datos?',
    'dash.added': 'Vehículo añadido', 'dash.deleted': 'Vehículo eliminado',
    'dash.new': 'Nuevo vehículo',
    'dash.type': 'Tipo de vehículo', 'dash.plate': 'Matrícula', 'dash.brand': 'Marca',
    'dash.model': 'Modelo', 'dash.year': 'Año', 'dash.transmission': 'Transmisión',
    'dash.fuel': 'Combustible', 'dash.currentKm': 'Km actuales', 'dash.notes': 'Notas',
    'dash.parts': '{n} recambios',
    'dash.overdue': '{n} vencidos', 'dash.upcoming': '{n} próximos',
    'dash.upToDate': 'Todo al día', 'dash.noMaint': 'Sin mantenimientos',
    'dash.itvExpired': 'ITV caducada', 'dash.itvNegative': 'ITV negativa',
    'dash.itvDays': 'ITV {n} d',
    'dash.gaugeLabel': 'Estado',

    'demo.banner': 'Modo demo — datos de ejemplo. Puedes tocar lo que quieras: nada sale de tu navegador.',
    'demo.bannerShort': 'Demo · datos de ejemplo',
    'demo.reset': 'Reiniciar',
    'demo.resetConfirm': '¿Volver a los datos de ejemplo? Se perderán los cambios que hayas hecho en la demo.',
    'demo.resetDone': 'Demo reiniciada',
    'demo.exit': 'Salir de la demo',

    'notif.title': 'Notificaciones',
    'notif.empty': 'Todo al día',
    'notif.urgent': 'Urgente', 'notif.attention': 'Atención', 'notif.info': 'Info',
    'notif.dismiss': 'Ocultar {n} días',
    'notif.hidden': '{n} ocultas',
    'notif.showHidden': 'Ver ocultas',
    'notif.hideHidden': 'Volver a esconderlas',
    'notif.backIn': 'Vuelve en {n} d',
    'notif.restore': 'Mostrar ya',

    'swipe.hint': 'Desliza para cambiar de sección',
  },

  // ─────────────────────────────── 中文
  zh: {
    'common.save': '保存', 'common.saving': '保存中', 'common.cancel': '取消',
    'common.delete': '删除', 'common.edit': '编辑', 'common.add': '添加',
    'common.close': '关闭', 'common.back': '返回', 'common.next': '下一步',
    'common.done': '完成', 'common.loading': '加载中', 'common.optional': '可选',
    'common.none': '无', 'common.error': '错误',

    'nav.vehicles': '车辆', 'nav.summary': '总览', 'nav.alerts': '提醒',
    'nav.groups': '车友群', 'nav.workshops': '修理厂', 'nav.admin': '管理',
    'nav.logout': '退出', 'nav.settings': '设置',
    'nav.lightMode': '浅色模式', 'nav.darkMode': '深色模式',

    'login.tagline': '哥们儿的车库',
    'login.user': '用户名', 'login.userPh': '用户名',
    'login.pin': 'PIN 码', 'login.enter': '登录', 'login.entering': '登录中',
    'login.errEmpty': '请输入用户名和 PIN 码',
    'login.errCreds': '用户名或 PIN 码错误',
    'login.errTooMany': '尝试次数过多，请等待 {time}',
    'login.locked': '已锁定',
    'login.noDb': '当前环境未配置数据库。可以打开演示版查看效果。',
    'login.demoBody': '只想看看？演示版包含两辆车及其完整记录，可以随意修改 — 无需账号，数据也不会离开你的浏览器。',
    'login.demoBtn': '打开演示版',

    'onb.welcome': '欢迎',
    'onb.intro': '开始前有三个简单的问题。之后都可以在设置里修改。',
    'onb.langQ': '你想使用哪种语言？',
    'onb.themeQ': '浅色还是深色？',
    'onb.accentQ': '选择你的强调色',
    'onb.accentNote': '背景始终是石墨灰，只有强调色会变。',
    'onb.dark': '深色', 'onb.light': '浅色',
    'onb.darkNote': '石墨灰背景，夜间更舒适。',
    'onb.lightNote': '纸白背景，白天更舒适。',
    'onb.finish': '开始使用',
    'onb.saved': '偏好已保存',
    'onb.step': '第 {n} 步，共 3 步',
    'onb.preview': '预览',

    'set.title': '设置',
    'set.language': '语言', 'set.theme': '主题', 'set.accent': '强调色',
    'set.saved': '偏好已保存',
    'set.savedLocal': '仅保存在本设备 — 无法连接到数据库',

    'dash.title': '我的车辆',
    'dash.noneYet': '尚未登记',
    'dash.units': '{n} 辆车', 'dash.unit': '1 辆车',
    'dash.needAttention': '{n} 辆需要处理', 'dash.needAttention1': '1 辆需要处理',
    'dash.allGood': '一切正常',
    'dash.empty': '你还没有登记任何车辆',
    'dash.addFirst': '添加第一辆',
    'dash.deleteConfirm': '删除这辆车及其全部数据？',
    'dash.added': '车辆已添加', 'dash.deleted': '车辆已删除',
    'dash.new': '新增车辆',
    'dash.type': '车辆类型', 'dash.plate': '车牌', 'dash.brand': '品牌',
    'dash.model': '型号', 'dash.year': '年份', 'dash.transmission': '变速箱',
    'dash.fuel': '燃料', 'dash.currentKm': '当前里程', 'dash.notes': '备注',
    'dash.parts': '{n} 个配件',
    'dash.overdue': '{n} 项已逾期', 'dash.upcoming': '{n} 项即将到期',
    'dash.upToDate': '全部正常', 'dash.noMaint': '暂无保养记录',
    'dash.itvExpired': '年检已过期', 'dash.itvNegative': '年检未通过',
    'dash.itvDays': '年检剩 {n} 天',
    'dash.gaugeLabel': '状态',

    'demo.banner': '演示模式 — 示例数据。随便改，什么都不会离开你的浏览器。',
    'demo.bannerShort': '演示 · 示例数据',
    'demo.reset': '重置',
    'demo.resetConfirm': '恢复示例数据？你在演示中所做的修改将会丢失。',
    'demo.resetDone': '演示已重置',
    'demo.exit': '退出演示',

    'notif.title': '通知',
    'notif.empty': '一切正常',
    'notif.urgent': '紧急', 'notif.attention': '即将到期', 'notif.info': '提示',
    'notif.dismiss': '隐藏 {n} 天',
    'notif.hidden': '已隐藏 {n} 条',
    'notif.showHidden': '查看已隐藏',
    'notif.hideHidden': '重新隐藏',
    'notif.backIn': '{n} 天后重现',
    'notif.restore': '立即显示',

    'swipe.hint': '左右滑动切换页面',
  },

  // ─────────────────────────────── DEUTSCH
  de: {
    'common.save': 'Speichern', 'common.saving': 'Wird gespeichert', 'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen', 'common.edit': 'Bearbeiten', 'common.add': 'Hinzufügen',
    'common.close': 'Schließen', 'common.back': 'Zurück', 'common.next': 'Weiter',
    'common.done': 'Fertig', 'common.loading': 'Wird geladen', 'common.optional': 'Optional',
    'common.none': 'Keine', 'common.error': 'Fehler',

    'nav.vehicles': 'Fahrzeuge', 'nav.summary': 'Übersicht', 'nav.alerts': 'Hinweise',
    'nav.groups': 'Gruppen', 'nav.workshops': 'Werkstätten', 'nav.admin': 'Verwaltung',
    'nav.logout': 'Abmelden', 'nav.settings': 'Einstellungen',
    'nav.lightMode': 'Heller Modus', 'nav.darkMode': 'Dunkler Modus',

    'login.tagline': 'Die Garage der Jungs',
    'login.user': 'Benutzername', 'login.userPh': 'benutzername',
    'login.pin': 'PIN', 'login.enter': 'Anmelden', 'login.entering': 'Anmeldung läuft',
    'login.errEmpty': 'Benutzername und PIN eingeben',
    'login.errCreds': 'Benutzername oder PIN falsch',
    'login.errTooMany': 'Zu viele Versuche. Warte {time}',
    'login.locked': 'Gesperrt',
    'login.noDb': 'In dieser Umgebung ist keine Datenbank eingerichtet. Öffne die Demo, um sie in Aktion zu sehen.',
    'login.demoBody': 'Nur mal reinschauen? Die Demo bringt zwei Fahrzeuge samt Historie mit und lässt sich komplett bearbeiten — ohne Konto, und nichts verlässt deinen Browser.',
    'login.demoBtn': 'Demo öffnen',

    'onb.welcome': 'Willkommen',
    'onb.intro': 'Drei kurze Fragen, bevor es losgeht. Alles lässt sich später in den Einstellungen ändern.',
    'onb.langQ': 'Welche Sprache möchtest du?',
    'onb.themeQ': 'Hell oder dunkel?',
    'onb.accentQ': 'Wähle deine Akzentfarbe',
    'onb.accentNote': 'Der Hintergrund bleibt Graphit. Nur der Akzent ändert sich.',
    'onb.dark': 'Dunkel', 'onb.light': 'Hell',
    'onb.darkNote': 'Graphit-Hintergrund. Angenehmer bei Nacht.',
    'onb.lightNote': 'Papier-Hintergrund. Angenehmer bei Tageslicht.',
    'onb.finish': 'Los geht’s',
    'onb.saved': 'Einstellungen gespeichert',
    'onb.step': 'Schritt {n} von 3',
    'onb.preview': 'Vorschau',

    'set.title': 'Einstellungen',
    'set.language': 'Sprache', 'set.theme': 'Erscheinungsbild', 'set.accent': 'Akzentfarbe',
    'set.saved': 'Einstellungen gespeichert',
    'set.savedLocal': 'Nur auf diesem Gerät gespeichert — die Datenbank war nicht erreichbar',

    'dash.title': 'Meine Fahrzeuge',
    'dash.noneYet': 'Noch keine erfasst',
    'dash.units': '{n} Fahrzeuge', 'dash.unit': '1 Fahrzeug',
    'dash.needAttention': '{n} brauchen Aufmerksamkeit', 'dash.needAttention1': '1 braucht Aufmerksamkeit',
    'dash.allGood': 'alles aktuell',
    'dash.empty': 'Du hast noch keine Fahrzeuge erfasst',
    'dash.addFirst': 'Erstes hinzufügen',
    'dash.deleteConfirm': 'Dieses Fahrzeug und alle seine Daten löschen?',
    'dash.added': 'Fahrzeug hinzugefügt', 'dash.deleted': 'Fahrzeug gelöscht',
    'dash.new': 'Neues Fahrzeug',
    'dash.type': 'Fahrzeugtyp', 'dash.plate': 'Kennzeichen', 'dash.brand': 'Marke',
    'dash.model': 'Modell', 'dash.year': 'Baujahr', 'dash.transmission': 'Getriebe',
    'dash.fuel': 'Kraftstoff', 'dash.currentKm': 'Aktueller km-Stand', 'dash.notes': 'Notizen',
    'dash.parts': '{n} Ersatzteile',
    'dash.overdue': '{n} überfällig', 'dash.upcoming': '{n} stehen an',
    'dash.upToDate': 'Alles aktuell', 'dash.noMaint': 'Noch keine Wartung',
    'dash.itvExpired': 'HU abgelaufen', 'dash.itvNegative': 'HU nicht bestanden',
    'dash.itvDays': 'HU {n} T',
    'dash.gaugeLabel': 'Zustand',

    'demo.banner': 'Demomodus — Beispieldaten. Ändere ruhig alles: nichts verlässt deinen Browser.',
    'demo.bannerShort': 'Demo · Beispieldaten',
    'demo.reset': 'Zurücksetzen',
    'demo.resetConfirm': 'Zurück zu den Beispieldaten? Deine Änderungen in der Demo gehen verloren.',
    'demo.resetDone': 'Demo zurückgesetzt',
    'demo.exit': 'Demo verlassen',

    'notif.title': 'Benachrichtigungen',
    'notif.empty': 'Alles aktuell',
    'notif.urgent': 'Dringend', 'notif.attention': 'Steht an', 'notif.info': 'Info',
    'notif.dismiss': 'Für {n} Tage ausblenden',
    'notif.hidden': '{n} ausgeblendet',
    'notif.showHidden': 'Ausgeblendete anzeigen',
    'notif.hideHidden': 'Wieder ausblenden',
    'notif.backIn': 'Kommt in {n} T zurück',
    'notif.restore': 'Jetzt wieder anzeigen',

    'swipe.hint': 'Wischen, um den Bereich zu wechseln',
  },

  // ─────────────────────────────── FRANÇAIS
  fr: {
    'common.save': 'Enregistrer', 'common.saving': 'Enregistrement', 'common.cancel': 'Annuler',
    'common.delete': 'Supprimer', 'common.edit': 'Modifier', 'common.add': 'Ajouter',
    'common.close': 'Fermer', 'common.back': 'Retour', 'common.next': 'Suivant',
    'common.done': 'Terminé', 'common.loading': 'Chargement', 'common.optional': 'Facultatif',
    'common.none': 'Aucun', 'common.error': 'Erreur',

    'nav.vehicles': 'Véhicules', 'nav.summary': 'Résumé', 'nav.alerts': 'Alertes',
    'nav.groups': 'Groupes', 'nav.workshops': 'Garages', 'nav.admin': 'Admin',
    'nav.logout': 'Déconnexion', 'nav.settings': 'Réglages',
    'nav.lightMode': 'Mode clair', 'nav.darkMode': 'Mode sombre',

    'login.tagline': 'Le garage des copains',
    'login.user': 'Identifiant', 'login.userPh': 'identifiant',
    'login.pin': 'Code PIN', 'login.enter': 'Se connecter', 'login.entering': 'Connexion',
    'login.errEmpty': 'Saisis ton identifiant et ton PIN',
    'login.errCreds': 'Identifiant ou PIN incorrect',
    'login.errTooMany': 'Trop de tentatives. Attends {time}',
    'login.locked': 'Bloqué',
    'login.noDb': 'Aucune base de données n’est configurée dans cet environnement. Ouvre la démo pour la voir fonctionner.',
    'login.demoBody': 'Juste envie de jeter un œil ? La démo contient deux véhicules et tout leur historique, et tout est modifiable — sans compte, et rien ne quitte ton navigateur.',
    'login.demoBtn': 'Ouvrir la démo',

    'onb.welcome': 'Bienvenue',
    'onb.intro': 'Trois questions rapides avant de commencer. Tout est modifiable ensuite dans les Réglages.',
    'onb.langQ': 'Quelle langue préfères-tu ?',
    'onb.themeQ': 'Clair ou sombre ?',
    'onb.accentQ': 'Choisis ta couleur d’accent',
    'onb.accentNote': 'Le fond reste graphite. Seul l’accent change.',
    'onb.dark': 'Sombre', 'onb.light': 'Clair',
    'onb.darkNote': 'Fond graphite. Plus confortable la nuit.',
    'onb.lightNote': 'Fond papier. Plus confortable en plein jour.',
    'onb.finish': 'Commencer',
    'onb.saved': 'Préférences enregistrées',
    'onb.step': 'Étape {n} sur 3',
    'onb.preview': 'Aperçu',

    'set.title': 'Réglages',
    'set.language': 'Langue', 'set.theme': 'Thème', 'set.accent': 'Couleur d’accent',
    'set.saved': 'Préférences enregistrées',
    'set.savedLocal': 'Enregistré sur cet appareil uniquement — base de données injoignable',

    'dash.title': 'Mes véhicules',
    'dash.noneYet': 'Aucun enregistré',
    'dash.units': '{n} véhicules', 'dash.unit': '1 véhicule',
    'dash.needAttention': '{n} demandent attention', 'dash.needAttention1': '1 demande attention',
    'dash.allGood': 'tout est à jour',
    'dash.empty': 'Tu n’as encore aucun véhicule',
    'dash.addFirst': 'Ajouter le premier',
    'dash.deleteConfirm': 'Supprimer ce véhicule et toutes ses données ?',
    'dash.added': 'Véhicule ajouté', 'dash.deleted': 'Véhicule supprimé',
    'dash.new': 'Nouveau véhicule',
    'dash.type': 'Type de véhicule', 'dash.plate': 'Immatriculation', 'dash.brand': 'Marque',
    'dash.model': 'Modèle', 'dash.year': 'Année', 'dash.transmission': 'Boîte de vitesses',
    'dash.fuel': 'Carburant', 'dash.currentKm': 'Km actuels', 'dash.notes': 'Notes',
    'dash.parts': '{n} pièces',
    'dash.overdue': '{n} en retard', 'dash.upcoming': '{n} à prévoir',
    'dash.upToDate': 'Tout est à jour', 'dash.noMaint': 'Aucun entretien',
    'dash.itvExpired': 'Contrôle technique expiré', 'dash.itvNegative': 'Contrôle non validé',
    'dash.itvDays': 'Contrôle {n} j',
    'dash.gaugeLabel': 'État',

    'demo.banner': 'Mode démo — données d’exemple. Touche à tout : rien ne quitte ton navigateur.',
    'demo.bannerShort': 'Démo · données d’exemple',
    'demo.reset': 'Réinitialiser',
    'demo.resetConfirm': 'Revenir aux données d’exemple ? Tes modifications dans la démo seront perdues.',
    'demo.resetDone': 'Démo réinitialisée',
    'demo.exit': 'Quitter la démo',

    'notif.title': 'Notifications',
    'notif.empty': 'Tout est à jour',
    'notif.urgent': 'Urgent', 'notif.attention': 'À prévoir', 'notif.info': 'Info',
    'notif.dismiss': 'Masquer {n} jours',
    'notif.hidden': '{n} masquées',
    'notif.showHidden': 'Voir les masquées',
    'notif.hideHidden': 'Les masquer à nouveau',
    'notif.backIn': 'Revient dans {n} j',
    'notif.restore': 'Réafficher maintenant',

    'swipe.hint': 'Balaie pour changer de section',
  },

  // ─────────────────────────────── РУССКИЙ
  ru: {
    'common.save': 'Сохранить', 'common.saving': 'Сохранение', 'common.cancel': 'Отмена',
    'common.delete': 'Удалить', 'common.edit': 'Изменить', 'common.add': 'Добавить',
    'common.close': 'Закрыть', 'common.back': 'Назад', 'common.next': 'Далее',
    'common.done': 'Готово', 'common.loading': 'Загрузка', 'common.optional': 'Необязательно',
    'common.none': 'Нет', 'common.error': 'Ошибка',

    'nav.vehicles': 'Транспорт', 'nav.summary': 'Сводка', 'nav.alerts': 'Напоминания',
    'nav.groups': 'Группы', 'nav.workshops': 'Мастерские', 'nav.admin': 'Админ',
    'nav.logout': 'Выйти', 'nav.settings': 'Настройки',
    'nav.lightMode': 'Светлая тема', 'nav.darkMode': 'Тёмная тема',

    'login.tagline': 'Гараж своих',
    'login.user': 'Имя пользователя', 'login.userPh': 'пользователь',
    'login.pin': 'PIN-код', 'login.enter': 'Войти', 'login.entering': 'Вход',
    'login.errEmpty': 'Введите имя пользователя и PIN',
    'login.errCreds': 'Неверное имя пользователя или PIN',
    'login.errTooMany': 'Слишком много попыток. Подождите {time}',
    'login.locked': 'Заблокировано',
    'login.noDb': 'В этой среде база данных не настроена. Откройте демоверсию, чтобы посмотреть, как всё работает.',
    'login.demoBody': 'Просто хотите посмотреть? В демоверсии два автомобиля со всей историей, и менять можно что угодно — аккаунт не нужен, и данные не покидают ваш браузер.',
    'login.demoBtn': 'Открыть демоверсию',

    'onb.welcome': 'Добро пожаловать',
    'onb.intro': 'Три быстрых вопроса перед началом. Всё это потом можно изменить в настройках.',
    'onb.langQ': 'Какой язык предпочитаете?',
    'onb.themeQ': 'Светлая или тёмная?',
    'onb.accentQ': 'Выберите акцентный цвет',
    'onb.accentNote': 'Фон остаётся графитовым. Меняется только акцент.',
    'onb.dark': 'Тёмная', 'onb.light': 'Светлая',
    'onb.darkNote': 'Графитовый фон. Удобнее ночью.',
    'onb.lightNote': 'Бумажный фон. Удобнее при дневном свете.',
    'onb.finish': 'Начать',
    'onb.saved': 'Настройки сохранены',
    'onb.step': 'Шаг {n} из 3',
    'onb.preview': 'Предпросмотр',

    'set.title': 'Настройки',
    'set.language': 'Язык', 'set.theme': 'Тема', 'set.accent': 'Акцентный цвет',
    'set.saved': 'Настройки сохранены',
    'set.savedLocal': 'Сохранено только на этом устройстве — база данных недоступна',

    'dash.title': 'Мой транспорт',
    'dash.noneYet': 'Ничего не добавлено',
    'dash.units': '{n} машин', 'dash.unit': '1 машина',
    'dash.needAttention': '{n} требуют внимания', 'dash.needAttention1': '1 требует внимания',
    'dash.allGood': 'всё в порядке',
    'dash.empty': 'Вы ещё не добавили ни одной машины',
    'dash.addFirst': 'Добавить первую',
    'dash.deleteConfirm': 'Удалить эту машину и все её данные?',
    'dash.added': 'Машина добавлена', 'dash.deleted': 'Машина удалена',
    'dash.new': 'Новая машина',
    'dash.type': 'Тип транспорта', 'dash.plate': 'Госномер', 'dash.brand': 'Марка',
    'dash.model': 'Модель', 'dash.year': 'Год', 'dash.transmission': 'Коробка передач',
    'dash.fuel': 'Топливо', 'dash.currentKm': 'Текущий пробег', 'dash.notes': 'Заметки',
    'dash.parts': 'Запчастей: {n}',
    'dash.overdue': 'Просрочено: {n}', 'dash.upcoming': 'Скоро: {n}',
    'dash.upToDate': 'Всё в порядке', 'dash.noMaint': 'Обслуживания нет',
    'dash.itvExpired': 'Техосмотр просрочен', 'dash.itvNegative': 'Техосмотр не пройден',
    'dash.itvDays': 'Техосмотр {n} дн.',
    'dash.gaugeLabel': 'Состояние',

    'demo.banner': 'Деморежим — примерные данные. Меняйте что угодно: ничего не покидает ваш браузер.',
    'demo.bannerShort': 'Демо · примерные данные',
    'demo.reset': 'Сбросить',
    'demo.resetConfirm': 'Вернуть примерные данные? Изменения, сделанные в демоверсии, будут потеряны.',
    'demo.resetDone': 'Демоверсия сброшена',
    'demo.exit': 'Выйти из демоверсии',

    'notif.title': 'Уведомления',
    'notif.empty': 'Всё в порядке',
    'notif.urgent': 'Срочно', 'notif.attention': 'Скоро', 'notif.info': 'Инфо',
    'notif.dismiss': 'Скрыть на {n} дн.',
    'notif.hidden': 'Скрыто: {n}',
    'notif.showHidden': 'Показать скрытые',
    'notif.hideHidden': 'Снова скрыть',
    'notif.backIn': 'Вернётся через {n} дн.',
    'notif.restore': 'Показать сейчас',

    'swipe.hint': 'Проведите пальцем, чтобы сменить раздел',
  },
}

/* Aviso en desarrollo si a algún idioma le falta una clave del
   inglés. En producción no cuesta nada porque no se ejecuta. */
if (import.meta.env?.DEV) {
  const base = Object.keys(DICT.en)
  for (const [id, table] of Object.entries(DICT)) {
    if (id === 'en') continue
    const missing = base.filter(k => !(k in table))
    if (missing.length) console.warn(`[i18n] ${id}: faltan ${missing.length} claves`, missing)
  }
}
