import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAppWindow } from './app'
import { UpdateManager } from './update-manager'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import kill from 'tree-kill'

let backendProcess: ChildProcess | null

function startBackend() {
  let backendExecutable = 'sonosano-backend'
  if (process.platform === 'win32') {
    backendExecutable += '.exe'
  }

  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', backendExecutable)
    : path.join(__dirname, '..', '..', '..', 'backend', 'dist', 'sonosano-backend', backendExecutable)

  backendProcess = spawn(backendPath)

  if (backendProcess.stdout) {
    backendProcess.stdout.on('data', (data) => {
      console.warn(`Backend: ${data}`)
    })
  }

  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`)
    })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.sonosano.app')

  if (app.isPackaged) {
    startBackend()
  }

  // Create app window
  createAppWindow()

  const updateManager = new UpdateManager()
  updateManager.checkForUpdates()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', (event) => {
  if (backendProcess) {
    event.preventDefault() // Prevent the app from quitting immediately
    kill(backendProcess.pid!, (err) => {
      if (err) {
        console.error('Failed to kill backend process:', err)
      } else {
        console.warn('Backend process killed successfully.')
      }
      backendProcess = null
      app.quit() // Now, quit the app
    })
  }
})

// In this file, you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
