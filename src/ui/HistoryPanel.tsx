import { useEffect, useRef } from 'react'
import { useHistoryStore } from '../store/historyStore'
import { Panel } from './Panel'

/**
 * 작업 기록 목록. 항목을 누르면 그 작업 직후 상태로 돌아간다(여러 단계 실행 취소/다시 실행).
 * 현재 위치 아래(다시 실행할 수 있는 작업)는 흐리게 보인다.
 */
export function HistoryPanel() {
  const past = useHistoryStore((s) => s.past)
  const future = useHistoryStore((s) => s.future)
  const jumpTo = useHistoryStore((s) => s.jumpTo)
  const currentRef = useRef<HTMLLIElement>(null)
  const entries = [...past, ...future]

  // 새 작업이 생기면 현재 위치가 보이게 스크롤한다.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' })
  }, [past.length])

  return (
    <Panel title={`작업 기록 (${past.length}/${entries.length})`}>
      <ol className="history-list">
        <li ref={past.length === 0 ? currentRef : undefined}>
          <button aria-current={past.length === 0 ? 'step' : undefined} onClick={() => jumpTo(0)}>
            처음 상태
          </button>
        </li>
        {entries.map((command, i) => {
          const applied = i < past.length
          const current = i === past.length - 1
          return (
            <li key={i} ref={current ? currentRef : undefined}>
              <button
                className={applied ? undefined : 'undone'}
                aria-current={current ? 'step' : undefined}
                onClick={() => jumpTo(i + 1)}
                title={applied ? '이 작업 직후로 되돌리기' : '여기까지 다시 실행'}
              >
                <span className="history-index">{i + 1}</span>
                {command.label}
              </button>
            </li>
          )
        })}
      </ol>
      {entries.length === 0 && <p className="hint">시점·조명·선화·보정을 바꾸면 여기에 쌓입니다. 모델을 바꾸면 비워집니다.</p>}
    </Panel>
  )
}
