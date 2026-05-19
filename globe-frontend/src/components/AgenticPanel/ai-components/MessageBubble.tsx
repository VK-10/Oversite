import type {AgentMessage} from "../types";

interface MessageBubbleProps {
    message: AgentMessage
}

const MessageBubble = ({message}: MessageBubbleProps) => {
  return (
    <div className={`message-bubble ${message.role}`}>
        <p> {message.content}</p>
        {message.status === "streaming" && (
            <span>...</span>
        )}
        {message.status === "error" && (
            <p>{message.error}</p>
        )}
    </div>
  )
}

export default MessageBubble