import type { ElectronAPI, IpcRenderer } from '@electron-toolkit/preload'
import type { ChannelName, ChannelArgs, ChannelReturn } from '@/lib/conveyor/schemas'

export abstract class ConveyorApi {
  protected renderer: IpcRenderer

  constructor(electronApi: ElectronAPI) {
    this.renderer = electronApi.ipcRenderer
  }

  invoke = async <T extends ChannelName>(channel: T, ...args: ChannelArgs<T>): Promise<ChannelReturn<T>> => {
    return this.renderer.invoke(channel, ...args) as Promise<ChannelReturn<T>>
  }
}
