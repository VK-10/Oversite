export function useAgentState() {
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [toolStatus, setToolStatus] = useState(null);

    const addMessage = () => {};
    const updateMessage = () => {};
    const removeMessage = () => {};

    return {
        messages,
        isStreaming,
        toolStatus,

        addMessage,
        updateMessage,
        removeMessage,

        setToolStatus,
        setIsStreaming,
    }
}