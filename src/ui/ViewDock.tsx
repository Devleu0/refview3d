import { applyViewPreset, frameModel, VIEW_PRESETS } from '../app/actions'

/** 뷰포트 아래에 떠 있는 시점 바로가기 */
export function ViewDock() {
  return (
    <div className="view-dock" role="toolbar" aria-label="시점">
      {VIEW_PRESETS.map((v) => (
        <button key={v.preset} onClick={() => applyViewPreset(v.preset)} title={`${v.label} 시점 (${v.key})`}>
          {v.label}
        </button>
      ))}
      <span className="dock-sep" />
      <button onClick={frameModel} title="화면에 맞추기 (F)">
        맞추기
      </button>
    </div>
  )
}
