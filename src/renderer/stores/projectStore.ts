import { create } from 'zustand'
import type { Project } from '@shared/types'

interface ProjectState {
  projects: Project[]
  loading: boolean
  fetchProjects: () => Promise<void>
  createProject: (name: string, description: string, blueprintId: string) => Promise<Project>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    const projects = await window.api.projects.list()
    set({ projects, loading: false })
  },

  createProject: async (name, description, blueprintId) => {
    const project = await window.api.projects.create(name, description, blueprintId)
    set((state) => ({ projects: [project, ...state.projects] }))
    return project
  }
}))
