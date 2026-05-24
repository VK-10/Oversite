import { memo } from 'react'
import type { AgentMessage } from '../types'
import MessageBubble from './MessageBubble'

interface MessageListProps {
    messages: AgentMessage[];
}

const MessageList = memo(({messages}: MessageListProps) => {
  return (
    <div className = "message-list">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}
    </div>
  )
});

export default MessageList;