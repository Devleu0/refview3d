import { useEffect, useRef } from 'react'
import { useUiStore } from '../store/uiStore'

const SHORTCUTS: [string, string][] = [
  ['회전 / 이동 / 줌', '왼쪽 드래그 / 오른쪽 드래그 / 휠'],
  ['모델 열기', 'Ctrl+O'],
  ['실행 취소 / 다시 실행', 'Ctrl+Z / Ctrl+Y'],
  ['정면·후면·좌측·우측·상단·3/4', '1 – 6'],
  ['화면에 맞추기', 'F'],
  ['음영 전환 (원본→클레이→툰)', 'S'],
  ['외곽선 / 은선 / 그리드', 'L / H / G'],
  ['PNG / PSD 저장', 'Ctrl+E / Ctrl+Shift+E'],
  ['단축키 보기', '?'],
]

export function ShortcutHelp() {
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
      <h2>단축키</h2>
      <dl className="shortcut-list">
        {SHORTCUTS.map(([action, keys]) => (
          <div key={action}>
            <dt>{action}</dt>
            <dd>
              <kbd>{keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
      <button className="wide" onClick={() => setOpen(false)}>
        닫기
      </button>
    </dialog>
  )
}
