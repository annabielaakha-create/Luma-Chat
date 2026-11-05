export type WorkspaceTab = 'chat' | 'documents' | 'images' | 'library';

export type ArtifactType = 'html' | 'code' | 'document' | 'markdown' | 'svg' | 'table' | 'csv' | 'pdf';

export interface Artifact {
  id: string;
  conversationId: string;
  messageId: string;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
  version: number;
  createdAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  extractedText?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  attachments?: Attachment[];
  artifacts?: Artifact[];
  createdAt: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount?: number;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  name: string;
  size: number;
  type: string;
  characterCount?: number;
  lineCount?: number;
  extractedText: string;
  preview: string;
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  userId: string;
  name: string;
  dataUrl: string;
  prompt?: string;
  model?: string;
  isGenerated?: boolean;
  createdAt: string;
}

export interface LibraryItem {
  id: string;
  userId: string;
  title: string;
  itemType: 'response' | 'document' | 'image' | 'prompt' | 'artifact';
  content: string;
  sourceConversationId?: string;
  modelUsed?: string;
  createdAt: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
  streamResponses: boolean;
}

export interface BackendStatus {
  app: string;
  creator: string;
  status: string;
  version: string;
  backendConfigured: boolean;
  omnirouteReachable: boolean;
  hasApiKey: boolean;
  error?: string | null;
}
