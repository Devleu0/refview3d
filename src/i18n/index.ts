import { create } from 'zustand'
import de from './locales/de'
import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import ja from './locales/ja'
import ko from './locales/ko'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'

/** 한국어 사전이 기준이다. 다른 언어 사전은 같은 키를 모두 가져야 한다(타입으로 검사). */
export type MessageKey = keyof typeof ko
export type Messages = Record<MessageKey, string>

export const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
] as const

export type Locale = (typeof LOCALES)[number]['code']

const DICTIONARIES: Record<Locale, Messages> = { en, ko, ja, 'zh-CN': zhCN, 'zh-TW': zhTW, es, fr, de }
const STORAGE_KEY = 'refview3d.locale'

/** 저장해 둔 언어, 없으면 시스템 언어에 가장 가까운 것, 그래도 없으면 영어 */
function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved in DICTIONARIES) return saved as Locale
  } catch {
    // 저장소를 못 쓰면 시스템 언어로 정한다.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const lower = tag.toLowerCase()
    if (lower.startsWith('zh')) return /-(tw|hk|mo|hant)/.test(lower) ? 'zh-TW' : 'zh-CN'
    const base = lower.split('-')[0]
    const match = LOCALES.find((l) => l.code === base)
    if (match) return match.code
  }
  return 'en'
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: detectLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // 저장 실패는 무시한다.
    }
    document.documentElement.lang = locale
    set({ locale })
  },
}))

document.documentElement.lang = useLocaleStore.getState().locale

/**
 * 현재 언어로 번역한다. `{name}` 자리는 params로 채운다.
 * 컴포넌트 밖(히스토리 라벨, 오류 메시지)에서도 쓸 수 있다. 화면을 다시 그려야 하면 useT를 쓴다.
 */
export function t(key: MessageKey, params?: Record<string, string | number>) {
  const message = DICTIONARIES[useLocaleStore.getState().locale][key] ?? ko[key] ?? key
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))
}

/** 언어가 바뀌면 컴포넌트를 다시 그리도록 구독하고 t를 돌려준다. */
export function useT() {
  useLocaleStore((s) => s.locale)
  return t
}

export function hasMessage(key: string): key is MessageKey {
  return key in ko
}

/**
 * Rust 명령이 돌려준 오류 코드("folderNotFound" 또는 "nestedFolder:경로")를 번역한다.
 * 코드가 아니면(파서 오류 등) 원문을 그대로 돌려준다.
 */
export function translateBackendError(raw: unknown) {
  const text = raw instanceof Error ? raw.message : String(raw)
  const [code, ...rest] = text.split(':')
  const key = `backend.${code}`
  if (!hasMessage(key)) return text
  return t(key, { detail: rest.join(':') })
}

/** 기본 마네킹 관절 이름(영문 id)을 현재 언어로. 다른 모델의 뼈 이름은 그대로 둔다. */
export function boneLabel(name: string) {
  const key = `bone.${name}`
  return hasMessage(key) ? t(key) : name || t('pose.unnamedBone')
}
