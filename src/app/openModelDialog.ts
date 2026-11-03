import { ACCEPT_ATTR, pickModelPath } from '../loaders/openModel'
import { isTauri } from '../platform/env'
import { useModelStore } from '../store/modelStore'

/** 파일 열기. Tauri는 네이티브 대화상자, 브라우저는 파일 input을 쓴다. */
export async function openModelDialog() {
  if (useModelStore.getState().loading) return
  if (isTauri) {
    const path = await pickModelPath()
    if (path) await useModelStore.getState().openPath(path)
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = ACCEPT_ATTR
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) void useModelStore.getState().openFile(file)
  }
  input.click()
}
