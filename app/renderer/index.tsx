import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initializeI18n } from 'i18n/i18n'

import 'bootstrap/dist/css/bootstrap.min.css'

import { StrictMode } from 'react'
import App from './App'
import './index.css'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)
const queryClient = new QueryClient()

initializeI18n()
  .then(() => {
    return root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <HashRouter>
            <App />
          </HashRouter>
        </QueryClientProvider>
      </StrictMode>
    )
  })
  .catch((err) => {
    console.error(`Error initializing app: ${err}`)
  })
