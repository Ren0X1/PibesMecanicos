import { theme, css } from '../lib/theme.js'
import { t, useLang } from '../lib/i18n.js'
import { useIsMobile } from '../lib/useIsMobile.js'

/* Pie de página, en todas las pantallas.

   El año se calcula al pintar, no se escribe: así el 1 de enero
   cambia solo y nadie tiene que acordarse de nada.

   En móvil se recorta: cabe el año, el nombre y el enlace, pero no
   la coletilla de derechos — en 390 px partiría en dos líneas y el
   pie ocuparía el doble por decir algo que nadie lee. */
export const FOOTER_HEIGHT = 38
export const FOOTER_HEIGHT_MOBILE = 34

/* La marca de GitHub va como SVG propio: lucide dejó de traer
   iconos de marca y aquí no existe. */
function GithubMark({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.35-1.29-1.71-1.29-1.71-1.06-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.76.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  )
}

const GITHUB = 'https://github.com/Ren0X1'

export default function Footer({ style }) {
  useLang()
  const mob = useIsMobile()

  const year = new Date().getFullYear()

  return (
    <footer style={{
      borderTop: `1px solid ${theme.border}`,
      marginTop: 'auto',
      flexShrink: 0,
      ...style,
    }}>
      <div style={{
        ...css.container,
        minHeight: mob ? FOOTER_HEIGHT_MOBILE : FOOTER_HEIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: mob ? 10 : 12, flexWrap: 'wrap', textAlign: 'center',
        padding: mob ? '0 14px' : '0 20px',
      }}>
        <span style={{ ...css.lbl, fontSize: mob ? 8 : 8.5, whiteSpace: 'nowrap' }}>
          © {year} Alejandro Mendoza
        </span>

        {/* La coletilla solo cuando hay ancho de sobra */}
        {!mob && (
          <span style={{ ...css.lbl, fontSize: 8.5, opacity: 0.55 }}>
            {t('foot.rights')}
          </span>
        )}

        <a
          href={GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...css.lbl, fontSize: mob ? 8 : 8.5, color: theme.muted,
            textDecoration: 'none', display: 'inline-flex',
            alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = theme.accent }}
          onMouseLeave={e => { e.currentTarget.style.color = theme.muted }}
        >
          <GithubMark size={mob ? 11 : 12} /> GitHub
        </a>
      </div>
    </footer>
  )
}
