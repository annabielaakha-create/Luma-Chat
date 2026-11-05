import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Tablet,
  Table as TableIcon,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { marked } from 'marked';
import { cleanSvg } from '../../utils/svgCleaner';
import { downloadPdf } from '../../utils/pdfGenerator';

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
  const [svgZoom, setSvgZoom] = useState(1);
  const [svgTheme, setSvgTheme] = useState<'dark' | 'light' | 'checkerboard'>('dark');
  const [tableSearch, setTableSearch] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) || artifacts[0];

  // Default view mode based on artifact type
  useEffect(() => {
    if (activeArtifact) {
      if (activeArtifact.type === 'code') {
        setViewMode('code');
      } else {
        setViewMode('preview');
      }
      setSvgZoom(1);
      setTableSearch('');
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

  // Cleaned SVG content with valid viewBox and stripped fences
  const cleanedSvg = useMemo(() => {
    if (!activeArtifact || activeArtifact.type !== 'svg') return null;
    return cleanSvg(activeArtifact.content);
  }, [activeArtifact?.content, activeArtifact?.type]);

  // Parsed table data for table artifacts
  const parsedTable = useMemo(() => {
    if (!activeArtifact || activeArtifact.type !== 'table') return null;
    const lines = activeArtifact.content.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };

    let headers: string[] = [];
    let rows: string[][] = [];

    if (lines[0].includes('|')) {
      const parseRow = (line: string) =>
        line
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      headers = parseRow(lines[0]);
      const dataLines = lines.slice(1).filter((l) => !l.match(/^[|\s\-:]+$/));
      rows = dataLines.map(parseRow);
    } else {
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      headers = lines[0].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      rows = lines.slice(1).map((line) =>
        line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''))
      );
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
    }

    return { headers, rows };
  }, [activeArtifact?.content, activeArtifact?.type, tableSearch]);

  if (!activeArtifact) {
    return null;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // True binary PDF generation and download
    if (activeArtifact.type === 'pdf') {
      downloadPdf(activeArtifact.title, activeArtifact.content);
      return;
    }

    let extension = 'txt';
    let mimeType = 'text/plain';

    if (activeArtifact.type === 'html') {
      extension = 'html';
      mimeType = 'text/html';
    } else if (activeArtifact.type === 'svg') {
      extension = 'svg';
      mimeType = 'image/svg+xml';
    } else if (activeArtifact.type === 'table') {
      extension = 'csv';
      mimeType = 'text/csv';
    } else if (activeArtifact.type === 'code') {
      extension = activeArtifact.language || 'txt';
      if (extension === 'javascript') extension = 'js';
      if (extension === 'typescript') extension = 'ts';
      if (extension === 'python') extension = 'py';
      if (extension === 'json') {
        extension = 'json';
        mimeType = 'application/json';
      }
    } else if (activeArtifact.type === 'document' || activeArtifact.type === 'markdown') {
      extension = 'md';
      mimeType = 'text/markdown';
    }

    const payload = activeArtifact.type === 'svg'
      ? cleanSvg(activeArtifact.content).svgHtml
      : activeArtifact.content;

    const blob = new Blob([payload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeArtifact.title.toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    let mime = 'text/html';
    let payload = activeArtifact.content;

    if (activeArtifact.type === 'svg') {
      mime = 'image/svg+xml';
      payload = cleanSvg(activeArtifact.content).svgHtml;
    }

    const blob = new Blob([payload], { type: mime });
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

  const getFormatIcon = () => {
    switch (activeArtifact.type) {
      case 'html': return <FileCode className="w-4 h-4 text-[#DA4B2A]" />;
      case 'svg': return <ImageIcon className="w-4 h-4 text-[#DA4B2A]" />;
      case 'table': return <TableIcon className="w-4 h-4 text-[#DA4B2A]" />;
      case 'pdf': return <FileText className="w-4 h-4 text-[#DA4B2A]" />;
      case 'document':
      case 'markdown': return <FileText className="w-4 h-4 text-[#DA4B2A]" />;
      default: return <Code className="w-4 h-4 text-[#DA4B2A]" />;
    }
  };

  const isPreviewSupported = activeArtifact.type !== 'code';

  return (
    <div
      className={`flex flex-col h-full border-l border-[#383838] shadow-2xl transition-all duration-200 select-none min-w-0 ${
        isFullScreen ? 'fixed inset-0 z-50 bg-[#202020]' : 'relative bg-[#202020]'
      }`}
      style={{ backgroundColor: '#202020' }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#383838] shrink-0 bg-[#242424] min-w-0 z-20 gap-2">
        {/* Left: Artifact Title & Selector Dropdown */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden" ref={dropdownRef}>
          <div className="p-1.5 rounded-lg bg-[#292929] border border-[#383838] shrink-0">
            {getFormatIcon()}
          </div>

          <div className="relative min-w-0 flex-1 overflow-hidden">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#F2F0ED] hover:text-[#DA4B2A] transition-colors truncate max-w-full"
            >
              <span className="truncate">{activeArtifact.title}</span>
              {artifacts.length > 1 && (
                <ChevronDown className="w-3.5 h-3.5 text-[#77736F] shrink-0" />
              )}
            </button>

            <div className="text-[10px] text-[#77736F] flex items-center gap-1.5 mt-0.5 truncate">
              <span className="uppercase tracking-wider font-mono font-medium">{activeArtifact.type}</span>
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
        <div className="flex items-center gap-1 shrink-0">
          {/* Preview / Code Segmented Toggle */}
          {isPreviewSupported && (
            <div className="flex items-center p-0.5 rounded-lg bg-[#292929] border border-[#383838] shrink-0">
              <button
                onClick={() => setViewMode('preview')}
                title="Interactive Preview"
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-[#DA4B2A] text-white shadow-xs'
                    : 'text-[#A5A29F] hover:text-[#F2F0ED]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Preview</span>
              </button>
              <button
                onClick={() => setViewMode('code')}
                title="Source Code"
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'code'
                    ? 'bg-[#DA4B2A] text-white shadow-xs'
                    : 'text-[#A5A29F] hover:text-[#F2F0ED]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Code</span>
              </button>
            </div>
          )}

          {/* Viewport size buttons for HTML Preview (only in full screen or extra-large viewports) */}
          {activeArtifact.type === 'html' && viewMode === 'preview' && (
            <div className="hidden 2xl:flex items-center p-0.5 rounded-lg bg-[#292929] border border-[#383838] shrink-0">
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

          {/* SVG Controls: Zoom and Contrast Background */}
          {activeArtifact.type === 'svg' && viewMode === 'preview' && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => setSvgTheme(svgTheme === 'dark' ? 'light' : 'dark')}
                title={svgTheme === 'dark' ? 'Light Background' : 'Dark Background'}
                className="p-1.5 rounded-lg bg-[#292929] border border-[#383838] text-[#A5A29F] hover:text-[#F2F0ED] transition-colors"
              >
                {svgTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center p-0.5 rounded-lg bg-[#292929] border border-[#383838]">
                <button
                  onClick={() => setSvgZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                  className="p-1 rounded text-[#77736F] hover:text-[#F2F0ED]"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-[10px] font-mono text-[#A5A29F]">{Math.round(svgZoom * 100)}%</span>
                <button
                  onClick={() => setSvgZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                  className="p-1 rounded text-[#77736F] hover:text-[#F2F0ED]"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSvgZoom(1)}
                  title="Reset Zoom"
                  className="p-1 rounded text-[#77736F] hover:text-[#F2F0ED]"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
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
            title={activeArtifact.type === 'pdf' ? 'Download PDF Document' : 'Download Artifact'}
            className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#292929] border border-[#383838] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Open in new tab (for HTML or SVG) */}
          {(activeArtifact.type === 'html' || activeArtifact.type === 'svg') && (
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
      <div className="flex-1 min-h-0 overflow-auto relative flex items-center justify-center p-3 bg-[#191919]">
        {/* 1. HTML LIVE PREVIEW */}
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

        {/* 2. SVG VECTOR GRAPHIC PREVIEW */}
        {activeArtifact.type === 'svg' && viewMode === 'preview' && cleanedSvg && (
          <div
            className={`w-full h-full rounded-xl border border-[#383838] flex items-center justify-center p-6 overflow-auto transition-colors ${
              svgTheme === 'light' ? 'bg-[#FAFAFA]' : 'bg-[#202020]'
            }`}
          >
            <div
              style={{ transform: `scale(${svgZoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}
              className="w-full h-full max-w-full max-h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-[70vh] [&>svg]:w-auto [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: cleanedSvg.svgHtml }}
            />
          </div>
        )}

        {/* 3. STRUCTURED DATA TABLE PREVIEW */}
        {activeArtifact.type === 'table' && viewMode === 'preview' && parsedTable && (
          <div className="w-full h-full rounded-xl border border-[#383838] bg-[#202020] flex flex-col overflow-hidden">
            {/* Table search & row counter bar */}
            <div className="p-3 border-b border-[#383838] flex items-center justify-between gap-3 bg-[#242424] shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#77736F] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter table rows..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 rounded-lg text-xs bg-[#1e1e1e] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
                />
              </div>
              <div className="text-[11px] text-[#A5A29F] font-mono shrink-0">
                {parsedTable.rows.length} rows · {parsedTable.headers.length} columns
              </div>
            </div>

            {/* Scrollable table container */}
            <div className="flex-1 min-h-0 overflow-auto p-3">
              <table className="w-full border-collapse text-left text-xs border border-[#383838]">
                <thead>
                  <tr className="bg-[#282828] border-b border-[#383838]">
                    {parsedTable.headers.map((h, i) => (
                      <th key={i} className="px-3.5 py-2.5 font-semibold text-[#F2F0ED] border-r border-[#383838] last:border-r-0 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]/60 font-sans">
                  {parsedTable.rows.length === 0 ? (
                    <tr>
                      <td colSpan={parsedTable.headers.length || 1} className="py-8 text-center text-[#77736F]">
                        No matching records
                      </td>
                    </tr>
                  ) : (
                    parsedTable.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#262626] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 text-[#F2F0ED]/90 border-r border-[#383838]/40 last:border-r-0 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. DOCUMENT VIEW (Markdown render) */}
        {(activeArtifact.type === 'document' || activeArtifact.type === 'markdown') && viewMode === 'preview' && (
          <div className="w-full h-full overflow-y-auto rounded-xl border border-[#383838] bg-[#202020] p-6 max-w-3xl">
            <div
              className="luma-prose text-sm text-[#F2F0ED]"
              dangerouslySetInnerHTML={{
                __html: marked.parse(activeArtifact.content, { gfm: true }) as string
              }}
            />
          </div>
        )}

        {/* 5. CODE VIEW (Syntax highlighted editor view) */}
        {(viewMode === 'code' || activeArtifact.type === 'code') && (
          <div className="w-full h-full min-h-0 overflow-y-auto rounded-xl border border-[#383838] bg-[#1a1a1a] p-4 font-mono text-xs text-[#F2F0ED] leading-relaxed">
            <pre className="overflow-x-auto">
              <code>
                {activeArtifact.content.split('\n').map((line, idx) => (
                  <div key={idx} className="flex hover:bg-[#252525] py-0.5">
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

        {/* 6. PDF DOCUMENT VIEW */}
        {activeArtifact.type === 'pdf' && (
          <div className="w-full h-full rounded-xl border border-[#383838] bg-[#202020] flex flex-col items-center justify-center p-8 text-center max-w-lg">
            <div className="p-4 rounded-2xl bg-[#292929] border border-[#383838] mb-4">
              <FileText className="w-12 h-12 text-[#DA4B2A]" />
            </div>
            <h3 className="text-base font-semibold text-[#F2F0ED]">{activeArtifact.title}</h3>
            <p className="text-xs text-[#A5A29F] mt-2 leading-relaxed">
              Formatted PDF document ready for binary export. Generated with LUMA AI typography, pagination, and headers.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                <Download className="w-4 h-4" />
                <span>Download .pdf Document</span>
              </button>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-[#A5A29F] hover:text-[#F2F0ED] border border-[#383838] hover:bg-[#292929] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#DA4B2A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Source</span>
              </button>
            </div>
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
