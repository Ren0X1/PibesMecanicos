import { Car, Shield, LogOut, Wrench, Users, Sun, Moon, BarChart3, Bell, Settings } from 'lucide-react'
import { theme, css, FONT, getThemeMode } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { useIsTouch } from '../lib/useTouch.js'
import { t, useLang } from '../lib/i18n.js'
import NotificationCenter from './NotificationCenter.jsx'

/* La llave inglesa del favicon, delante del nombre. */
export function Mark({ size = 27 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      display: 'grid', placeItems: 'center',
      background: theme.accent, color: theme.accentInk,
    }}>
      <Wrench size={Math.round(size * 0.58)} strokeWidth={2.2} />
    </div>
  )
}

export function Brand({ size = 27, fontSize = 13.5 }) {
  return (
    <div style={{ ...css.flex, gap: 9, flexShrink: 0 }}>
      <Mark size={size} />
      <span style={{
        fontFamily: FONT.display, fontSize, letterSpacing: '-0.02em',
        textTransform: 'uppercase', whiteSpace: 'nowrap', color: theme.white,
      }}>Pibes Mecánicos</span>
    </div>
  )
}

export default function Nav({ user, view, setView, onLogout, dataVersion, onToggleTheme, onOpenSettings }) {
  useLang()
  const narrow = useIsMobile()
  const touch = useIsTouch()
  /* La barra inferior no depende del ancho sino de cómo se apunta:
     un iPad en horizontal mide 1024 px y aun así se navega con el
     pulgar, no con el ratón. */
  const m = narrow || touch
  const isDark = getThemeMode() === 'dark'

  const tabs = [
    { id: 'dashboard', icon: Car, label: t('nav.vehicles') },
    { id: 'stats', icon: BarChart3, label: t('nav.summary') },
    { id: 'reminders', icon: Bell, label: t('nav.alerts') },
    { id: 'groups', icon: Users, label: t('nav.groups') },
    { id: 'workshops', icon: Wrench, label: t('nav.workshops') },
    ...(user.role === 'admin' ? [{ id: 'admin', icon: Shield, label: t('nav.admin') }] : []),
  ]

  const iconBtn = {
    background: 'none', border: 'none', color: theme.mutedLight,
    cursor: 'pointer', display: 'flex', padding: 5,
  }

  // ─── MÓVIL: barra superior + navegación inferior ───
  if (m) {
    return (
      <>
        <header style={{
          background: theme.card, borderBottom: `1px solid ${theme.border}`,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ ...css.flexBetween, height: 52, padding: '0 14px' }}>
            <Brand size={26} fontSize={13} />
            <div style={{ ...css.flex, gap: 8 }}>
              <button onClick={onToggleTheme} title={isDark ? t('nav.lightMode') : t('nav.darkMode')} style={iconBtn}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <NotificationCenter userId={user.id} isMobile={m} dataVersion={dataVersion} />
              <button onClick={onOpenSettings} title={t('nav.settings')} style={iconBtn}><Settings size={18} /></button>
              <button onClick={onLogout} title={t('nav.logout')} style={iconBtn}><LogOut size={18} /></button>
            </div>
          </div>
        </header>

        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: theme.card, borderTop: `1px solid ${theme.rule}`,
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}>
          {tabs.map((t, i) => {
            const on = view === t.id
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setView(t.id)} style={{
                flex: 1, minWidth: 0, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: 'transparent', border: 'none',
                borderRight: i < tabs.length - 1 ? `1px solid ${theme.border}` : 'none',
                padding: '11px 0 13px', minHeight: 56, justifyContent: 'center', cursor: 'pointer',
                color: on ? theme.accent : theme.mutedLight,
                fontFamily: FONT.mono, fontSize: 8, fontWeight: 500,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {on && <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: 2, background: theme.accent,
                }} />}
                <Icon size={21} strokeWidth={1.7} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </nav>
      </>
    )
  }

  // ─── ESCRITORIO: una sola barra superior ───
  return (
    <header style={{
      background: theme.card, borderBottom: `1px solid ${theme.border}`,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ ...css.container, ...css.flexBetween, height: 54, gap: 14 }}>
        <Brand />

        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', flex: 1, marginLeft: 8 }}>
          {tabs.map(t => {
            const on = view === t.id
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setView(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 13px',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${on ? theme.accent : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
                color: on ? theme.accent : theme.mutedLight,
                fontFamily: FONT.mono, fontSize: 9.5, fontWeight: 500,
                letterSpacing: '0.13em', textTransform: 'uppercase',
              }}>
                <Icon size={15} strokeWidth={1.8} /> {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ ...css.flex, gap: 12, flexShrink: 0 }}>
          <span style={{ ...css.lbl, letterSpacing: '0.13em' }}>{user.name}</span>
          <button onClick={onToggleTheme} title={isDark ? t('nav.lightMode') : t('nav.darkMode')} style={iconBtn}>
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <NotificationCenter userId={user.id} isMobile={m} dataVersion={dataVersion} />
          <button onClick={onOpenSettings} title={t('nav.settings')} style={iconBtn}><Settings size={17} /></button>
          <button onClick={onLogout} title={t('nav.logout')} style={iconBtn}><LogOut size={17} /></button>
        </div>
      </div>
    </header>
  )
}
