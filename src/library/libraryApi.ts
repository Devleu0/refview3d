import { invoke } from '@tauri-apps/api/core'

/** Rust library.rs의 Folder */
export interface LibraryFolder {
  id: number
  path: string
  modelCount: number
}

/** Rust library.rs의 ModelEntry */
export interface LibraryModel {
  id: number
  folderId: number
  path: string
  name: string
  format: string
  size: number
  /** 파일 수정 시각(ms) */
  modified: number
  /** 최신 썸네일 파일 경로. 없거나 오래됐으면 null */
  thumb: string | null
  thumbFailed: boolean
}

export interface LibrarySnapshot {
  folders: LibraryFolder[]
  models: LibraryModel[]
}

export const CHANGED_EVENT = 'library-changed'

export const listLibrary = () => invoke<LibrarySnapshot>('library_list')
export const addLibraryFolder = (path: string) => invoke<LibrarySnapshot>('library_add_folder', { path })
export const removeLibraryFolder = (id: number) => invoke<LibrarySnapshot>('library_remove_folder', { id })
export const rescanLibrary = () => invoke<LibrarySnapshot>('library_rescan')

/** 썸네일 PNG를 저장한다. 그 사이 원본이 바뀌었거나 지워졌으면 null */
export const saveThumbnail = (model: LibraryModel, png: Uint8Array) =>
  invoke<string | null>('library_save_thumbnail', png, {
    headers: { 'x-model-id': String(model.id), 'x-modified': String(model.modified) },
  })

export const markThumbnailFailed = (model: LibraryModel) =>
  invoke<void>('library_mark_thumbnail_failed', { id: model.id, modified: model.modified })

/** 폴더 고르기 대화상자. 취소하면 null */
export async function pickFolder() {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true, multiple: false, title: '라이브러리에 추가할 폴더' })
  return typeof selected === 'string' ? selected : null
}
