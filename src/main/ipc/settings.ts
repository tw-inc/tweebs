import { ipcMain } from 'electron'
import { getSetting, setSetting } from '../db'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    setSetting(key, value)
  })
}
