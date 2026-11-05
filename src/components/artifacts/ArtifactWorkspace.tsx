import React, { useState, useEffect, useRef } from 'react';
import { Artifact } from '../../types';
import {
  Code,
  Eye,
  Download,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  FileCode,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { marked } from 'marked';

interface ArtifactWorkspaceProps {
  artifacts: Artifact[];
  activeArtifactId: string | null;
  onSelectArtifact: (id: string) => void;
  onClose: () => void;
  onReviseArtifact: (artifact: Artifact, instructions: string) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const ArtifactWorkspace: React.FC<ArtifactWorkspaceProps> = ({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onClose,
  onReviseArtifact,
  isFullScreen = false,
  onToggleFullScreen
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) || artifacts[0];

  // If artifact is not HTML/SVG, default to code/document view
  useEffect(() => {
    if (activeArtifact) {
      if (activeArtifact.type === 'code') {
        setViewMode('code');
      } else {
        setViewMode('preview');
      }
    }
  }, [activeArtifact?.id, activeArtifact?.type]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  if (!activeArtifact) {
    return null;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let extension = 'txt';
    let mimeType = 'text/plain';

    if (activeArtifact.type === 'html') {
      extension = 'html';
      mimeType = 'text/html';
    } else if (activeArtifact.type === 'pdf') {
      extension = 'pdf';
      mimeType = 'application/pdf';
    } else if (activeArtifact.type === 'code') {
      extension = activeArtifact.language || 'txt';
      if (extension === 'javascript') extension = 'js';
      if (extension === 'typescript') extension = 'ts';
      if (extension === 'python') extension = 'py';
      mimeType = 'text/plain';
    } else if (activeArtifact.type === 'document') {
      extension = 'md';
      mimeType = 'text/markdown';
    }

    const blob = new Blob([activeArtifact.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeArtifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([activeArtifact.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleSendRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim()) return;
    onReviseArtifact(activeArtifact, revisionPrompt.trim());
    setRevisionPrompt('');
  };

  const getViewportWidth = () => {
    switch (viewportMode) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'w-full';
    }
  };

  return (
    <div
      className={`flex flex-col h-full border-l border-[#383838] shadow-2xl transition-all duration-200 select-none ${
        isFullScreen ? 'fixed inset-0 z-50 bg-[#202020]' : 'relative bg-[#202020]'
      }`}
      style={{ backgroundColor: '#202020' }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#383838] shrink-0 bg-[#242424]">
        {/* Left: Artifact Title & Selector Dropdown */}
        <div className="flex items-center gap-2.5 min-w-0" ref={dropdownRef}>
          <div className="p-1.5 rounded-lg bg-[#292929] border border-[#383838] text-[#DA4B2A] shrink-0">
            {activeArtifact.type === 'html' ? (
              <FileCode className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>

          <div className="relative min-w-0">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#F2F0ED] hover:text-[#DA4B2A] transition-colors truncate max-w-[200px] sm:max-w-[280px]"
            >
              <span className="truncate">{activeArtifact.title}</span>
              {artifacts.length > 1 && (
                <ChevronDown className="w-3.5 h-3.5 text-[#77736F] shrink-0" />
              )}
            </button>

            <div className="text-[10px] text-[#77736F] flex items-center gap-1.5 mt-0.5">
              <span className="uppercase tracking-wider font-mono">{activeArtifact.type}</span>
              <span>·</span>
              <span>v{activeArtifact.version}</span>
            </div>

            {/* Dropdown if multiple artifacts */}
            {isDropdownOpen && artifacts.length > 1 && (
              <div
                className="absolute top-full left-0 mt-2 w-72 rounded-xl shadow-2xl border border-[#383838] p-1.5 z-50 animate-in fade-in zoom-in-95"
                style={{ backgroundColor: '#292929' }}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-[#77736F] uppercase">
                  Conversation Artifacts ({artifacts.length})
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {artifacts.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => {
                        onSelectArtifact(art.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                        art.id === activeArtifact.id
                          ? 'bg-[#383838] text-[#F2F0ED] font-medium'
                          : 'text-[#A5A29F] hover:bg-[#303030] hover:text-[#F2F0ED]'
                      }`}
                    >
                      <span className="truncate pr-2">{art.title}</span>
                      <span className="text-[10px] text-[#77736F] shrink-0 font-mono">
                        v{art.version}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Toggles */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Preview / Code Segmented Toggle */}
          {activeArtifact.type === 'html' && (
            <div className="flex items-center p-0.5 rounded-lg bg-[#292929] border border-[#383838]">
              <button
                onClick={() => setViewMode('preview')}
                title="Interactive Preview"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-[#DA4B2A] text-white shadow-xs'
                    : 'text-[#A5A29F] hover:text-[#F2F0ED]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
              <button
                onClick={() => setViewMode('code')}
                title="Source Code"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'code'
                    ? 'bg-[#DA4B2A] text-white shadow-xs'
                    : 'text-[#A5A29F] hover:text-[#F2F0ED]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Code</span>
              </button>
            </div>
          )}

          {/* Viewport size buttons for HTML Preview */}
          {activeArtifact.type === 'html' && viewMode === 'preview' && (
            <div className="hidden lg:flex items-center p-0.5 rounded-lg bg-[#292929] border border-[#383838]">
              <button
                onClick={() => setViewportMode('desktop')}
                title="Desktop View"
                className={`p-1 rounded ${viewportMode === 'desktop' ? 'text-[#DA4B2A]' : 'text-[#77736F] hover:text-[#F2F0ED]'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode('tablet')}
                title="Tablet View"
                className={`p-1 rounded ${viewportMode === 'tablet' ? 'text-[#DA4B2A]' : 'text-[#77736F] hover:text-[#F2F0ED]'}`}
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                title="Mobile View"
                className={`p-1 rounded ${viewportMode === 'mobile' ? 'text-[#DA4B2A]' : 'text-[#77736F] hover:text-[#F2F0ED]'}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopyCode}
            title="Copy Source"
            className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#292929] border border-[#383838] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#DA4B2A]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            title="Download Artifact"
            className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#292929] border border-[#383838] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Open in new tab (for HTML) */}
          {activeArtifact.type === 'html' && (
            <button
              onClick={handleOpenInNewTab}
              title="Open in new window"
              className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#292929] border border-[#383838] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Full Screen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#292929] border border-[#383838] transition-colors"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            title="Close Artifact Panel"
            className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#DA4B2A] hover:bg-[#292929] border border-[#383838] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Artifact Viewport */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-3 bg-[#191919]">
        {/* HTML LIVE PREVIEW */}
        {activeArtifact.type === 'html' && viewMode === 'preview' && (
          <div className={`h-full ${getViewportWidth()} transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-[#383838] bg-white flex flex-col`}>
            <iframe
              ref={iframeRef}
              title={activeArtifact.title}
              srcDoc={activeArtifact.content}
              sandbox="allow-scripts allow-forms allow-modals"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        )}

        {/* CODE VIEW (Syntax highlighted editor view) */}
        {(viewMode === 'code' || activeArtifact.type === 'code') && (
          <div className="w-full h-full overflow-y-auto rounded-xl border border-[#383838] bg-[#202020] p-4 font-mono text-xs text-[#F2F0ED] leading-relaxed">
            <pre className="overflow-x-auto">
              <code>
                {activeArtifact.content.split('\n').map((line, idx) => (
                  <div key={idx} className="flex hover:bg-[#292929]/80 py-0.5">
                    <span className="w-10 select-none text-[#77736F] text-right pr-4 shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="flex-1 whitespace-pre">{line || ' '}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        )}

        {/* DOCUMENT VIEW (Markdown render) */}
        {activeArtifact.type === 'document' && viewMode === 'preview' && (
          <div className="w-full h-full overflow-y-auto rounded-xl border border-[#383838] bg-[#202020] p-6 max-w-3xl">
            <div
              className="luma-prose text-sm text-[#F2F0ED]"
              dangerouslySetInnerHTML={{
                __html: marked.parse(activeArtifact.content, { gfm: true }) as string
              }}
            />
          </div>
        )}

        {/* PDF VIEW */}
        {activeArtifact.type === 'pdf' && (
          <div className="w-full h-full rounded-xl border border-[#383838] bg-[#202020] flex flex-col items-center justify-center p-6 text-center">
            <FileText className="w-12 h-12 text-[#DA4B2A] mb-3" />
            <h3 className="text-sm font-semibold text-[#F2F0ED]">{activeArtifact.title}</h3>
            <p className="text-xs text-[#A5A29F] mt-1 max-w-sm">
              Generated PDF Document. Click below to inspect or download.
            </p>
            <button
              onClick={handleDownload}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: '#DA4B2A' }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Document</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Revision Input Bar */}
      <div className="p-3 border-t border-[#383838] bg-[#242424] shrink-0">
        <form onSubmit={handleSendRevision} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Sparkles className="w-3.5 h-3.5 text-[#DA4B2A] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Ask LUMA to update "${activeArtifact.title}"...`}
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
            />
          </div>
          <button
            type="submit"
            disabled={!revisionPrompt.trim()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            style={{ backgroundColor: '#DA4B2A' }}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Revise</span>
          </button>
        </form>
      </div>
    </div>
  );
};
