import { openModelDialog } from '../app/openModelDialog'
import { useT } from '../i18n'
import { useModelStore } from '../store/modelStore'

export function OpenModelButton() {
  const t = useT()
  const loading = useModelStore((s) => s.loading)
  return (
    <button onClick={() => void openModelDialog()} disabled={!!loading} title={t('toolbar.openTitle')}>
      {t('toolbar.open')}
    </button>
  )
}
