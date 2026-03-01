import { useEffect, useRef } from 'react'
import { useChatStore } from '../../stores/chatStore'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import DecisionPrompt from './DecisionPrompt'
import type { Message } from '@shared/types'

export default function ChatView({ projectId }: { projectId: string }) {
  const { messages, sending, decision, addMessage, sendMessage, setDecision, respondToDecision } =
    useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Listen for new messages from main process
  useEffect(() => {
    const unsub = window.api.chat.onMessage((msg) => {
      addMessage(msg as Message)
    })
    return unsub
  }, [addMessage])

  // Listen for decision requests
  useEffect(() => {
    const unsub = window.api.decisions.onRequest((data) => {
      const d = data as { question: string; options: string[] }
      setDecision(d)
    })
    return unsub
  }, [setDecision])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, decision])

  function handleSend(content: string) {
    sendMessage(projectId, content)
  }

  function handleDecision(choice: string) {
    respondToDecision(projectId, choice)
  }

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <div className="chat-empty-text">
              Tell the PM what you want to build.
              <br />
              They'll handle the rest.
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {decision && (
          <DecisionPrompt
            question={decision.question}
            options={decision.options}
            onChoose={handleDecision}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
