import { useState } from "react";

interface AgentInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

const AgentInput = ({onSend,isLoading} : AgentInputProps) => {
    const [input, setInput] = useState("");

    const handleSubmit = () => {
        if (!input.trim()) return;
        onSend(input);

        setInput("");
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        };
    }

    return (
        <div className="agent-input">
        <textarea
            value={input}
            onChange={(e) =>
            setInput(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            disabled={isLoading}
        />

      <button
        onClick={handleSubmit}
        disabled={isLoading}
      >
        Send
      </button>
    </div>
  );
}

export default AgentInput