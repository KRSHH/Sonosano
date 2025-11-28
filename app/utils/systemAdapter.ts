import { getCurrentWindow } from '@tauri-apps/api/window'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { open as openShell } from '@tauri-apps/plugin-shell'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

// Helper to check if running in Tauri (Desktop) or Browser (Web)
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export const systemAdapter = {
  // --- Window Controls ---
  minimize: async () => {
    if (isTauri()) await getCurrentWindow().minimize()
  },
  maximizeToggle: async () => {
    if (isTauri()) await getCurrentWindow().toggleMaximize()
  },
  close: async () => {
    if (isTauri()) await getCurrentWindow().close()
  },

  // --- Fullscreen ---
  toggleFullscreen: async () => {
    if (isTauri()) {
      const win = getCurrentWindow()
      const isFullscreen = await win.isFullscreen()
      await win.setFullscreen(!isFullscreen)
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }
  },

  // --- Files & Shell ---
  selectFolder: async (): Promise<string | null> => {
    if (isTauri()) {
      const selected = await openDialog({
        directory: true,
        multiple: false,
      })
      return selected as string | null
    }
    alert('Folder selection is not available in Web Mode.')
    return null
  },

  openExternal: async (url: string) => {
    if (isTauri()) {
      await openShell(url)
    } else {
      window.open(url, '_blank')
    }
  },

  copyToClipboard: async (text: string) => {
    if (isTauri()) {
      await writeText(text)
    } else {
      await navigator.clipboard.writeText(text)
    }
  },
}
