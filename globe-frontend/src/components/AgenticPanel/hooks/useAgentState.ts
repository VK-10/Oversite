import { useState } from "react";
import type { AgentMessage } from "../types";

export function useAgentState() {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [toolStatus, setToolStatus] = useState<string | null>(null);

    const addMessage = (message : AgentMessage) => {
        setMessages((prev) => ([...prev, message]))
    };
    const updateMessage = ( {id , chunk}: {id : string; chunk : string}) => {
        setMessages(prev => 
            prev.map(msg => 
                msg.id === id ? {
                    ...msg,
                    content: msg.content + chunk,
                }
                :
                msg
            )
        );
    };

    const replaceMessage = (id : string, updates: Partial<AgentMessage>) => {
        setMessages(prev =>
      prev.map(msg =>
        msg.id === id
          ? {
              ...msg,
              ...updates,
            }
          : msg
      )
    )
    }

    const removeMessage = (
        id: string
    ) => {

        setMessages(prev =>
        prev.filter(msg => msg.id !== id)
        );

    };

    return {
        
    messages,

    isStreaming,

    toolStatus,

    addMessage,

    updateMessage,

    replaceMessage,

    removeMessage,

    setToolStatus,

    setIsStreaming,
}

}