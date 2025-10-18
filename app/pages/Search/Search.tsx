import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSearchTabs } from '../../providers/SearchTabProvider'
import RichResultsView from './components/RichResultsView'
import SoulseekResultsView from './components/SoulseekResultsView'
import styles from './search.module.css'

export default function Search() {
  const { tabs, activeTabId, setActiveTab, removeTab, addTab } = useSearchTabs()
  const location = useLocation()

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const query = searchParams.get('q')
    if (query) {
      // This will create a new rich results tab or update the existing one
      addTab({
        type: 'RICH_RESULTS',
        title: `Search: ${query}`,
        query: query,
      })
    }
  }, [location.search, addTab])

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  return (
    <div className={styles.searchContainer}>
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tabItem} ${tab.id === activeTabId ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.title}</span>
            <button
              className={styles.closeTabButton}
              onClick={(e) => {
                e.stopPropagation()
                removeTab(tab.id)
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className={styles.tabContent}>
        {tabs.map((tab) => (
          <div key={tab.id} style={{ display: tab.id === activeTabId ? 'block' : 'none' }}>
            {tab.type === 'RICH_RESULTS' && tab.query && <RichResultsView query={tab.query} />}
            {tab.type === 'SOULSEEK_RESULTS' && tab.metadata && (
              <SoulseekResultsView searchId={tab.id} metadata={tab.metadata} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
