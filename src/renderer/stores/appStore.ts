import { create } from 'zustand'

export type View = 'home' | 'project' | 'onboarding' | 'settings'

interface AppState {
  view: View
  activeProjectId: string | null
  setView: (view: View) => void
  openProject: (id: string) => void
  goHome: () => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'home',
  activeProjectId: null,
  setView: (view) => set({ view }),
  openProject: (id) => set({ view: 'project', activeProjectId: id }),
  goHome: () => set({ view: 'home', activeProjectId: null })
}))
