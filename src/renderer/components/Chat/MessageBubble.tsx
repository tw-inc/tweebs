import type { Message } from '@shared/types'

const PM_AVATAR_COLOR = '#6366f1'

export default function MessageBubble({ message }: { message: Message }) {
  const isPM = message.role === 'pm'

  return (
    <div className={`message-bubble ${isPM ? 'pm' : 'user'}`}>
      {isPM && (
        <div className="message-avatar" style={{ background: PM_AVATAR_COLOR }}>
          PM
        </div>
      )}
      <div className="message-content">
        {isPM && <div className="message-role">PM Tweeb</div>}
        <div className="message-text">{message.content}</div>
      </div>
    </div>
  )
}
