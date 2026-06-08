import { useT } from './languageContext'
import type { TranslationKey } from './translations'

/* Translated label helpers for enum-like values (status / cycle status / type).
   Falls back to the raw value when a key is missing. */
export function useLabels() {
  const t = useT()
  return {
    statusLabel: (s: string) => t(`status.${s}` as TranslationKey) || s,
    cycleStatusLabel: (s: string) => t(`cstatus.${s}` as TranslationKey) || s,
    typeLabel: (ty: string) => t(`type.${ty}` as TranslationKey) || ty,
  }
}
