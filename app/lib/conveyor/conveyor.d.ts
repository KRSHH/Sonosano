import type { ConveyorApi } from '@/lib/conveyor/api'

declare global {
  interface Window {
    conveyor: ConveyorApi
  }
}
