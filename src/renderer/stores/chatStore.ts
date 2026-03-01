import { create } from 'zustand'
import type { Message } from '@shared/types'

interface DecisionRequest {
  question: string
  options: string[]
}

interface ChatState {
  messages: Message[]
  sending: boolean
  decision: DecisionRequest | null
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  sendMessage: (projectId: string, content: string) => Promise<void>
  setDecision: (decision: DecisionRequest | null) => void
  respondToDecision: (projectId: string, choice: string) => Promise<void>
  clear: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sending: false,
  decision: null,

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state
      return { messages: [...state.messages, message] }
    }),

  sendMessage: async (projectId, content) => {
    set({ sending: true })
    try {
      await window.api.chat.send(projectId, content)
    } finally {
      set({ sending: false })
    }
  },

  setDecision: (decision) => set({ decision }),

  respondToDecision: async (projectId, choice) => {
    set({ decision: null })
    await get().sendMessage(projectId, choice)
    await window.api.decisions.respond(projectId, choice)
  },

  clear: () => set({ messages: [], sending: false, decision: null })
}))
