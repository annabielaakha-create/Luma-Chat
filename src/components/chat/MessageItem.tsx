import React, { useState, useMemo } from 'react';
import { ChatMessage, Artifact } from '../../types';
import { Copy, Check, Bookmark, RotateCcw, FileText, FileCode, ArrowUpRight } from 'lucide-react';
import { marked } from 'marked';

interface MessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onSaveToLibrary?: (content: string, modelUsed?: string) => void;
  isLatestAssistant?: boolean;
  onOpenArtifact?: (artifact: Artifact) => void;
  activeArtifactId?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
      onSaveToLibrary(message.content, 'LUMA 1.0');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Convert markdown to clean HTML with copy-ready code blocks and responsive tables
  const formattedHtml = useMemo(() => {
    if (isUser) return '';

    try {
      let sanitizedText = message.content || '';
      // Strip raw artifact internal tags from display content
      sanitizedText = sanitizedText
        .replace(/<luma_artifact[\s\S]*?<\/luma_artifact>/g, '')
        .replace(/:::artifact\[(.*?)\]/g, '')
        .trim();

      const renderer = new marked.Renderer();

      renderer.code = function (this: any, token: any) {
        const text = typeof token === 'string' ? token : token?.text || '';
        const lang = (typeof token === 'object' ? token?.lang : '') || 'code';
        const language = (lang || 'code').trim().toLowerCase();
        const encodedCode = encodeURIComponent(text);
        return `
          <div class="code-block-container my-3 rounded-xl border border-[#383838] bg-[#191919] overflow-hidden select-text">
            <div class="flex items-center justify-between px-3 py-1.5 bg-[#252525] border-b border-[#383838] text-xs text-[#A5A29F] select-none">
              <span class="font-mono text-[11px] font-medium tracking-wide uppercase text-[#F2F0ED]/70">${escapeHtml(language)}</span>
              <button
                type="button"
                class="luma-copy-code-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#303030] transition-colors"
                data-code="${encodedCode}"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                <span class="btn-label">Copy</span>
              </button>
            </div>
            <pre class="p-3.5 overflow-x-auto text-xs leading-relaxed font-mono text-[#F2F0ED]"><code class="language-${escapeHtml(language)}">${escapeHtml(text)}</code></pre>
          </div>
        `;
      };

      let parsedHtml = marked.parse(sanitizedText, {
        renderer,
        gfm: true,
        breaks: true
      }) as string;

      // Ensure tables are wrapped in a responsive horizontally-scrolling container
      parsedHtml = parsedHtml
        .replace(/<table>/g, '<div class="overflow-x-auto my-3 rounded-xl border border-[#383838]"><table class="w-full border-collapse text-xs text-left">')
        .replace(/<\/table>/g, '</table></div>');

      return parsedHtml;
    } catch {
      return '';
    }
  }, [message.content, isUser]);

  // Handle delegated code block copy clicks
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const copyBtn = (e.target as HTMLElement).closest('.luma-copy-code-btn') as HTMLElement;
    if (copyBtn) {
      e.stopPropagation();
      const encoded = copyBtn.getAttribute('data-code');
      if (encoded) {
        const decoded = decodeURIComponent(encoded);
        navigator.clipboard.writeText(decoded);
        const label = copyBtn.querySelector('.btn-label');
        if (label) {
          const original = label.textContent;
          label.textContent = 'Copied!';
          copyBtn.style.color = '#DA4B2A';
          setTimeout(() => {
            label.textContent = original;
            copyBtn.style.color = '';
          }, 2000);
        }
      }
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`py-4 transition-colors group ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      <div className={`max-w-3xl w-full ${isUser ? 'flex flex-col items-end' : 'flex items-start gap-3'}`}>
        {/* Assistant LUMA Avatar */}
        {!isUser && (
          <div className="relative shrink-0 w-8 h-8 rounded-xl bg-[#292929] border border-[#383838] flex items-center justify-center overflow-hidden mt-0.5">
            <img
              src="/luma-logo.png"
              alt="LUMA"
              className="w-5 h-5 object-contain"
              draggable={false}
            />
          </div>
        )}

        <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
          {/* Header meta */}
          <div className="flex items-center gap-2 mb-1.5 px-1 text-xs text-[#77736F]">
            {!isUser ? (
              <div className="flex items-center gap-1.5 font-medium text-[#F2F0ED]">
                <span className="font-semibold tracking-tight text-sm">LUMA</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.2 rounded text-white"
                  style={{ backgroundColor: '#DA4B2A' }}
                >
                  1.0
                </span>
                {message.isStreaming && (
                  <span className="text-[11px] text-[#A5A29F] flex items-center gap-1 font-medium ml-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-ping"
                      style={{ backgroundColor: '#DA4B2A' }}
                    />
                    Writing...
                  </span>
                )}
              </div>
            ) : (
              <span className="font-medium text-[#A5A29F]">You</span>
            )}
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
            onClick={handleContentClick}
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed border transition-all ${
              isUser
                ? 'border-[#383838] text-[#F2F0ED]'
                : 'border-transparent text-[#F2F0ED] w-full'
            }`}
            style={{
              backgroundColor: isUser ? '#292929' : 'transparent',
              maxWidth: isUser ? '85%' : '100%'
            }}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap break-words text-sm text-[#F2F0ED] leading-relaxed">
                {message.content}
              </div>
            ) : formattedHtml ? (
              <div
                className="luma-prose text-sm text-[#F2F0ED] break-words"
                dangerouslySetInnerHTML={{ __html: formattedHtml }}
              />
            ) : (
              <div className="whitespace-pre-wrap break-words text-sm text-[#F2F0ED] leading-relaxed">
                {message.content}
              </div>
            )}

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

            {/* Streaming active indicator */}
            {message.isStreaming && (
              <span
                className="inline-block w-2 h-4 ml-1 align-middle animate-pulse"
                style={{ backgroundColor: '#DA4B2A' }}
              />
            )}
          </div>

          {/* User Message Actions: Copy */}
          {isUser && (
            <div className="flex items-center gap-1 mt-1 px-1 text-xs text-[#77736F] opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[#303030] hover:text-[#F2F0ED] transition-colors"
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
            </div>
          )}

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
    </div>
  );
};
