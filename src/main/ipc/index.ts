import { registerProjectHandlers } from './projects'
import { registerAgentHandlers } from './agents'
import { registerSettingsHandlers } from './settings'

export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerAgentHandlers()
  registerSettingsHandlers()
}
