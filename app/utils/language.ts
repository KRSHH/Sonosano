import Language from 'i18n/languages'

const LANGUAGE_TOKEN_LOCAL_STORAGE_KEY = 'lang'

export function getLanguageFromString(languageValue: string) {
  const genre = Object.values(Language).find((x) => x === languageValue)
  if (!genre) {
    throw new Error(`Cannot get Genre from ${languageValue}`)
  }

  return genre
}

export const getLanguageFromStorage = (): Language => {
  const languageValue = localStorage.getItem(LANGUAGE_TOKEN_LOCAL_STORAGE_KEY)
  if (!languageValue) return Language.ENGLISH
  const languageMapped = getLanguageFromString(languageValue)
  if (!languageMapped) return Language.ENGLISH
  return languageMapped
}

export const setLanguageStorage = (language: Language) => {
  localStorage.setItem(LANGUAGE_TOKEN_LOCAL_STORAGE_KEY, language)
}
