import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../../stores/chatStore'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import DecisionPrompt from './DecisionPrompt'
import type { Message, Tweeb } from '@shared/types'

export default function ChatView({ projectId }: { projectId: string }) {
  const { messages, sending, decision, addMessage, sendMessage, setDecision, respondToDecision } =
    useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [pmThinking, setPmThinking] = useState(false)

  // Listen for new messages from main process — filter by projectId
  useEffect(() => {
    const unsub = window.api.chat.onMessage((msg) => {
      const m = msg as Message
      if (m.project_id !== projectId) return
      addMessage(m)
      // PM replied, stop thinking indicator
      if (m.role === 'pm') setPmThinking(false)
    })
    return unsub
  }, [addMessage, projectId])

  // Listen for decision requests
  useEffect(() => {
    const unsub = window.api.decisions.onRequest((data) => {
      const d = data as { question: string; options: string[] }
      setDecision(d)
      setPmThinking(false)
    })
    return unsub
  }, [setDecision])

  // Listen for PM tweeb status to show typing indicator
  useEffect(() => {
    const unsub = window.api.tweeb.onStatus((data) => {
      const tweeb = data as Tweeb
      if (tweeb.project_id !== projectId || tweeb.role !== 'pm') return
      setPmThinking(tweeb.status === 'working')
    })
    return unsub
  }, [projectId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, decision, pmThinking])

  function handleSend(content: string) {
    sendMessage(projectId, content)
    setPmThinking(true)
  }

  function handleDecision(choice: string) {
    respondToDecision(projectId, choice)
  }

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.length === 0 && !pmThinking && (
          <div className="chat-empty">
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
        {pmThinking && (
          <div className="message-bubble pm">
            <div className="message-avatar" style={{ background: '#a3cbe5' }}>PM</div>
            <div className="message-content">
              <div className="message-role">PM Tweeb</div>
              <div className="message-text typing-indicator">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
          </div>
        )}
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
