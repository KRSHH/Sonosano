import { Song } from '../../../../types'

export interface PropsPlayer {
  volume: number
  changeSongInfo: (data: Song) => void
}
