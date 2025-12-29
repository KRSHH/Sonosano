import { useState, useEffect } from 'react'
import useLocalStorage from '../../hooks/useLocalStorage'
import { useTranslation } from 'react-i18next' // Import useTranslation
import styles from './settings.module.css'
import { apiClient } from '../../api'
import { availableLanguages } from '../../i18n/languages' // Import languages
import { systemAdapter } from '@/app/lib/systemAdapter'

// ... (interfaces remain the same)
interface SearchMode {
  id: string
  name: string
  description: string
}

interface PropsSettings {
  refreshSidebarData: () => void
}
export default function Settings(_props: PropsSettings) {
  const { t, i18n } = useTranslation() // Get i18n instance
  // ... (other state and logic)
  const searchModes: SearchMode[] = [
    {
      id: 'apple_music',
      name: 'Apple Music',
      description: 'Search for music on Apple Music',
    },
    {
      id: 'musicbrainz',
      name: 'MusicBrainz',
      description: 'Search for music on MusicBrainz',
    },
  ]

  // Load saved search mode from localStorage or default to timmmmy
  const [selectedSearchMode, setSelectedSearchMode] = useLocalStorage<string>('searchMode', 'apple_music')
  const [dataPath, setDataPath] = useState('')
  const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:8000')

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await apiClient.getConfig()
        setDataPath(config.dataPath)
      } catch (error) {
        console.error('Error fetching config:', error)
      }
    }
    fetchConfig()

    const savedUrl = localStorage.getItem('backendUrl')
    if (savedUrl) {
      setBackendUrl(savedUrl)
      apiClient.setBaseUrl(savedUrl)
    }
  }, [])

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value)
  }

  // ... (other functions)
  const handleSearchModeChange = (modeId: string) => {
    setSelectedSearchMode(modeId)
  }

  const handleSelectFolder = async () => {
    const paths = await systemAdapter.app.openFolderDialog()
    if (paths && paths.length > 0) {
      setDataPath(paths[0])
    }
  }

  const handleSaveDataPath = async () => {
    if (!dataPath) {
      alert('Please select a folder.')
      return
    }

    try {
      await apiClient.saveConfig({ dataPath })
      alert('Configuration saved. Please restart the application for the changes to take effect.')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration.')
    }
  }

  const handleSaveBackendUrl = () => {
    localStorage.setItem('backendUrl', backendUrl)
    apiClient.setBaseUrl(backendUrl)
    alert('Backend URL updated.')
  }

  const [romanizeLyrics, setRomanizeLyrics] = useLocalStorage<boolean>('romanizeLyrics', false)

  const handleRomanizeLyricsChange = () => {
    setRomanizeLyrics(!romanizeLyrics)
  }

  return (
    <div className={`container-fluid d-flex flex-column ${styles.mainContainer}`}>
      <div className={`container-fluid d-flex flex-column ${styles.settingsContainer}`}>
        {/* Support Section */}
        <section className={`${styles.settingsSection} ${styles.supportSection}`}>
          <div className={styles.supportContent}>
            <p className={styles.supportText}>{t('settings.supportText')}</p>
            <div className={styles.supportButtons}>
              <a
                href="https://buymeacoffee.com/krshh"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.supportButton} ${styles.donateButton}`}
              >
                {t('settings.donate')}
              </a>
              <a
                href="https://github.com/KRSHH/sonosano"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.supportButton} ${styles.githubButton}`}
              >
                {t('settings.starOnGithub')}
              </a>
            </div>
          </div>
        </section>
        <header className="container-fluid d-flex flex-row mb-4">
          <h2 className={styles.pageTitle}>{t('settings.title')}</h2>
        </header>

        {/* Language Settings Section */}
        <section className={`${styles.settingsSection}`}>
          <h3 className={styles.sectionTitle}>{t('settings.language')}</h3>
          <p className={styles.sectionDescription}>{t('settings.languageDescription')}</p>
          <div className={styles.pathContainer}>
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className={styles.pathInput} // Reusing style for consistency
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Search API Settings Section */}
        <section className={`${styles.settingsSection}`}>
          <h3 className={styles.sectionTitle}>{t('settings.searchApi')}</h3>
          <p className={styles.sectionDescription}>{t('settings.searchApiDescription')}</p>
          {/* ... rest of search API options */}
          <div className={styles.searchModeOptions}>
            {searchModes.map((mode) => (
              <div
                key={mode.id}
                className={`${styles.searchModeCard} ${selectedSearchMode === mode.id ? styles.selected : ''}`}
                onClick={() => handleSearchModeChange(mode.id)}
              >
                <div className={styles.cardHeader}>
                  <input
                    type="radio"
                    id={mode.id}
                    name="searchMode"
                    value={mode.id}
                    checked={selectedSearchMode === mode.id}
                    onChange={() => handleSearchModeChange(mode.id)}
                    className={styles.radioInput}
                  />
                  <label htmlFor={mode.id} className={styles.modeName}>
                    {mode.name}
                  </label>
                </div>
                <p className={styles.modeDescription}>{mode.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data Path Section */}
        <section className={`${styles.settingsSection}`}>
          <h3 className={styles.sectionTitle}>{t('settings.dataPath')}</h3>
          <p className={styles.sectionDescription}>{t('settings.dataPathDescription')}</p>
          <div className={styles.pathContainer}>
            <input type="text" value={dataPath} readOnly className={styles.pathInput} />
            <button onClick={handleSelectFolder} className={styles.selectButton}>
              {t('settings.changeFolder')}
            </button>
            <button onClick={handleSaveDataPath} className={styles.saveButton}>
              {t('common.save')}
            </button>
          </div>
        </section>

        {/* Backend URL Section */}
        <section className={`${styles.settingsSection}`}>
          <h3 className={styles.sectionTitle}>{t('settings.backendUrl')}</h3>
          <p className={styles.sectionDescription}>{t('settings.backendUrlDescription')}</p>
          <div className={styles.pathContainer}>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className={styles.pathInput}
            />
            <button onClick={handleSaveBackendUrl} className={styles.saveButton}>
              {t('common.save')}
            </button>
          </div>
        </section>

        {/* Lyrics Settings Section */}
        <section className={`${styles.settingsSection}`}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className={styles.sectionTitle}>{t('settings.lyrics')}</h3>
              <p className={styles.sectionDescription}>{t('settings.romanizeDescription')}</p>
            </div>
            <div className={styles.toggleSwitch}>
              <input
                type="checkbox"
                id="romanizeLyrics"
                checked={romanizeLyrics}
                onChange={handleRomanizeLyricsChange}
              />
              <label htmlFor="romanizeLyrics" title={t('settings.romanize')}></label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
