import { useEffect, useState } from "react";

import AgentInput from "./ai-components/AgentInput";
import MessageList from "./ai-components/MessageList";
import ToolStatus from "./ai-components/ToolStatus";

import type { AgentMessage } from "./types";


interface AgentPanelProps {
  context?: unknown;
}
export default function AgenticPanel({ context } : AgentPanelProps ) {

    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toolStatus, setToolStatus] = useState("");

    const handleSend = async (input: string) => {
        const userMessage: AgentMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
            status: "complete",
            createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage])

        setIsLoading(true);

        try {

            const assistantId = crypto.randomUUID();

            const assistantMessage: AgentMessage = {
                id: assistantId,
                role : "assistant",
                content: "",
                status: "streaming",
                createdAt: Date.now(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            //streaming
            const fakeResponse = "this is a streamed response from the agent";

            setMessages((prev) => 
                prev.map((msg) => 
                msg.id === assistantId ? {
                    ...msg,
                    content: fakeResponse,
                    status: "complete",
                }
                : 
                msg
                )
            );

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setToolStatus("");
        }
    };


    return (
        <div className="agent-panel">
            <MessageList messages={messages} />
            {toolStatus && (
                <ToolStatus status= {toolStatus} />
            )}

            <AgentInput onSend={handleSend}
                        isLoading={isLoading}
            />
        </div>
    )

    // slide animation
    // const [open, setOpen] = useState(false);

    // // slide on mount
    // useEffect(() => {
    //     const id = requestAnimationFrame(() => setOpen(true));
    //     return () => cancelAnimationFrame(id);
    // }, []);

    // const handleClose = () => {
    //     setOpen(false);
    //     setTimeout(onClose, SLIDE_DURATION);
    // };
    // useEffect(() => {
    //     if (!triggerClose) return;
    //     setOpen(false);
    //     const id = setTimeout(onClose, SLIDE_DURATION);
    //     return () => clearTimeout(id);
    // }, [triggerClose]);
}