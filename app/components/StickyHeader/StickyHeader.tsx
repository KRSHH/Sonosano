import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './stickyHeader.module.css'
import appIcon from '../../../assets/icon.png'
import SystemStatusIndicator from '../SystemStatusIndicator/SystemStatusIndicator'
import { systemAdapter } from '@/app/lib/systemAdapter'

interface PropsStickyHeader {
  closeSidebar?: () => void
}

export default function StickyHeader({ closeSidebar }: PropsStickyHeader) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    const getPlatform = async () => {
      try {
        const windowInfo = await systemAdapter.window.init()
        setPlatform(windowInfo.platform)
      } catch (error) {
        console.error('Failed to get window info:', error)
      }
    }
    getPlatform()
  }, [])

  const isActiveRoute = (path: string) => {
    if (path === '/' && location.pathname === '/') {
      return true
    }

    if (path !== '/') {
      return location.pathname.startsWith(path)
    }
    return false
  }

  const [searchQuery, setSearchQuery] = useState('')

  const [visibleBackground, setVisibleBackground] = useState({})

  const handleScroll = () => {
    if (window.scrollY > 200) {
      setVisibleBackground({
        backgroundColor: 'var(--sticky-header-blue)',
        marginTop: '0',
      })
    } else if (window.scrollY > 150) {
      setVisibleBackground({
        backgroundColor: 'var(--sticky-header-blue)',
        marginTop: '0',
        opacity: '0.7',
      })
    } else if (window.scrollY > 100) {
      setVisibleBackground({
        backgroundColor: 'var(--sticky-header-blue)',
        marginTop: '0',
        opacity: '0.5',
      })
    } else {
      setVisibleBackground({})
    }
  }

  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const handleKeyboardShortcut = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()

      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)

    window.addEventListener('keydown', handleKeyboardShortcut)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('keydown', handleKeyboardShortcut)
    }
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const queryParam = searchParams.get('q')
    if (queryParam) {
      setSearchQuery(decodeURIComponent(queryParam))
    } else {
      setSearchQuery('')
    }
  }, [location.search])

  const handleMinimize = () => {
    systemAdapter.window.minimize()
  }

  const handleMaximize = () => {
    systemAdapter.window.toggleMaximize()
  }

  const handleClose = () => {
    systemAdapter.window.close()
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchFocus = () => {
    if (closeSidebar) {
      closeSidebar()
    }
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)

      if (searchInputRef.current) {
        searchInputRef.current.blur()
      }
    }
  }

  const handleClearClick = () => {
    setSearchQuery('')

    if (closeSidebar) {
      closeSidebar()
    }

    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, 0)
  }

  return (
    <header
      style={visibleBackground}
      className={`${styles.wrapperStickyHeader} ${platform === 'darwin' ? styles.darwin : ''}`}
    >
      <div className={styles.topBar}>
        {/* App branding on the left */}
        <div className={`${styles.appBranding} ${platform === 'darwin' ? styles.hideOnDarwin : ''}`}>
          <img src={appIcon} alt="Sonosano" className={styles.appIcon} />
          <div className={styles.appName}>SONOSANO</div>
        </div>
        {/* Navigation and Enhanced Search bar */}
        <div className={styles.searchSection}>
          {/* Navigation icons on the left of search */}
          <div className={styles.leftNavigation}>
            <button
              type="button"
              className={`${styles.navButton} ${isActiveRoute('/library') ? styles.active : ''}`}
              onClick={() => navigate('/library')}
              title={t('stickyHeader.library')}
            >
              <i className="fa-solid fa-book" />
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${isActiveRoute('/playlists') ? styles.active : ''}`}
              onClick={() => navigate('/playlists')}
              title={t('stickyHeader.playlists')}
            >
              <i className="fa-solid fa-music" />
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
              {/* Search Icon */}
              <div className={styles.searchIconWrapper}>
                <svg viewBox="0 0 24 24">
                  <path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path>
                </svg>
              </div>

              <input
                type="search"
                placeholder={t('stickyHeader.searchPlaceholder')}
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault()
                    if (searchQuery.trim()) {
                      navigate(`/search?q=${encodeURIComponent(searchQuery)}&direct=1`)
                    }
                  }
                }}
                className={styles.searchInput}
                autoComplete="off"
                spellCheck={false}
                ref={searchInputRef}
              />

              {/* Clear Button (when there's text) */}
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={handleClearClick}
                  aria-label={t('stickyHeader.clearSearch')}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M3.293 3.293a1 1 0 0 1 1.414 0L12 10.586l7.293-7.293a1 1 0 1 1 1.414 1.414L13.414 12l7.293 7.293a1 1 0 0 1-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 0 1-1.414-1.414L10.586 12 3.293 4.707a1 1 0 0 1 0-1.414"></path>
                  </svg>
                </button>
              )}
            </div>
          </form>

          {/* Settings icon on the right of search */}
          <div className={styles.rightNavigation}>
            <button
              type="button"
              className={`${styles.navButton} ${isActiveRoute('/settings') ? styles.active : ''}`}
              onClick={() => navigate('/settings')}
              title={t('stickyHeader.settings')}
            >
              <i className="fa-solid fa-gear" />
            </button>
          </div>
          <SystemStatusIndicator />
        </div>

        {/* Window controls */}
        <div className={`${styles.windowControls} ${platform === 'darwin' ? styles.hideOnDarwin : ''}`}>
          <button type="button" onClick={handleMinimize} className={styles.windowControlButton}>
            <i className="fa-solid fa-minus" />
          </button>
          <button type="button" onClick={handleMaximize} className={styles.windowControlButton}>
            <i className="fa-solid fa-square" />
          </button>
          <button type="button" onClick={handleClose} className={`${styles.windowControlButton} ${styles.closeButton}`}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>
    </header>
  )
}
