import { useState, useEffect } from 'react'
import { Check, Sun, Moon, Wrench, ChevronRight, ChevronLeft } from 'lucide-react'
import { theme, css, FONT, ACCENTS } from '../lib/theme.js'
import { LANGS, t, useLang } from '../lib/i18n.js'
import { currentPrefs, applyPrefs, savePrefs } from '../lib/prefs.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { Modal } from './ui.jsx'

/* ─────────────────────────────────────────────────────────────
   Controles de preferencias, compartidos por el asistente de
   bienvenida y por la pantalla de ajustes.

   Todo se aplica EN VIVO al pulsar: cambiar el idioma reescribe la
   pantalla al momento y cambiar el acento repinta la interfaz. Un
   selector de color que no enseña el color no sirve de nada.
   ───────────────────────────────────────────────────────────── */

function OptionRow({ on, onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 11, width: '100%',
      padding: '12px 13px', cursor: 'pointer', textAlign: 'left',
      background: on ? theme.accentSoft : 'transparent',
      border: `1px solid ${on ? theme.accent : theme.border}`,
      color: on ? theme.white : theme.text,
      minHeight: 48,
      ...style,
    }}>
      {children}
      {on && <Check size={15} color={theme.accent} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
    </button>
  )
}

export function LanguagePicker({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {LANGS.map(l => (
        <OptionRow key={l.id} on={value === l.id} onClick={() => onChange(l.id)}>
          <span style={{
            ...css.lbl, width: 26, flexShrink: 0,
            color: value === l.id ? theme.accent : theme.mutedLight,
          }}>{l.id.toUpperCase()}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{l.native}</span>
          <span style={{ ...css.lbl, fontSize: 8.5 }}>{l.label}</span>
        </OptionRow>
      ))}
    </div>
  )
}

export function ThemePicker({ value, onChange }) {
  const opts = [
    { id: 'dark', icon: Moon, label: t('onb.dark'), note: t('onb.darkNote') },
    { id: 'light', icon: Sun, label: t('onb.light'), note: t('onb.lightNote') },
  ]
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {opts.map(o => {
        const Icon = o.icon
        return (
          <OptionRow key={o.id} on={value === o.id} onClick={() => onChange(o.id)} style={{ alignItems: 'flex-start' }}>
            <Icon size={17} color={value === o.id ? theme.accent : theme.mutedLight} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{o.label}</span>
              <span style={{ ...css.lbl, fontSize: 9, letterSpacing: '0.06em', textTransform: 'none', display: 'block', marginTop: 3 }}>{o.note}</span>
            </span>
          </OptionRow>
        )
      })}
    </div>
  )
}

export function AccentPicker({ value, onChange, mode }) {
  const ids = Object.keys(ACCENTS)
  const isLight = mode === 'light'
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {ids.map(id => {
          const a = ACCENTS[id]
          const swatch = isLight ? a.light : a.dark
          const on = value === id
          return (
            <button key={id} onClick={() => onChange(id)} title={a.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              padding: '11px 4px', cursor: 'pointer',
              background: on ? theme.accentSoft : 'transparent',
              border: `1px solid ${on ? theme.accent : theme.border}`,
              minHeight: 72,
            }}>
              <span style={{
                width: 26, height: 26, background: swatch, flexShrink: 0,
                display: 'grid', placeItems: 'center',
              }}>
                {on && <Check size={14} color={isLight ? '#fff' : theme.bg} strokeWidth={3} />}
              </span>
              <span style={{
                ...css.lbl, fontSize: 7.5, letterSpacing: '0.1em',
                color: on ? theme.white : theme.mutedLight,
                overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', whiteSpace: 'nowrap',
              }}>{a.label}</span>
            </button>
          )
        })}
      </div>
      <p style={{ ...css.lbl, fontSize: 9, letterSpacing: '0.04em', textTransform: 'none', marginTop: 11, lineHeight: 1.5 }}>
        {t('onb.accentNote')}
      </p>
    </div>
  )
}

/* Una ficha de vehículo en pequeño, para que el acento se vea
   sobre algo real y no sobre un cuadrado suelto. */
function Preview() {
  return (
    <div style={{ border: `1px solid ${theme.border}`, background: theme.card, padding: 12 }}>
      <div style={{ ...css.lbl, fontSize: 8, marginBottom: 9 }}>{t('onb.preview')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, background: theme.accent, color: theme.accentInk, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Wrench size={15} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...css.h3, fontSize: 13 }}>BMW 320d</div>
          <div style={{ ...css.lbl, fontSize: 8, marginTop: 3 }}>187.450 km · 2016</div>
        </div>
        <span style={css.badge(theme.redSoft, theme.red)}>2</span>
        <span style={css.badge(theme.greenSoft, theme.green)}>OK</span>
      </div>
      <div style={{ marginTop: 11, display: 'flex', gap: 6 }}>
        <span style={{ ...css.btn(), padding: '6px 10px', fontSize: 9 }}>{t('common.add')}</span>
        <span style={{ ...css.btnOutline, padding: '6px 10px', fontSize: 9 }}>{t('common.edit')}</span>
      </div>
    </div>
  )
}

/* ═══════════════ ASISTENTE DE BIENVENIDA ═══════════════
   Pantalla completa, tres pasos. Se muestra a quien nunca ha
   contestado — incluidos los usuarios que ya existían, que llegan
   con las columnas vacías. */
export function Onboarding({ user, onDone }) {
  useLang()
  const mob = useIsMobile()
  const [step, setStep] = useState(0)
  const [prefs, setPrefs] = useState(() => currentPrefs())
  const [saving, setSaving] = useState(false)

  const set = (patch) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    applyPrefs(next)   // vista previa en vivo
  }

  const finish = async () => {
    setSaving(true)
    const res = await savePrefs(user, prefs, { markOnboarded: true })
    setSaving(false)
    onDone(res.user, res.ok)
  }

  const steps = [
    { q: t('onb.langQ'), body: <LanguagePicker value={prefs.lang} onChange={l => set({ lang: l })} /> },
    { q: t('onb.themeQ'), body: <ThemePicker value={prefs.theme} onChange={th => set({ theme: th })} /> },
    { q: t('onb.accentQ'), body: <AccentPicker value={prefs.accent} mode={prefs.theme} onChange={a => set({ accent: a })} /> },
  ]
  const last = step === steps.length - 1

  return (
    <div style={{
      minHeight: '100vh', minHeight: '100dvh', background: theme.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mob ? 18 : 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{
          width: 40, height: 40, display: 'grid', placeItems: 'center',
          background: theme.accent, color: theme.accentInk, marginBottom: 15,
        }}>
          <Wrench size={22} strokeWidth={2.2} />
        </div>

        <h1 style={{ ...css.h1, fontSize: 26 }}>{t('onb.welcome')}</h1>
        <p style={{
          ...css.lbl, textTransform: 'none', letterSpacing: '0.02em',
          fontSize: 12.5, lineHeight: 1.55, marginTop: 9, color: theme.muted,
        }}>{t('onb.intro')}</p>

        {/* Progreso */}
        <div style={{ display: 'flex', gap: 4, margin: '20px 0 8px' }}>
          {steps.map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 3,
              background: i <= step ? theme.accent : theme.border,
              transition: 'background .2s',
            }} />
          ))}
        </div>
        <div style={{ ...css.lbl, fontSize: 8.5, marginBottom: 16 }}>{t('onb.step', { n: step + 1 })}</div>

        <div style={{ borderTop: `2px solid ${theme.rule}`, paddingTop: 15 }}>
          <h2 style={{ ...css.h2, fontSize: 15, marginBottom: 13 }}>{steps[step].q}</h2>
          {steps[step].body}
        </div>

        {step === 2 && <div style={{ marginTop: 14 }}><Preview /></div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ ...css.btnOutline, padding: '13px 14px' }}>
              <ChevronLeft size={13} /> {t('common.back')}
            </button>
          )}
          <button
            onClick={() => (last ? finish() : setStep(s => s + 1))}
            disabled={saving}
            style={{
              ...css.btn(), flex: 1, justifyContent: 'center',
              padding: '13px 16px', fontSize: 11, opacity: saving ? 0.7 : 1,
            }}>
            {last
              ? (saving ? t('common.saving') : t('onb.finish'))
              : <>{t('common.next')} <ChevronRight size={13} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ AJUSTES ═══════════════
   Lo mismo, en un modal y sin pasos. Si se cancela, se deshace
   todo lo que se estuviera previsualizando. */
export function SettingsModal({ open, user, onClose, onSaved, onToast }) {
  useLang()
  const [initial, setInitial] = useState(() => currentPrefs())
  const [prefs, setPrefs] = useState(() => currentPrefs())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const snapshot = currentPrefs()
    setInitial(snapshot)
    setPrefs(snapshot)
  }, [open])

  const set = (patch) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    applyPrefs(next)
  }

  const cancel = () => {
    applyPrefs(initial)   // deshacer la vista previa
    onClose()
  }

  const save = async () => {
    setSaving(true)
    const res = await savePrefs(user, prefs)
    setSaving(false)
    onSaved?.(res.user)
    onToast?.(res.ok ? t('set.saved') : t('set.savedLocal'), res.ok ? 'success' : 'error')
    onClose()
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={cancel} title={t('set.title')}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ ...css.lbl, marginBottom: 9 }}>{t('set.language')}</div>
        <LanguagePicker value={prefs.lang} onChange={l => set({ lang: l })} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ ...css.lbl, marginBottom: 9 }}>{t('set.theme')}</div>
        <ThemePicker value={prefs.theme} onChange={th => set({ theme: th })} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ ...css.lbl, marginBottom: 9 }}>{t('set.accent')}</div>
        <AccentPicker value={prefs.accent} mode={prefs.theme} onChange={a => set({ accent: a })} />
      </div>

      <div style={{ marginBottom: 18 }}><Preview /></div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={cancel} style={css.btnOutline}>{t('common.cancel')}</button>
        <button onClick={save} disabled={saving} style={css.btn()}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}
