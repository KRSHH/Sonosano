import { useState, useEffect, MouseEvent } from 'react'

interface ContextMenuPosition {
  top: number
  left: number
}

export const useContextMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [anchorPosition, setAnchorPosition] = useState<ContextMenuPosition | null>(null)

  const handleOpen = (event: MouseEvent) => {
    event.preventDefault()
    setIsOpen(!isOpen)
    setAnchorPosition({
      top: event.clientY,
      left: event.clientX,
    })
  }

  const handleClose = () => {
    setAnchorPosition(null)
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) {
      handleClose()
    }
  }, [isOpen])

  const open = Boolean(anchorPosition)
  const id = open ? 'parent-popover' : undefined

  return {
    open,
    anchorPosition,
    handleOpen,
    handleClose,
    id,
  }
}

export type { ContextMenuPosition }
