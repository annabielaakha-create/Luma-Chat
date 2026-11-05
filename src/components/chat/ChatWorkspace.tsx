import React, { useRef, useEffect, useState } from 'react';
import { EmptyState } from './EmptyState';
import { MessageItem } from './MessageItem';
import { ChatComposer } from '../composer/ChatComposer';
import { ChatMessage, Attachment, Artifact } from '../../types';
import { streamChatCompletion } from '../../services/ai';
import { extractArtifactsFromMessage } from '../../utils/artifactParser';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ChatWorkspaceProps {
  activeConversationId: string | null;
  messages: ChatMessage[];
  onSaveMessage: (message: ChatMessage) => Promise<void>;
  onCreateConversation: (model: string, initialTitle?: string) => Promise<string>;
  onSaveToLibrary: (content: string, modelUsed?: string) => void;
  onOpenDocumentUpload: () => void;
  composerInitialText?: string;
  onComposerTextConsumed?: () => void;
  onOpenArtifact: (artifact: Artifact) => void;
  activeArtifactId: string | null;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  activeConversationId,
  messages,
  onSaveMessage,
  onCreateConversation,
  onSaveToLibrary,
  onOpenDocumentUpload,
  composerInitialText,
  onComposerTextConsumed,
  onOpenArtifact,
  activeArtifactId
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingUserPrompt, setPendingUserPrompt] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom(messages.length <= 2 ? 'auto' : 'smooth');
  }, [messages]);

  const handleSendMessage = async (content: string, attachments: Attachment[] = []) => {
    setErrorMessage(null);
    let targetConvId = activeConversationId;

    if (!targetConvId) {
      const summaryTitle = content.trim().slice(0, 36) || 'New Conversation';
      targetConvId = await onCreateConversation('LUMA 1.0', summaryTitle);
    }

    const userMessageId = 'msg_' + Date.now();
    const userMessage: ChatMessage = {
      id: userMessageId,
      conversationId: targetConvId,
      userId: 'active_user',
      role: 'user',
      content,
      attachments,
      createdAt: new Date().toISOString()
    };

    await onSaveMessage(userMessage);

    const assistantMessageId = 'msg_' + (Date.now() + 1);
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      conversationId: targetConvId,
      userId: 'assistant',
      role: 'assistant',
      content: '',
      model: 'LUMA 1.0',
      createdAt: new Date().toISOString(),
      isStreaming: true
    };
    await onSaveMessage(initialAssistantMessage);

    const historyPayload = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments?.map((a) => ({
        name: a.name,
        extractedText: a.extractedText
      }))
    }));

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    let accumulatedText = '';

    try {
      await streamChatCompletion({
        model: 'LUMA 1.0',
        messages: historyPayload,
        temperature: 0.7,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          const liveParsed = extractArtifactsFromMessage(assistantMessageId, targetConvId, accumulatedText);
          onSaveMessage({
            ...initialAssistantMessage,
            content: liveParsed.displayContent || accumulatedText,
            artifacts: liveParsed.artifacts.length > 0 ? liveParsed.artifacts : undefined,
            isStreaming: true
          });
          if (liveParsed.artifacts.length > 0) {
            onOpenArtifact(liveParsed.artifacts[liveParsed.artifacts.length - 1]);
          }
          scrollToBottom('auto');
        }
      });

      // Parse artifacts from finished response
      const parsed = extractArtifactsFromMessage(assistantMessageId, targetConvId, accumulatedText);

      await onSaveMessage({
        ...initialAssistantMessage,
        content: parsed.displayContent || accumulatedText || 'No response generated.',
        artifacts: parsed.artifacts,
        isStreaming: false
      });

      // If an artifact was detected, ensure it is open in the right-hand preview panel!
      if (parsed.artifacts.length > 0) {
        onOpenArtifact(parsed.artifacts[parsed.artifacts.length - 1]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const parsed = extractArtifactsFromMessage(assistantMessageId, targetConvId, accumulatedText);
        await onSaveMessage({
          ...initialAssistantMessage,
          content: parsed.displayContent ? `${parsed.displayContent}\n\n[Generation stopped]` : '[Generation stopped]',
          artifacts: parsed.artifacts,
          isStreaming: false
        });
      } else {
        const errDetail = err.message || 'An unexpected error occurred';
        setErrorMessage(errDetail);
        setPendingUserPrompt(content);
        await onSaveMessage({
          ...initialAssistantMessage,
          content: accumulatedText ? `${accumulatedText}\n\n*Connection interrupted: ${errDetail}*` : `*Failed to generate response: ${errDetail}*`,
          isStreaming: false
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    if (pendingUserPrompt) {
      handleSendMessage(pendingUserPrompt);
      setPendingUserPrompt(null);
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Messages area or Empty State */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        {!hasMessages ? (
          <EmptyState
            onSelectPrompt={handleSelectPrompt}
            onOpenDocumentUpload={onOpenDocumentUpload}
          />
        ) : (
          <div className="max-w-3xl mx-auto py-6 divide-y divide-[#383838]/40">
            {messages.map((msg, idx) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onSaveToLibrary={(text, model) => onSaveToLibrary(text, model)}
                isLatestAssistant={idx === messages.length - 1 && msg.role === 'assistant'}
                onOpenArtifact={onOpenArtifact}
                activeArtifactId={activeArtifactId}
                onRegenerate={() => {
                  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                  if (lastUserMsg) {
                    handleSendMessage(lastUserMsg.content, lastUserMsg.attachments);
                  }
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="max-w-3xl mx-auto my-3 p-3 rounded-xl bg-[#292929] border border-[#DA4B2A]/60 flex items-center justify-between text-xs text-[#F2F0ED] animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#DA4B2A] shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {pendingUserPrompt && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-xs font-medium hover:brightness-110"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Composer anchor */}
      <ChatComposer
        onSendMessage={handleSendMessage}
        onStopGeneration={handleStopGeneration}
        isGenerating={isGenerating}
        initialText={composerInitialText}
        onInitialTextConsumed={onComposerTextConsumed}
      />
    </div>
  );
};
