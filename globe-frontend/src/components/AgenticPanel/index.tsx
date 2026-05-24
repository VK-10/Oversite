import { useEffect, useRef, useState} from "react";

import AgentInput from "./ai-components/AgentInput";
import MessageList from "./ai-components/MessageList";
import ToolStatus from "./ai-components/ToolStatus";

import type { AgentMessage, StreamChunk } from "./types";
import { streamAgent } from "./ai-services/streamAgent";

const PANEL_WIDTH = "min(420px, 92vw)";
const SLIDE_DURATION = 350;

function useIsMobile() {
    const [mobile, sestMobile] = useState(() => window.innerWidth < 480);
    useEffect(() => {
        const handler = () => sestMobile(window.innerWidth < 480)
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    return mobile;
}

interface AgentPanelProps {
  context?: unknown;
  onClose? : () => void;
}
export default function AgenticPanel({ context, onClose } : AgentPanelProps ) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toolStatus, setToolStatus] = useState("");

    // Slide in on mount 
    useEffect(() => {
        const id = requestAnimationFrame(() => setOpen(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleClose = () => {
        setOpen(false);
        setTimeout(() => onClose?.(), SLIDE_DURATION)
    }

    const handleSend = async (input: string) => {
        const userMessage: AgentMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
            status: "complete",
            createdAt: Date.now(),
        };

        const reportId = crypto.randomUUID();
        const criticId = crypto.randomUUID();

        const reportMessage: AgentMessage = {
            id: reportId,
            role: "assistant",
            content: "",
            status: "streaming",
            createdAt: Date.now(),
        };

        const criticMessage: AgentMessage = {
            id: criticId,
            role: "assistant",
            content: "",
            status: "streaming",
            createdAt: Date.now(),
        }

        setMessages((prev) => [...prev, userMessage,reportMessage, criticMessage])

        setIsLoading(true);

        try {

            //streaming
            // const fakeResponse = "this is a streamed response from the agent";

            await streamAgent({
                apiRoute: "/helper/",
                apiData : {
                    query: input,
                    context: JSON.stringify(context),
                    // status: "streaming"
                },

                onChunk(parsed : StreamChunk) {
                    console.log(parsed);
                    if ("type" in parsed && parsed.type === "token") {
                            const source = parsed.source;
                            const targetId = source === "critic" ? criticId : reportId; // default to report

                            setMessages(prev =>
                                prev.map(msg =>
                                    msg.id === targetId
                                    ? { ...msg, content: msg.content + parsed.content}
                                    : msg
                                )
                            );
                        } 
                    if ("type" in parsed && parsed.type === "token" && parsed.source === "critic") {
                        const token = parsed.content;

                        setMessages(prev => 
                            prev.map(msg => 
                                msg.id === criticId 
                                ? {
                                    ...msg,
                                    content: msg.content + token,
                                }

                                : msg
                            )
                        ); 
                    }

                    if ("type" in parsed && parsed.type === "node_start") {

                        setToolStatus(parsed.node)
                    }

                    if ("done" in parsed && parsed.type === "done") {
                        setMessages(prev => 
                            prev.map(msg => 
                                msg.id === reportId || msg.id === criticId
                                ? {
                                    ...msg,
                                    status: "complete"
                                }

                                :msg
                            )
                        );
                    }
                },

                onError(error) {
                    console.error(error);

                    setMessages(prev => 
                        prev.map(msg => 
                            msg.id === reportId || msg.id === criticId
                            ? {
                                ...msg,
                                status: "error",
                            }
                            : msg
                        )
                    )
                },

                // onDone() {
                //     setIsLoading(false);

                //     setToolStatus("");
                // }
            });
            // console.log("streamAgent skipped");

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setToolStatus("");
        }
    };

    const bodyPadding = isMobile ? "12px": "16px";
    const closeBtnSize = isMobile ? "32px": "auto";

    return (
    // Outer wrapper — animates width just like Panel
    <div
      style={{
        width: open ? PANEL_WIDTH : "0px",
        minWidth: 0,
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        transition: `width ${SLIDE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 9999,
      }}
    >
      {/* Inner — fixed width so it clips not squashes */}
      <div
        style={{
          width: PANEL_WIDTH,
          height: "100%",
          background: "#0a0a0a",
          color: "white",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
      >

        {/* ── Header ── */}
        <div
          style={{
            padding: isMobile ? "16px 12px 12px" : "28px 20px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Accent bar — mirrors Panel */}
          <div
            style={{
              width: 3,
              height: 32,
              background: "linear-gradient(180deg, #6ee7f7, #3b82f6)",
              borderRadius: 2,
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>
              AI ASSISTANT
            </div>
            <h2 style={{ margin: 0, fontSize: isMobile ? "14px" : "17px", fontWeight: 600, letterSpacing: "-0.01em" }}>
              Research Agent
            </h2>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: closeBtnSize,
              minHeight: closeBtnSize,
              borderRadius: 6,
              flexShrink: 0,
            }}
            aria-label="Close agent panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

        {/* ── Tool status badge ── */}
        {toolStatus && (
          <div style={{ padding: "8px 20px", flexShrink: 0 }}>
            <ToolStatus status={toolStatus} />
          </div>
        )}

        {/* ── Messages — scrollable ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: bodyPadding,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {messages.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              Ask anything about this article or country.
            </p>
          )}
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />   {/* scroll anchor */}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

        {/* ── Input — pinned to bottom ── */}
        <div style={{ padding: bodyPadding, flexShrink: 0 }}>
          <AgentInput onSend={handleSend} isLoading={isLoading} />
        </div>

      </div>
    </div>
  );

}


//     return (
//          <div
//     style={{
//       position: "absolute",
//       right: 0,
//       top: 0,
//       width: 400,
//       height: "100vh",
//       background: "black",
//       color: "white",
//       zIndex: 9999,
//     }}
//   >
//     <MessageList messages={messages} />
//     <ToolStatus status={toolStatus} />
//     <AgentInput onSend={handleSend} isLoading={isLoading} />
//   </div>
//     //     <div
//     //     style={{
//     //         position: "absolute",
//     //         right: 0,
//     //         top: 0,
//     //         width: 400,
//     //         height: "100vh",
//     //         background: "black",
//     //         color: "white",
//     //         zIndex: 9999,
//     //     }}
//     // >
//     //     <pre style={{ color: "white" }}>
//     //         {JSON.stringify(messages, null, 2)}
//     //     </pre>
//     //     <AgenticPanel context={{ post : "country" }} />
//     )

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