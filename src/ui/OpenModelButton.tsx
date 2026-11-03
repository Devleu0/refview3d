import { openModelDialog } from '../app/openModelDialog'
import { useModelStore } from '../store/modelStore'

export function OpenModelButton() {
  const loading = useModelStore((s) => s.loading)
  return (
    <button onClick={() => void openModelDialog()} disabled={!!loading} title="모델 열기 (Ctrl+O)">
      열기
    </button>
  )
}
