import { ConveyorApi } from '@/lib/preload/shared'

export class WindowApi extends ConveyorApi {
  // Generate window methods
  windowInit = () => this.invoke('window-init')
  windowIsMinimizable = () => this.invoke('window-is-minimizable')
  windowIsMaximizable = () => this.invoke('window-is-maximizable')
  windowMinimize = () => this.invoke('window-minimize')
  windowMaximize = () => this.invoke('window-maximize')
  windowClose = () => this.invoke('window-close')
  windowMaximizeToggle = () => this.invoke('window-maximize-toggle')

  // Generate web methods
  webUndo = () => this.invoke('web-undo')
  webRedo = () => this.invoke('web-redo')
  webCut = () => this.invoke('web-cut')
  webCopy = () => this.invoke('web-copy')
  webPaste = () => this.invoke('web-paste')
  webDelete = () => this.invoke('web-delete')
  webSelectAll = () => this.invoke('web-select-all')
  webReload = () => this.invoke('web-reload')
  webForceReload = () => this.invoke('web-force-reload')
  webToggleDevtools = () => this.invoke('web-toggle-devtools')
  webActualSize = () => this.invoke('web-actual-size')
  webZoomIn = () => this.invoke('web-zoom-in')
  webZoomOut = () => this.invoke('web-zoom-out')
  webToggleFullscreen = () => this.invoke('web-toggle-fullscreen')
  webOpenUrl = (url: string) => this.invoke('web-open-url', url)
  openFolderDialog = () => this.invoke('open-folder-dialog')
  copyToClipboard = (text: string) => this.invoke('web-copy-text', text)
}
