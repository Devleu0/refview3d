import { useEffect, useRef } from 'react'
import { useT, type MessageKey } from '../i18n'
import { useUiStore } from '../store/uiStore'

/** [동작, 키]. 키는 번역 키이거나(마우스 조작) 그대로 보여줄 글자 */
const SHORTCUTS: [MessageKey, string | MessageKey][] = [
  ['help.navigate', 'help.navigateKeys'],
  ['help.open', 'Ctrl+O'],
  ['help.library', 'Ctrl+B'],
  ['help.undoRedo', 'Ctrl+Z / Ctrl+Y'],
  ['help.views', '1 – 6'],
  ['help.fit', 'F'],
  ['help.shading', 'S'],
  ['help.toggles', 'L / H / G'],
  ['help.grayscale', 'B'],
  ['help.guides', 'P'],
  ['help.pose', 'R / T / Esc'],
  ['help.export', 'Ctrl+E / Ctrl+Shift+E'],
  ['help.help', '?'],
]

export function ShortcutHelp() {
  const t = useT()
  const open = useUiStore((s) => s.helpOpen)
  const setOpen = useUiStore((s) => s.setHelpOpen)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="help-dialog"
      onClose={() => setOpen(false)}
      // 바깥(배경)을 누르면 닫는다.
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <h2>{t('help.title')}</h2>
      <dl className="shortcut-list">
        {SHORTCUTS.map(([action, keys]) => (
          <div key={action}>
            <dt>{t(action)}</dt>
            <dd>
              <kbd>{keys.startsWith('help.') ? t(keys as MessageKey) : keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
      <button className="wide" onClick={() => setOpen(false)}>
        {t('common.close')}
      </button>
    </dialog>
  )
}
