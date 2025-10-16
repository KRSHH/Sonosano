export interface PropsContextMenu {
  handleCloseParent: () => void
}

export interface PropsContextMenuPlaylist extends PropsContextMenu {
  playlistId: string
  onDelete?: () => void
}

export interface PropsContextMenuSong extends PropsContextMenu {
  songPath: string
  playlistId: string
  songName: string
  artistName: string
}
