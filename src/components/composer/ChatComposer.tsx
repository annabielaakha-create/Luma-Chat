import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../../types';
import { uploadAndParseDocument } from '../../services/ai';
import {
  ArrowUp,
  Square,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  Loader2,
  Sparkles
} from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  onStopGeneration?: () => void;
  isGenerating?: boolean;
  initialText?: string;
  onInitialTextConsumed?: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  onStopGeneration,
  isGenerating = false,
  initialText = '',
  onInitialTextConsumed
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialText) {
      setContent(initialText);
      if (onInitialTextConsumed) onInitialTextConsumed();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialText]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 220);
      textareaRef.current.style.height = `${Math.max(newHeight, 44)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = content.trim();
    if ((!trimmed && attachments.length === 0) || isGenerating || isUploading) {
      return;
    }
    onSendMessage(trimmed, attachments);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await uploadAndParseDocument(file);
        setAttachments((prev) => [
          ...prev,
          {
            id: 'att_' + Date.now() + '_' + i,
            name: file.name,
            type: file.type || 'document',
            size: file.size,
            extractedText: parsed.extractedText
          }
        ]);
      } catch (err: any) {
        console.error('File parsing error:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: 'att_' + Date.now() + '_' + i,
              name: file.name,
              type: file.type || 'document',
              size: file.size,
              extractedText: text ? text.slice(0, 30000) : ''
            }
          ]);
        };
        reader.readAsText(file);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: 'img_' + Date.now() + '_' + i,
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl
          }
        ]);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1">
      <div
        className="relative rounded-2xl border border-[#383838] transition-all focus-within:border-[#DA4B2A] shadow-xl overflow-hidden"
        style={{ backgroundColor: '#292929' }}
      >
        {/* Attachment preview strip */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3 pb-1 border-b border-[#383838]/60">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-[#383838] text-[#F2F0ED] group"
                style={{ backgroundColor: '#202020' }}
              >
                {att.dataUrl ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-4 h-4 object-cover rounded"
                  />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#DA4B2A]" />
                )}
                <span className="max-w-[140px] truncate">{att.name}</span>
                <span className="text-[10px] text-[#77736F] tabular-nums">
                  ({(att.size / 1024).toFixed(0)}KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="text-[#77736F] hover:text-[#DA4B2A] ml-1 p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask LUMA to write, code, create artifacts, or analyze files... (Shift + Enter for new line)"
          rows={1}
          className="w-full px-4 pt-3 pb-2 bg-transparent text-sm text-[#F2F0ED] placeholder-[#77736F] focus:outline-none resize-none leading-relaxed"
          style={{ minHeight: '48px', maxHeight: '220px' }}
        />

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Left: Single unified LUMA 1.0 Model Badge & Attachment triggers */}
          <div className="flex items-center gap-2">
            {/* Unified LUMA 1.0 Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#F2F0ED] border border-[#383838] select-none"
              style={{ backgroundColor: '#202020' }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: '#DA4B2A' }}
              />
              <span>LUMA 1.0</span>
            </div>

            {/* Document upload trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".pdf,.docx,.doc,.txt,.rtf,.odt,.md,.csv,.tsv,.json,.xml,.yaml,.yml,.py,.js,.ts,.tsx,.html"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isGenerating}
              title="Attach Document (PDF, DOCX, DOC, RTF, ODT, TXT, CSV, JSON)"
              className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#303030] transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Image upload trigger */}
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isGenerating}
              title="Attach Image"
              className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#303030] transition-colors disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {isUploading && (
              <span className="flex items-center gap-1 text-[11px] text-[#A5A29F]">
                <Loader2 className="w-3 h-3 animate-spin text-[#DA4B2A]" />
                Extracting...
              </span>
            )}
          </div>

          {/* Right: Send / Stop button */}
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                title="Stop generation"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-white transition-all shadow-sm hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!content.trim() && attachments.length === 0) || isUploading}
                title="Send message (Enter)"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-white transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-center mt-1.5">
        <span className="text-[11px] text-[#77736F]">
          LUMA 1.0 can generate interactive artifacts, code, and documents. Verify important output.
        </span>
      </div>
    </div>
  );
};
