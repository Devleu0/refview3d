import { useEffect, useRef, useState } from 'react'
import { LOCALES, useLocaleStore, useT } from '../i18n'

/** 툴바 자리를 적게 쓰는 언어 선택: 코드만 보이는 버튼 + 펼침 목록 */
export function LanguageMenu() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 바깥을 누르거나 Esc를 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = LOCALES.find((l) => l.code === locale)

  return (
    <div className="language-menu" ref={rootRef}>
      <button
        className="language-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('toolbar.language')}
        title={`${t('toolbar.language')}: ${current?.name ?? locale}`}
        onClick={() => setOpen((o) => !o)}
      >
        {locale.split('-')[0].toUpperCase()}
        {locale.includes('-') && <span className="language-region">{locale.split('-')[1]}</span>}
      </button>
      {open && (
        <ul className="language-list" role="listbox" aria-label={t('toolbar.language')}>
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                role="option"
                aria-selected={l.code === locale}
                lang={l.code}
                onClick={() => {
                  setLocale(l.code)
                  setOpen(false)
                }}
              >
                {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
