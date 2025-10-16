import type { BrowserWindow } from 'electron'
import { shell, dialog, clipboard } from 'electron'
import { handle } from '@/lib/main/shared'
import { electronAPI } from '@electron-toolkit/preload'

export const registerWindowHandlers = (window: BrowserWindow) => {
  // Window operations
  handle('window-init', () => {
    const { width, height } = window.getBounds()
    const minimizable = window.isMinimizable()
    const maximizable = window.isMaximizable()
    const platform = electronAPI.process.platform

    return { width, height, minimizable, maximizable, platform }
  })

  handle('window-is-minimizable', () => window.isMinimizable())
  handle('window-is-maximizable', () => window.isMaximizable())
  handle('window-minimize', () => window.minimize())
  handle('window-maximize', () => window.maximize())
  handle('window-close', () => window.close())
  handle('window-maximize-toggle', () => (window.isMaximized() ? window.unmaximize() : window.maximize()))

  // Web content operations
  const webContents = window.webContents
  handle('web-undo', () => webContents.undo())
  handle('web-redo', () => webContents.redo())
  handle('web-cut', () => webContents.cut())
  handle('web-copy', () => webContents.copy())
  handle('web-paste', () => webContents.paste())
  handle('web-delete', () => webContents.delete())
  handle('web-select-all', () => webContents.selectAll())
  handle('web-reload', () => webContents.reload())
  handle('web-force-reload', () => webContents.reloadIgnoringCache())
  handle('web-toggle-devtools', () => webContents.toggleDevTools())
  handle('web-actual-size', () => webContents.setZoomLevel(0))
  handle('web-zoom-in', () => webContents.setZoomLevel(webContents.zoomLevel + 0.5))
  handle('web-zoom-out', () => webContents.setZoomLevel(webContents.zoomLevel - 0.5))
  handle('web-toggle-fullscreen', () => window.setFullScreen(!window.fullScreen))
  handle('web-open-url', (url: string) => shell.openExternal(url))
  handle('open-folder-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    })
    if (canceled) {
      return []
    }
    return filePaths
  })
  handle('web-copy-text', (text: string) => clipboard.writeText(text))
}
