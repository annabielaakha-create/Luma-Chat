import React, { useState } from 'react';
import { ChatMessage, Artifact } from '../../types';
import { Copy, Check, Bookmark, RotateCcw, FileText, FileCode, ArrowUpRight, Sparkles } from 'lucide-react';
import { marked } from 'marked';

interface MessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onSaveToLibrary?: (content: string, modelUsed?: string) => void;
  isLatestAssistant?: boolean;
  onOpenArtifact?: (artifact: Artifact) => void;
  activeArtifactId?: string | null;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onSaveToLibrary,
  isLatestAssistant = false,
  onOpenArtifact,
  activeArtifactId
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSaveToLibrary) {
      onSaveToLibrary(message.content, message.model);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Convert markdown to clean HTML using marked
  const renderFormattedContent = () => {
    if (isUser) {
      return (
        <div className="whitespace-pre-wrap break-words text-sm text-[#F2F0ED] leading-relaxed">
          {message.content}
        </div>
      );
    }

    try {
      // Remove raw artifact markdown tags or replace them cleanly
      let sanitizedText = message.content;
      sanitizedText = sanitizedText.replace(/:::artifact\[(.*?)\]/g, '');

      const rawHtml = marked.parse(sanitizedText, {
        gfm: true,
        breaks: true
      }) as string;

      return (
        <div
          className="luma-prose text-sm text-[#F2F0ED] break-words"
          dangerouslySetInnerHTML={{ __html: rawHtml }}
        />
      );
    } catch {
      return (
        <div className="whitespace-pre-wrap break-words text-sm text-[#F2F0ED] leading-relaxed">
          {message.content}
        </div>
      );
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`py-4 transition-colors ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      <div className={`max-w-3xl w-full ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
        {/* Header meta */}
        <div className="flex items-center gap-2 mb-1.5 px-1 text-xs text-[#77736F]">
          {!isUser && (
            <div className="flex items-center gap-1.5 font-medium text-[#F2F0ED]">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: '#DA4B2A' }}
              />
              <span className="font-semibold">LUMA</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#292929] border border-[#383838] text-[#A5A29F]">
                1.0
              </span>
            </div>
          )}
          {isUser && <span className="font-medium text-[#A5A29F]">You</span>}
          <span className="tabular-nums">{formattedTime}</span>
        </div>

        {/* User Attachments Preview */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-[#383838] text-[#F2F0ED]"
                style={{ backgroundColor: '#292929' }}
              >
                {att.dataUrl ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-5 h-5 object-cover rounded"
                  />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#DA4B2A]" />
                )}
                <span className="max-w-[150px] truncate">{att.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message body container */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed border transition-all ${
            isUser
              ? 'border-[#383838] text-[#F2F0ED]'
              : 'border-transparent text-[#F2F0ED]'
          }`}
          style={{
            backgroundColor: isUser ? '#292929' : 'transparent',
            maxWidth: isUser ? '85%' : '100%'
          }}
        >
          {renderFormattedContent()}

          {/* Assistant Generated Artifacts Cards */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.artifacts.map((art) => {
                const isSelected = activeArtifactId === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => onOpenArtifact && onOpenArtifact(art)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#DA4B2A] bg-[#292929] shadow-md'
                        : 'border-[#383838] bg-[#242424] hover:border-[#DA4B2A]/70 hover:bg-[#292929]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-[#202020] border border-[#383838] text-[#DA4B2A] shrink-0">
                        {art.type === 'html' ? (
                          <FileCode className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#F2F0ED] truncate">
                            {art.title}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#383838] text-[#F2F0ED] font-mono">
                            {art.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#A5A29F] mt-0.5">
                          Interactive Artifact · Click to open in workspace
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#DA4B2A] font-medium shrink-0 pl-3">
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Streaming blinking cursor */}
          {message.isStreaming && (
            <span
              className="inline-block w-2 h-4 ml-1 align-middle animate-pulse"
              style={{ backgroundColor: '#DA4B2A' }}
            />
          )}
        </div>

        {/* Assistant Response Actions */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-1 mt-2 px-1 text-xs text-[#77736F]">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#292929] hover:text-[#F2F0ED] transition-colors"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#DA4B2A]" />
                  <span className="text-[#DA4B2A]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {onSaveToLibrary && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#292929] hover:text-[#F2F0ED] transition-colors"
                title="Save to Library"
              >
                {saved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#DA4B2A]" />
                    <span className="text-[#DA4B2A]">Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </>
                )}
              </button>
            )}

            {isLatestAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#292929] hover:text-[#F2F0ED] transition-colors"
                title="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
