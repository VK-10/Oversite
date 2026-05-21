import { useRef } from "react";

export function useAgentStream() {
    const controllerRef = useRef<AbortController | null>(null);

    const streamMessage = async({
        input,
        onChunk,
        onTool,
        onDone,
        onError,
    }) => {
        //fetching stream
    }

    const stopStream = () => {
        controllerRef.current?.abort();
    };

    return {
        streamMessage,
        stopStream,
    };
}