import { contextBridge, ipcRenderer } from 'electron'

const api = {
  projects: {
    create: (name: string, description: string, blueprintId: string) =>
      ipcRenderer.invoke('project:create', name, description, blueprintId),
    list: () => ipcRenderer.invoke('project:list'),
    get: (id: string) => ipcRenderer.invoke('project:get', id)
  },
  chat: {
    send: (projectId: string, message: string) =>
      ipcRenderer.invoke('chat:send', projectId, message),
    onMessage: (callback: (message: unknown) => void) => {
      const handler = (_event: unknown, message: unknown) => callback(message)
      ipcRenderer.on('chat:message', handler)
      return () => ipcRenderer.removeListener('chat:message', handler)
    }
  },
  board: {
    onUpdate: (callback: (tickets: unknown) => void) => {
      const handler = (_event: unknown, tickets: unknown) => callback(tickets)
      ipcRenderer.on('board:update', handler)
      return () => ipcRenderer.removeListener('board:update', handler)
    }
  },
  tweeb: {
    onStatus: (callback: (tweeb: unknown) => void) => {
      const handler = (_event: unknown, tweeb: unknown) => callback(tweeb)
      ipcRenderer.on('tweeb:status', handler)
      return () => ipcRenderer.removeListener('tweeb:status', handler)
    }
  },
  decisions: {
    respond: (projectId: string, choice: string) =>
      ipcRenderer.invoke('decision:respond', projectId, choice),
    onRequest: (callback: (data: unknown) => void) => {
      const handler = (_event: unknown, data: unknown) => callback(data)
      ipcRenderer.on('decision:request', handler)
      return () => ipcRenderer.removeListener('decision:request', handler)
    }
  },
  onboarding: {
    check: () => ipcRenderer.invoke('onboard:check'),
    install: (target: string) => ipcRenderer.invoke('onboard:install', target)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },
  blueprints: {
    list: () => ipcRenderer.invoke('blueprint:list')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type TweebsAPI = typeof api
