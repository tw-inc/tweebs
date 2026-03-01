import { registerProjectHandlers } from './projects'
import { registerAgentHandlers } from './agents'
import { registerSettingsHandlers } from './settings'
import { registerOnboardingHandlers } from './onboarding'
import { registerBlueprintHandlers } from '../blueprints'

export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerAgentHandlers()
  registerSettingsHandlers()
  registerOnboardingHandlers()
  registerBlueprintHandlers()
}
