import type { Message } from '@shared/types'
import { roleColor } from '../../styles/theme'

export default function MessageBubble({ message }: { message: Message }) {
  const isPM = message.role === 'pm'

  return (
    <div className={`message-bubble ${isPM ? 'pm' : 'user'}`}>
      {isPM && (
        <div className="message-avatar" style={{ background: roleColor.pm }}>
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
