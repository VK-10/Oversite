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

