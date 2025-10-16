import { autoUpdater } from 'electron-updater'
import { ipcMain } from 'electron'

export class UpdateManager {
  constructor() {
    autoUpdater.autoDownload = true

    autoUpdater.on('update-downloaded', () => {
      ipcMain.emit('update-ready')
    })

    ipcMain.on('install-update', () => {
      autoUpdater.quitAndInstall()
    })
  }

  public checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify()
  }
}
