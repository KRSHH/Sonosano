import { useState } from 'react'
import styles from './footer.module.css'
import SongInfo from './SongInfo/SongInfo'
import SongConfig from './SongConfig/SongConfig'
import Player from './Player/Player'
import { Song } from '../../types'
import TimerBar from './TimerBar/TimerBar'

export default function Footer() {
  const [volume, setVolume] = useState<number>(50)
  const [songInfo, setSongInfo] = useState<Song>({
    id: '',
    path: '',
    name: '',
    metadata: {
      artist: '',
      coverArt: '',
    },
  })
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [timerDuration, setTimerDuration] = useState<number | null>(null)

  const handleSetTimerState = (startTime: number | null, duration: number | null) => {
    setTimerStartTime(startTime)
    setTimerDuration(duration)
  }

  return (
    <div className={`container-fluid d-flex flex-row space-evenly ${styles.wrapperFooter}`}>
      <SongInfo name={songInfo.name} metadata={songInfo.metadata} />

      {/* Unified Player component */}
      <Player volume={volume} changeSongInfo={setSongInfo} />

      <SongConfig changeVolume={setVolume} setTimerState={handleSetTimerState} />
      <TimerBar startTime={timerStartTime} duration={timerDuration} />
    </div>
  )
}
