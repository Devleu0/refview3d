import { convertFileSrc } from '@tauri-apps/api/core'
import { memo, useMemo } from 'react'
import type { LibraryModel } from '../library/libraryApi'
import { filterModels, useLibraryStore } from '../store/libraryStore'
import { useModelStore } from '../store/modelStore'
import { useUiStore } from '../store/uiStore'

function folderName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 등록 폴더 기준 하위 폴더 경로 ("소품/상자"). 바로 아래 파일이면 빈 문자열 */
function subfolderOf(model: LibraryModel, root: string | undefined) {
  if (!root) return ''
  const rel = model.path.slice(root.length).replace(/^[\\/]+/, '')
  return rel.split(/[\\/]/).slice(0, -1).join('/')
}

const ModelCard = memo(function ModelCard({
  model,
  subfolder,
  current,
  onOpen,
}: {
  model: LibraryModel
  subfolder: string
  current: boolean
  onOpen: (m: LibraryModel) => void
}) {
  return (
    <li>
      <button
        className="library-card"
        aria-current={current ? 'true' : undefined}
        onClick={() => onOpen(model)}
        title={`${model.path}\n${model.format.toUpperCase()} · ${formatSize(model.size)}`}
      >
        <span className="library-thumb">
          {model.thumb ? (
            // 썸네일이 다시 만들어지면 같은 파일 이름이므로 수정 시각으로 캐시를 무효화한다.
            <img src={`${convertFileSrc(model.thumb)}?v=${model.modified}`} alt="" loading="lazy" draggable={false} />
          ) : (
            <span className="library-placeholder">{model.thumbFailed ? '미리보기 없음' : model.format.toUpperCase()}</span>
          )}
        </span>
        <span className="library-name">{model.name}</span>
        {/* 이름이 같은 파일을 구분할 수 있게 하위 폴더를 함께 보여 준다. */}
        {subfolder && <span className="library-subfolder">{subfolder}</span>}
      </button>
    </li>
  )
})

/** 왼쪽 서랍: 등록한 폴더의 모델을 썸네일로 모아 보고 눌러서 연다. */
export function LibraryPanel() {
  const open = useUiStore((s) => s.libraryOpen)
  const { available, folders, models, loaded, query, folderId, thumbProgress } = useLibraryStore()
  const { setQuery, setFolderId, addFolder, removeFolder, rescan, open: openModel } = useLibraryStore.getState()
  const currentPath = useModelStore((s) => s.model?.path)
  const visible = useMemo(() => filterModels(models, query, folderId), [models, query, folderId])
  const rootOf = useMemo(() => new Map(folders.map((f) => [f.id, f.path])), [folders])

  if (!open) return null

  if (!available) {
    return (
      <aside className="library-panel">
        <h2 className="library-title">라이브러리</h2>
        <p className="hint library-empty">폴더 연결은 데스크톱 앱에서만 쓸 수 있습니다.</p>
      </aside>
    )
  }

  return (
    <aside className="library-panel" aria-label="라이브러리">
      <div className="library-header">
        <h2 className="library-title">라이브러리</h2>
        <button onClick={() => void rescan()} disabled={folders.length === 0} title="폴더를 다시 훑기 (보통은 자동으로 반영됩니다)" aria-label="다시 훑기">
          ↻
        </button>
        <button onClick={() => void addFolder()} title="모델이 들어 있는 폴더를 추가합니다 (하위 폴더 포함)">
          폴더 추가
        </button>
      </div>

      {folders.length > 0 && (
        <>
          <input className="library-search" type="search" placeholder="이름으로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="library-folders">
            <li>
              <button aria-pressed={folderId === null} onClick={() => setFolderId(null)}>
                전체 <span className="count">{models.length}</span>
              </button>
            </li>
            {folders.map((f) => (
              <li key={f.id} className="library-folder">
                <button aria-pressed={folderId === f.id} onClick={() => setFolderId(f.id)} title={f.path}>
                  {folderName(f.path)} <span className="count">{f.modelCount}</span>
                </button>
                <button
                  className="library-folder-remove"
                  onClick={() => void removeFolder(f.id)}
                  title="라이브러리에서 빼기 (파일은 지우지 않습니다)"
                  aria-label={`${folderName(f.path)} 폴더 빼기`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {thumbProgress && (
        <p className="hint library-progress" role="status">
          미리보기 만드는 중 {thumbProgress.done}/{thumbProgress.total}
        </p>
      )}

      <div className="library-body">
        {loaded && folders.length === 0 && (
          <div className="library-empty">
            <p>모델이 들어 있는 폴더를 추가하면 안의 OBJ·STL·FBX·GLTF·GLB를 모아 보여 줍니다.</p>
            <p className="hint">폴더 안의 파일이 바뀌면 자동으로 반영됩니다.</p>
          </div>
        )}
        {folders.length > 0 && visible.length === 0 && <p className="hint library-empty">{query ? '찾는 모델이 없습니다.' : '이 폴더에는 모델이 없습니다.'}</p>}
        <ul className="library-grid">
          {visible.map((m) => (
            <ModelCard key={m.id} model={m} subfolder={subfolderOf(m, rootOf.get(m.folderId))} current={m.path === currentPath} onOpen={openModel} />
          ))}
        </ul>
      </div>
    </aside>
  )
}
