export enum InfoPopoverType {
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  CLIPBOARD = 'CLIPBOARD',
}
export interface PropsInfoPopover {
  title: string | undefined
  description: string | undefined
  type: InfoPopoverType | undefined
  triggerOpenConfirmationModal: boolean

  handleClose?: () => void
}
