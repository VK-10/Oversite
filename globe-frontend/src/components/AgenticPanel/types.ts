export type MessageRole =
  | "user"
  | "assistant"
  | "system";

export type MessageStatus =
  | "idle"
  | "streaming"
  | "complete"
  | "error";


export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: number;
  error? : string;
  metadata? : Record<string, unknown>;

}

export type StreamMessageOptions = {
    input: string;

    onChunk?: (chunk: unknown) => void;

    onDone?: () => void;

    onError?: (error: Error) => void;
};

// export type StreamChunk =
//     | {
//           type: "token";
//           source: string;
//           content: string;
//       }
//     | {
//           type: "node_start";
//           node: string;
//       }
//     | {
//           type: "done";
//       };

export type StreamChunk =
  | { type: "token"; source: string; content: string }  // source: string covers all node names
  | { type: "node_start"; node: string }
  | { type: "done"};

export type StreamAgentOptions = {
    apiRoute: string,
    apiData: unknown,
    signal?: AbortSignal
    onChunk?: (chunk: StreamChunk) => void
    onDone?: () => void
    onError?: (error: Error) => void 
}


