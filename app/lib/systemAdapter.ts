/**
 * System Adapter for Tauri
 * 
 * This module provides a unified interface for system operations,
 * replacing the previous Electron IPC bridge (window.conveyor).
 */

import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open } from '@tauri-apps/plugin-dialog'
import { openUrl } from '@tauri-apps/plugin-opener'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'

interface WindowInitResult {
    width: number
    height: number
    minimizable: boolean
    maximizable: boolean
    isMaximized: boolean
    platform: string
}

/**
 * Window operations adapter
 */
export const windowAdapter = {
    /**
     * Initialize and get window information
     */
    init: async (): Promise<WindowInitResult> => {
        return invoke<WindowInitResult>('window_init')
    },

    /**
     * Check if window is minimizable
     */
    isMinimizable: async (): Promise<boolean> => {
        return true // Tauri windows are minimizable by default when configured
    },

    /**
     * Check if window is maximizable
     */
    isMaximizable: async (): Promise<boolean> => {
        return true // Tauri windows are maximizable by default when configured
    },

    /**
     * Minimize the window
     */
    minimize: async (): Promise<void> => {
        await invoke('window_minimize')
    },

    /**
     * Maximize the window
     */
    maximize: async (): Promise<void> => {
        await invoke('window_maximize')
    },

    /**
     * Close the window
     */
    close: async (): Promise<void> => {
        await invoke('window_close')
    },

    /**
     * Toggle maximize/restore
     */
    toggleMaximize: async (): Promise<void> => {
        await invoke('window_maximize_toggle')
    },

    /**
     * Toggle fullscreen
     */
    toggleFullscreen: async (): Promise<void> => {
        const window = getCurrentWindow()
        const isFullscreen = await window.isFullscreen()
        await window.setFullscreen(!isFullscreen)
    },
}

/**
 * App operations adapter
 */
export const appAdapter = {
    /**
     * Get the app version
     */
    version: async (): Promise<string> => {
        return invoke<string>('get_app_version')
    },

    /**
     * Open a URL in the default browser
     */
    openUrl: async (url: string): Promise<void> => {
        await openUrl(url)
    },

    /**
     * Open a folder selection dialog
     */
    openFolderDialog: async (): Promise<string[]> => {
        const result = await open({
            directory: true,
            multiple: false,
        })
        if (result === null) {
            return []
        }
        return Array.isArray(result) ? result : [result]
    },

    /**
     * Copy text to clipboard
     */
    copyToClipboard: async (text: string): Promise<void> => {
        await writeText(text)
    },
}

/**
 * Combined system adapter - replacement for window.conveyor
 */
export const systemAdapter = {
    window: windowAdapter,
    app: appAdapter,
}

export default systemAdapter
