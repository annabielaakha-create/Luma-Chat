import React, { useRef, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { EmptyState } from './EmptyState';
import { MessageItem } from './MessageItem';
import { LumaLoadingIndicator, LumaLoadingStage } from './LumaLoadingIndicator';
import { ChatComposer } from '../composer/ChatComposer';
import { ChatMessage, Attachment, Artifact } from '../../types';
import { streamChatCompletion } from '../../services/ai';
import { extractArtifactsFromMessage } from '../../utils/artifactParser';
import { AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';

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
  user?: User | null;
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
  activeArtifactId,
  user
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LumaLoadingStage | null>(null);
  const [streamingAssistantMsg, setStreamingAssistantMsg] = useState<ChatMessage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingUserPrompt, setPendingUserPrompt] = useState<{ content: string; attachments?: Attachment[] } | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to latest response
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Monitor scroll position to respect manual upward browsing
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsAtBottom(distanceToBottom < 80);
  };

  // Auto-scroll when messages change or streaming updates, if user is already at the bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(messages.length <= 2 ? 'auto' : 'smooth');
    }
  }, [messages, streamingAssistantMsg, loadingStage, isAtBottom, scrollToBottom]);

  const handleSendMessage = async (content: string, attachments: Attachment[] = []) => {
    setErrorMessage(null);
    let targetConvId = activeConversationId;

    // Create a new conversation if none is active
    if (!targetConvId) {
      const summaryTitle = content.trim().slice(0, 36) || 'New Conversation';
      targetConvId = await onCreateConversation('LUMA 1.0', summaryTitle);
    }

    const currentUid = user ? user.uid : 'guest';

    // 1. Immediately display and persist user's message
    const userMessageId = 'msg_' + Date.now();
    const userMessage: ChatMessage = {
      id: userMessageId,
      conversationId: targetConvId,
      userId: currentUid,
      role: 'user',
      content,
      attachments,
      createdAt: new Date().toISOString()
    };

    await onSaveMessage(userMessage);

    // 2. Immediately activate LUMA loading indicator in Thinking state
    setIsGenerating(true);
    setLoadingStage('thinking');
    setStreamingAssistantMsg(null);
    scrollToBottom('smooth');

    const assistantMessageId = 'msg_' + (Date.now() + 1);
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      conversationId: targetConvId,
      userId: currentUid,
      role: 'assistant',
      content: '',
      model: 'LUMA 1.0',
      createdAt: new Date().toISOString(),
      isStreaming: true
    };

    const historyPayload = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments?.map((a) => ({
        name: a.name,
        extractedText: a.extractedText
      }))
    }));

    abortControllerRef.current = new AbortController();
    let accumulatedText = '';
    let firstTokenReceived = false;

    try {
      await streamChatCompletion({
        model: 'LUMA 1.0',
        messages: historyPayload,
        temperature: 0.7,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          accumulatedText += chunk;

          // Transition to Writing state when tokens start arriving
          if (!firstTokenReceived && chunk.trim()) {
            firstTokenReceived = true;
            setLoadingStage('writing');
          }

          const liveParsed = extractArtifactsFromMessage(assistantMessageId, targetConvId, accumulatedText);
          setStreamingAssistantMsg({
            ...initialAssistantMessage,
            content: liveParsed.displayContent || accumulatedText,
            artifacts: liveParsed.artifacts.length > 0 ? liveParsed.artifacts : undefined,
            isStreaming: true
          });

          if (liveParsed.artifacts.length > 0) {
            onOpenArtifact(liveParsed.artifacts[liveParsed.artifacts.length - 1]);
          }
        }
      });

      // 3. Finalization stage: parse artifacts & persist finished response
      setLoadingStage('finishing');

      const parsed = extractArtifactsFromMessage(assistantMessageId, targetConvId, accumulatedText);
      const finalAssistantMessage: ChatMessage = {
        ...initialAssistantMessage,
        content: parsed.displayContent || accumulatedText || 'No response generated.',
        artifacts: parsed.artifacts.length > 0 ? parsed.artifacts : undefined,
        isStreaming: false
      };

      await onSaveMessage(finalAssistantMessage);

      if (parsed.artifacts.length > 0) {
        onOpenArtifact(parsed.artifacts[parsed.artifacts.length - 1]);
      }

      setStreamingAssistantMsg(null);
      setPendingUserPrompt(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const parsed = extractArtifactsFromMessage(assistantMessageId, targetConvId, accumulatedText);
        const stoppedMessage: ChatMessage = {
          ...initialAssistantMessage,
          content: parsed.displayContent ? `${parsed.displayContent}\n\n*[Generation stopped]*` : '*[Generation stopped]*',
          artifacts: parsed.artifacts.length > 0 ? parsed.artifacts : undefined,
          isStreaming: false
        };
        await onSaveMessage(stoppedMessage);
        setStreamingAssistantMsg(null);
      } else {
        const rawMessage = err.message || 'An unexpected error occurred';
        let userFriendly = rawMessage;
        if (rawMessage.includes('Missing or insufficient permissions')) {
          userFriendly = 'Session permission error. Please verify authentication.';
        } else if (rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')) {
          userFriendly = 'Unable to reach the LUMA intelligence gateway. Please check your network connection.';
        }

        setErrorMessage(userFriendly);
        setPendingUserPrompt({ content, attachments });
        setStreamingAssistantMsg(null);
      }
    } finally {
      setIsGenerating(false);
      setLoadingStage(null);
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
      const { content, attachments } = pendingUserPrompt;
      setPendingUserPrompt(null);
      handleSendMessage(content, attachments || []);
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const hasMessages = messages.length > 0 || Boolean(streamingAssistantMsg) || Boolean(loadingStage);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Scrollable Messages viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 relative scroll-smooth"
      >
        {!hasMessages ? (
          <EmptyState
            onSelectPrompt={handleSelectPrompt}
            onOpenDocumentUpload={onOpenDocumentUpload}
          />
        ) : (
          <div className="max-w-3xl mx-auto py-6 divide-y divide-[#383838]/40">
            {/* Existing conversation messages */}
            {messages.map((msg, idx) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onSaveToLibrary={(text, model) => onSaveToLibrary(text, model)}
                isLatestAssistant={idx === messages.length - 1 && msg.role === 'assistant' && !isGenerating}
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

            {/* Live Streaming Assistant Message (while generating) */}
            {streamingAssistantMsg && (
              <MessageItem
                key={streamingAssistantMsg.id}
                message={streamingAssistantMsg}
                onOpenArtifact={onOpenArtifact}
                activeArtifactId={activeArtifactId}
              />
            )}

            {/* LUMA Loading & Thinking Indicator (Thinking / Finishing up) */}
            {loadingStage && (!streamingAssistantMsg || loadingStage === 'thinking' || loadingStage === 'finishing') && (
              <LumaLoadingIndicator stage={loadingStage} />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Floating Scroll-to-Bottom button when scrolled up */}
        {!isAtBottom && hasMessages && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="fixed bottom-24 right-8 z-30 p-2.5 rounded-full bg-[#292929] border border-[#383838] text-[#A5A29F] hover:text-[#F2F0ED] hover:border-[#DA4B2A] shadow-xl transition-all"
            title="Scroll to latest messages"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* User-friendly Error Banner with Retry button */}
        {errorMessage && (
          <div className="max-w-3xl mx-auto my-3 p-3.5 rounded-xl bg-[#292929] border border-[#DA4B2A]/60 flex items-center justify-between text-xs text-[#F2F0ED] animate-in fade-in shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-[#DA4B2A] shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            {pendingUserPrompt && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shrink-0 ml-3"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Composer Input Area */}
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
