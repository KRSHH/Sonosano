import i18n, { Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import Language, { availableLanguages } from './languages'

const loadTranslationFiles = async (): Promise<Resource> => {
  const resources: Resource = {}

  for (const lang of availableLanguages) {
    const translation = await import(`./localization/${lang}.json`)
    resources[lang] = { translation: translation.default || translation }
  }

  return resources
}

export const initializeI18n = async () => {
  const resources = await loadTranslationFiles()

  i18n.use(initReactI18next).init({
    resources,
    lng: Language.ENGLISH,
    fallbackLng: Language.ENGLISH,
    interpolation: {
      escapeValue: false,
    },
  })
}

export const changeLanguage = (language: Language) => {
  i18n.changeLanguage(language)
}
