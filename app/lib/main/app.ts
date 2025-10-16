import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import { nativeImage } from 'electron'
import path from 'path'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '../conveyor/handlers/window-handler'
import { registerAppHandlers } from '../conveyor/handlers/app-handler'

export function createAppWindow(): BrowserWindow {
  // Register custom protocol for resources
  registerResourcesProtocol()

  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    backgroundColor: '#1c1c1c',
    icon: nativeImage.createFromPath(
      app.isPackaged
        ? path.join(process.resourcesPath, 'assets', 'icon.ico')
        : path.join(__dirname, '..', '..', '..', 'assets', 'icon.ico')
    ),
    frame: false,
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hidden',
          trafficLightPosition: { x: 20, y: 25 },
        }
      : {}),
    title: 'Sonosano',
    maximizable: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  // Register IPC events for the main window.
  registerWindowHandlers(mainWindow)
  registerAppHandlers(app)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
