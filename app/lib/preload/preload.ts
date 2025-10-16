import { contextBridge } from 'electron'
import { conveyor } from '../conveyor/api'

declare global {
  interface Window {
    conveyor: typeof conveyor
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('conveyor', conveyor)
  } catch (error) {
    console.error(error)
  }
} else {
  window.conveyor = conveyor
}
