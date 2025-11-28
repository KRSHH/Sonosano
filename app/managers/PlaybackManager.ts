import { getBackendUrl } from '../../api/backendUrl'
import { Song, PlaybackState } from '../../types'

/**
 * Manages all audio playback for the application.
 * This class creates and controls a single <audio> element, ensuring a unified playback system.
 */
export class PlaybackManager {
  private audio: HTMLAudioElement
  private state: PlaybackState
  private static instance: PlaybackManager
  private listeners: ((state: PlaybackState) => void)[] = []

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    this.audio = new Audio()
    this.state = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 50,
      isMuted: false,
      currentSong: null,
      currentPlaylist: null,
      currentPlaylistSongs: [],
      currentSongIndex: -1,
      isShuffle: false,
      isLoop: false,
    }

    this.setupAudioListeners()
  }

  /**
   * Get the singleton instance of the PlaybackManager.
   */
  public static getInstance(): PlaybackManager {
    if (!PlaybackManager.instance) {
      PlaybackManager.instance = new PlaybackManager()
    }
    return PlaybackManager.instance
  }

  /**
   * Subscribes a listener function to be called on state changes.
   * @param listener The callback function.
   * @returns An unsubscribe function.
   */
  public subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Updates the state and notifies all subscribed listeners.
   */
  private updateState(newState: Partial<PlaybackState>): void {
    this.state = { ...this.state, ...newState }
    this.listeners.forEach((listener) => listener(this.state))
  }

  /**
   * Set up event listeners for the audio element.
   */
  private setupAudioListeners(): void {
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate)
    this.audio.addEventListener('loadedmetadata', this.handleLoadedMetadata)
    this.audio.addEventListener('ended', this.handleEnded)
    this.audio.addEventListener('error', this.handleError)
  }

  private handleTimeUpdate = () => {
    this.updateState({ currentTime: this.audio.currentTime })
  }

  private handleLoadedMetadata = () => {
    this.updateState({ duration: this.audio.duration })
  }

  private handleEnded = () => {
    this.updateState({ isPlaying: false })
    if (this.state.isLoop) {
      this.playSong(this.state.currentSong!, this.state.currentPlaylistSongs, this.state.currentSongIndex)
    } else {
      this.playNext()
    }
  }

  private handleError = (e: Event) => {
    console.error('PlaybackManager: Audio error', e)
    this.updateState({ isPlaying: false })
  }

  /**
   * Play a song.
   * @param song The song to play.
   */
  public playSong(song: Song, playlist: Song[] = [], songIndex: number = -1): void {
    const fileName = song.path.split('\\').pop()?.split('/').pop()
    if (!fileName) {
      console.error('PlaybackManager: Could not determine filename from path:', song.path)
      return
    }
    const fileUrl = `${getBackendUrl()}/play-file/${encodeURIComponent(fileName)}`

    if (this.audio.src !== fileUrl) {
      this.updateState({
        currentSong: song,
        currentTime: 0,
        duration: 0,
        currentPlaylistSongs: playlist,
        currentSongIndex: songIndex,
        currentPlaylist: playlist.length > 0 ? 'current' : null,
      })
      this.audio.src = fileUrl
      this.audio.load()
    } else {
      this.updateState({
        currentSong: song,
        currentPlaylistSongs: playlist,
        currentSongIndex: songIndex,
        currentPlaylist: playlist.length > 0 ? 'current' : null,
      })
    }

    const playPromise = this.audio.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.updateState({ isPlaying: true })
        })
        .catch((error) => {
          console.error('PlaybackManager: Failed to play song:', error)
          this.updateState({ isPlaying: false })
        })
    }
  }

  /**
   * Pause the currently playing song.
   */
  public pause(): void {
    this.audio.pause()
    this.updateState({ isPlaying: false })
  }

  /**
   * Resume playback of the current song.
   */
  public resume(): void {
    if (this.state.currentSong) {
      this.playSong(this.state.currentSong, this.state.currentPlaylistSongs, this.state.currentSongIndex)
    }
  }

  /**
   * Seek to a specific time in the song.
   * @param time The time to seek to, in seconds.
   */
  public seek(time: number): void {
    this.audio.currentTime = time
    this.updateState({ currentTime: time })
  }

  /**
   * Set the volume.
   * @param volume The volume level, from 0 to 100.
   */
  public setVolume(volume: number): void {
    this.audio.volume = volume / 100
    this.updateState({ volume })
  }

  /**
   * Mute or unmute the audio.
   */
  public toggleMute(): void {
    const isMuted = !this.state.isMuted
    this.audio.muted = isMuted
    this.updateState({ isMuted })
  }

  /**
   * Plays the next song in the current playlist.
   */
  public playNext(): void {
    const { currentPlaylistSongs, currentSongIndex, isShuffle } = this.state

    if (isShuffle) {
      const history = this.getShuffledHistory()
      const availableSongs = currentPlaylistSongs.filter((song) => !history.includes(song.id))

      if (availableSongs.length > 0) {
        const nextIndex = Math.floor(Math.random() * availableSongs.length)
        const nextSong = availableSongs[nextIndex]
        history.push(nextSong.id)
        localStorage.setItem('shuffledHistory', JSON.stringify(history))
        this.playSong(nextSong, currentPlaylistSongs, currentPlaylistSongs.indexOf(nextSong))
      } else {
        localStorage.removeItem('shuffledHistory')
        this.playNext()
      }
    } else {
      if (currentPlaylistSongs.length > 0 && currentSongIndex < currentPlaylistSongs.length - 1) {
        const nextIndex = currentSongIndex + 1
        const nextSong = currentPlaylistSongs[nextIndex]
        this.playSong(nextSong, currentPlaylistSongs, nextIndex)
      } else {
        console.warn('PlaybackManager: End of playlist or no playlist active.')
        this.updateState({ isPlaying: false })
      }
    }
  }

  /**
   * Plays the previous song in the current playlist.
   */
  public playPrevious(): void {
    const { currentPlaylistSongs, currentSongIndex } = this.state
    if (currentPlaylistSongs.length > 0 && currentSongIndex > 0) {
      const prevIndex = currentSongIndex - 1
      const prevSong = currentPlaylistSongs[prevIndex]
      this.playSong(prevSong, currentPlaylistSongs, prevIndex)
    }
  }

  /**
   * Get the current playback state.
   */
  public getState(): PlaybackState {
    return this.state
  }

  public toggleShuffle = (): void => {
    const isShuffle = !this.state.isShuffle
    this.updateState({ isShuffle })
    if (isShuffle) {
      localStorage.setItem('shuffledHistory', JSON.stringify([this.state.currentSong?.id]))
    } else {
      localStorage.removeItem('shuffledHistory')
    }
  }

  public toggleLoop = (): void => {
    this.updateState({ isLoop: !this.state.isLoop })
  }

  private getShuffledHistory = (): string[] => {
    const history = localStorage.getItem('shuffledHistory')
    return history ? JSON.parse(history) : []
  }

  public playPlaylist(songs: Song[], startIndex: number = 0): void {
    if (songs.length > 0 && startIndex < songs.length) {
      const songToPlay = songs[startIndex]

      this.playSong(songToPlay, songs, startIndex)
    }
  }
}
