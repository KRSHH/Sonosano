class DownloadEventEmitter extends EventTarget {
  private static instance: DownloadEventEmitter

  private constructor() {
    super()
  }

  static getInstance(): DownloadEventEmitter {
    if (!DownloadEventEmitter.instance) {
      DownloadEventEmitter.instance = new DownloadEventEmitter()
    }
    return DownloadEventEmitter.instance
  }

  emitDownloadStarted(download: any) {
    this.dispatchEvent(new CustomEvent('downloadStarted', { detail: download }))
  }

  emitDownloadStatusChanged(download: any) {
    this.dispatchEvent(new CustomEvent('downloadStatusChanged', { detail: download }))
  }

  emitDownloadFailed(downloadId: string, error: string) {
    this.dispatchEvent(
      new CustomEvent('downloadFailed', {
        detail: { id: downloadId, error },
      })
    )
  }
}

export const downloadEvents = DownloadEventEmitter.getInstance()
