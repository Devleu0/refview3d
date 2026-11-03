/** 슬라이더 값을 바꾸는 키 */
const SLIDER_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (value: number) => string
  disabled?: boolean
  onChange: (value: number) => void
  /** 조작 시작. 여러 번 불려도 첫 호출만 의미가 있어야 한다. */
  onBegin: () => void
  onEnd: () => void
}

/** 끄는 동안은 실시간으로 적용하고, 손을 뗄 때 한 번만 기록하는 슬라이더 */
export function SliderField({ label, value, min, max, step = 1, format = String, disabled, onChange, onBegin, onEnd }: SliderFieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label} <output>{format(value)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onPointerDown={onBegin}
        onKeyDown={(e) => {
          // Ctrl+Z 같은 단축키에서 시작하면 Undo 직전 상태를 잡아 엉뚱한 항목이 기록된다.
          if (SLIDER_KEYS.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) onBegin()
        }}
        onChange={(e) => {
          onBegin()
          onChange(Number(e.target.value))
        }}
        onPointerUp={onEnd}
        onKeyUp={onEnd}
        onBlur={onEnd}
      />
    </label>
  )
}
