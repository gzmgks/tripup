import logoMark from '../assets/brand/logo-mark.svg'
import { StatusBar } from '../shell/StatusBar'
import styles from './TokensPreview.module.css'

/** Design system check screen: shows the tokens and text styles inside the shell. Not part of the scenario. */

const SWATCHES = [
  { name: 'Purple Main', token: '--purple-main', hex: '#5A31F4', role: 'Brand and actions' },
  { name: 'Purple Light', token: '--purple-light', hex: '#F8F6FF', role: 'Soft selected surfaces' },
  { name: 'Purple Dark', token: '--purple-dark', hex: '#39209A', role: 'Selected state on violet' },
  { name: 'Lemon Green', token: '--lemon-green', hex: '#D4F24A', role: 'Chosen, agreed, done' },
  { name: 'Lemon Green Dark', token: '--lemon-green-dark', hex: '#95B500', role: 'Lime on white' },
  { name: 'Black', token: '--black', hex: '#1B1A22', role: 'Text and icons' },
  { name: 'Grey 1', token: '--grey-1', hex: '#626068', role: 'Secondary text' },
  { name: 'Grey 2', token: '--grey-2', hex: '#9A9A9A', role: 'Hints' },
  { name: 'Grey 3', token: '--grey-3', hex: '#C5C5C5', role: 'Dividers' },
  { name: 'Grey 4', token: '--grey-4', hex: '#E2E1E1', role: 'Borders' },
  { name: 'BG', token: '--bg', hex: '#F2F2F3', role: 'App background' },
  { name: 'Error (new)', token: '--error', hex: '#D93636', role: 'Failed payment only' },
]

const TYPE = [
  { cls: 't-h1', sample: 'Where’s dinner tonight?', meta: 'H1 · Baloo Tamma 2 Bold 28 / 30' },
  { cls: 't-h2', sample: 'Log the bill', meta: 'H2 · Plus Jakarta Sans Bold 20' },
  { cls: 't-h3', sample: 'Lisbon with the crew', meta: 'H3 · Plus Jakarta Sans Bold 16' },
  { cls: 't-body', sample: 'Pre-selected from tonight’s wine answers', meta: 'Body · Geist Regular 14' },
  { cls: 't-caption', sample: 'Day 5 of 5 · Sun 12 Oct', meta: 'Caption · Geist Regular 12' },
  { cls: 't-financial', sample: '€198.00', meta: 'Financial · Geist Regular 18' },
  { cls: 't-button', sample: 'Partially separate', meta: 'Button · Geist SemiBold 12' },
  { cls: 't-button-2', sample: 'Save', meta: 'Button 2 · Geist SemiBold 16' },
]

export function TokensPreview({ tone }: { tone: 'violet' | 'light' }) {
  if (tone === 'light') {
    return (
      <div className={`${styles.screen} ${styles.screenLight}`}>
        <StatusBar tone="onLight" />
        <h1 className={styles.title}>Type styles</h1>
        <div className={`${styles.sheet} ${styles.sheetFlat}`}>
          <section>
            {TYPE.map((t) => (
              <div key={t.cls} className={styles.typeRow}>
                <span className={t.cls}>{t.sample}</span>
                <span className={styles.typeMeta}>{t.meta}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <StatusBar tone="onViolet" />
      <header className={styles.header}>
        <img className={styles.mark} src={logoMark} alt="" aria-hidden="true" />
        <div>
          <div className={styles.wordmark}>TripUp</div>
          <div className={styles.sub}>Design tokens from the Figma file</div>
        </div>
      </header>
      <div className={styles.sheet}>
        <section>
          <h2 className={styles.sectionTitle}>Colour</h2>
          <div className={styles.swatches}>
            {SWATCHES.map((s) => (
              <div key={s.token}>
                <div className={styles.chip} style={{ background: `var(${s.token})` }} />
                <div className={styles.swName}>{s.name}</div>
                <div className={styles.swMeta}>
                  {s.hex}
                  <br />
                  {s.role}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.rules}>
          <strong className="t-h3">Usage rules</strong>
          <span>Violet = act: brand, navigation, buttons, anything waiting on you.</span>
          <span>Lime = chosen: Lime dark on white.</span>
          <span>Never lime text.</span>
          <span>No red for debts: only for real errors.</span>
        </section>
      </div>
    </div>
  )
}
