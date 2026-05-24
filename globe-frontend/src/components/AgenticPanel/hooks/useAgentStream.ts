import { useRef } from "react";
import { streamAgent } from "../ai-services/streamAgent";
import { type StreamMessageOptions } from "../types";

export function useAgentStream() {
    const controllerRef = useRef<AbortController | null>(null);

    const streamMessage = async({
        input,
        onChunk,
        onDone,
        onError,
    } : StreamMessageOptions) => {
        //fetching stream
        try {
            const controller = new AbortController();

            //storing in ref hook
            controllerRef.current = controller;

            await streamAgent({
            apiRoute: "/api/stream",
            apiData: {
                message : input //context
            },
            signal: controller.signal,

            onChunk(chunk) {
                onChunk?.(chunk);
            },

            onDone() {
                onDone?.()
            },

            onError(error) {
                onError?.(error);
            }

        });

        } catch (error) {
            onError?.(error as Error);
            
        };

        const stopStream = () => {
            controllerRef.current?.abort();
        };

        return {
            streamMessage,
            stopStream
        }
        


    }

    const stopStream = () => {
        controllerRef.current?.abort();
    };

    return {
        streamMessage,
        stopStream,
    };
}