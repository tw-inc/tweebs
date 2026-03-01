import type { TweebsAPI } from '../preload/index'

declare global {
  interface Window {
    api: TweebsAPI
  }
}
