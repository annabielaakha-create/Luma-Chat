import React, { useState, useMemo } from 'react';
import { Artifact } from '../../types';
import {
  FileCode,
  FileText,
  Code,
  Table as TableIcon,
  Image as ImageIcon,
  Copy,
  Check,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Sun,
  Moon
} from 'lucide-react';
import { marked } from 'marked';
import { cleanSvg } from '../../utils/svgCleaner';
import { downloadPdf } from '../../utils/pdfGenerator';

interface InlineArtifactCardProps {
  artifact: Artifact;
  onOpenInWorkspace: (artifact: Artifact) => void;
  isSelected?: boolean;
}

export const InlineArtifactCard: React.FC<InlineArtifactCardProps> = ({
  artifact,
  onOpenInWorkspace,
  isSelected = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [svgTheme, setSvgTheme] = useState<'dark' | 'light'>('dark');

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Special handling for true binary PDF export
    if (artifact.type === 'pdf') {
      downloadPdf(artifact.title, artifact.content);
      return;
    }

    let ext = 'txt';
    let mime = 'text/plain';

    if (artifact.type === 'html') {
      ext = 'html';
      mime = 'text/html';
    } else if (artifact.type === 'svg') {
      ext = 'svg';
      mime = 'image/svg+xml';
    } else if (artifact.type === 'table') {
      ext = 'csv';
      mime = 'text/csv';
    } else if (artifact.type === 'document' || artifact.type === 'markdown') {
      ext = 'md';
      mime = 'text/markdown';
    } else if (artifact.type === 'code') {
      ext = artifact.language || 'txt';
      if (ext === 'javascript') ext = 'js';
      if (ext === 'typescript') ext = 'ts';
      if (ext === 'python') ext = 'py';
      if (ext === 'json') {
        ext = 'json';
        mime = 'application/json';
      }
    }

    const payload = artifact.type === 'svg' ? cleanSvg(artifact.content).svgHtml : artifact.content;
    const blob = new Blob([payload], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Cleaned SVG content with valid viewBox and stripped fences
  const cleanedSvg = useMemo(() => {
    if (artifact.type !== 'svg') return null;
    return cleanSvg(artifact.content);
  }, [artifact.content, artifact.type]);

  // Helper to parse table rows from CSV or Markdown tables
  const parsedTable = useMemo(() => {
    if (artifact.type !== 'table') return null;
    const lines = artifact.content.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { headers: [], rows: [] };

    // Markdown table check
    if (lines[0].includes('|')) {
      const parseRow = (line: string) =>
        line
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      const headers = parseRow(lines[0]);
      const dataLines = lines.slice(1).filter((l) => !l.match(/^[|\s\-:]+$/));
      const rows = dataLines.map(parseRow);
      return { headers, rows };
    }

    // CSV format
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map((line) =>
      line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''))
    );
    return { headers, rows };
  }, [artifact.content, artifact.type]);

  const getFormatIcon = () => {
    switch (artifact.type) {
      case 'html': return <FileCode className="w-4 h-4 text-[#DA4B2A]" />;
      case 'svg': return <ImageIcon className="w-4 h-4 text-[#DA4B2A]" />;
      case 'table': return <TableIcon className="w-4 h-4 text-[#DA4B2A]" />;
      case 'pdf': return <FileText className="w-4 h-4 text-[#DA4B2A]" />;
      case 'document':
      case 'markdown': return <FileText className="w-4 h-4 text-[#DA4B2A]" />;
      default: return <Code className="w-4 h-4 text-[#DA4B2A]" />;
    }
  };

  const getBadgeLabel = () => {
    switch (artifact.type) {
      case 'html': return 'Interactive Web App';
      case 'svg': return 'Vector Graphic';
      case 'table': return 'Dataset Table';
      case 'document':
      case 'markdown': return 'Document';
      case 'pdf': return 'PDF Document';
      default: return artifact.language ? `${artifact.language.toUpperCase()} Code` : 'Code File';
    }
  };

  return (
    <div
      className={`my-3 rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg select-none ${
        isSelected
          ? 'border-[#DA4B2A] bg-[#222222] ring-1 ring-[#DA4B2A]/40'
          : 'border-[#383838] bg-[#242424] hover:border-[#383838]/90'
      }`}
    >
      {/* Top Header Card */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#292929] border-b border-[#383838]/80 text-xs gap-2 min-w-0">
        <div
          onClick={() => onOpenInWorkspace(artifact)}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group/title flex-1 overflow-hidden"
        >
          <div className="p-1.5 rounded-lg bg-[#202020] border border-[#383838] shrink-0">
            {getFormatIcon()}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-[#F2F0ED] group-hover/title:text-[#DA4B2A] transition-colors truncate max-w-full block">
                {artifact.title}
              </span>
              <span
                className="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded text-white shrink-0"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                v{artifact.version}
              </span>
            </div>
            <div className="text-[10px] text-[#A5A29F] mt-0.5 flex items-center gap-1.5 truncate">
              <span className="truncate">{getBadgeLabel()}</span>
              <span className="shrink-0">·</span>
              <span className="hover:underline text-[#DA4B2A] shrink-0">Open in Workspace</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Preview / Code switch for HTML & SVG */}
          {(artifact.type === 'html' || artifact.type === 'svg') && (
            <div className="flex items-center p-0.5 rounded-lg bg-[#202020] border border-[#383838]">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                title="Preview"
                className={`p-1 rounded text-xs transition-colors ${
                  viewMode === 'preview' ? 'bg-[#DA4B2A] text-white' : 'text-[#77736F] hover:text-[#F2F0ED]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                title="Source code"
                className={`p-1 rounded text-xs transition-colors ${
                  viewMode === 'code' ? 'bg-[#DA4B2A] text-white' : 'text-[#77736F] hover:text-[#F2F0ED]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Contrast background toggle for SVG */}
          {artifact.type === 'svg' && viewMode === 'preview' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSvgTheme(svgTheme === 'dark' ? 'light' : 'dark');
              }}
              title={svgTheme === 'dark' ? 'Switch to Light Background' : 'Switch to Dark Background'}
              className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#333333] transition-colors"
            >
              {svgTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Copy code button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Source"
            className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#333333] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#DA4B2A]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            title={artifact.type === 'pdf' ? 'Download PDF Document' : 'Download Artifact'}
            className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#333333] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Open in Workspace button */}
          <button
            type="button"
            onClick={() => onOpenInWorkspace(artifact)}
            title="Open in Workspace panel"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-all shadow-xs hover:brightness-110 active:scale-95"
            style={{ backgroundColor: '#DA4B2A' }}
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Workspace</span>
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse inline preview' : 'Expand inline preview'}
            className="p-1.5 rounded-lg text-[#77736F] hover:text-[#F2F0ED] hover:bg-[#333333] transition-colors ml-1"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Inline Body */}
      {isExpanded && (
        <div className="relative overflow-hidden bg-[#1c1c1c]">
          {/* 1. HTML SANDBOXED PREVIEW */}
          {artifact.type === 'html' && viewMode === 'preview' && (
            <div className="w-full h-80 bg-white">
              <iframe
                title={artifact.title}
                srcDoc={artifact.content}
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* 2. SVG VECTOR GRAPHIC PREVIEW (Cleaned and Scaled) */}
          {artifact.type === 'svg' && viewMode === 'preview' && cleanedSvg && (
            <div
              className={`w-full min-h-[220px] max-h-80 p-6 flex items-center justify-center transition-colors overflow-auto ${
                svgTheme === 'light' ? 'bg-[#FAFAFA]' : 'bg-[#1e1e1e]'
              }`}
            >
              <div
                className="w-full h-full max-h-72 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-72 [&>svg]:h-auto [&>svg]:w-auto"
                dangerouslySetInnerHTML={{ __html: cleanedSvg.svgHtml }}
              />
            </div>
          )}

          {/* 3. PDF DOCUMENT INLINE VIEW */}
          {artifact.type === 'pdf' && (
            <div className="p-6 bg-[#202020] flex flex-col items-center justify-center text-center">
              <div className="p-3 rounded-2xl bg-[#292929] border border-[#383838] mb-3">
                <FileText className="w-8 h-8 text-[#DA4B2A]" />
              </div>
              <h4 className="text-sm font-semibold text-[#F2F0ED]">{artifact.title}</h4>
              <p className="text-xs text-[#A5A29F] mt-1 max-w-md">
                Complete printable PDF document formatted with LUMA 1.0 styling.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .pdf Document</span>
              </button>
            </div>
          )}

          {/* 4. STRUCTURED DATA TABLE PREVIEW */}
          {artifact.type === 'table' && parsedTable && (
            <div className="w-full max-h-72 overflow-auto p-2 text-xs">
              <table className="w-full border-collapse text-left border border-[#383838]">
                <thead>
                  <tr className="bg-[#292929] border-b border-[#383838]">
                    {parsedTable.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-semibold text-[#F2F0ED] border-r border-[#383838] last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]/60">
                  {parsedTable.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#252525] transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5 text-[#A5A29F] border-r border-[#383838]/40 last:border-r-0 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. MARKDOWN / DOCUMENT PREVIEW */}
          {(artifact.type === 'document' || artifact.type === 'markdown') && viewMode === 'preview' && (
            <div className="p-4 max-h-80 overflow-y-auto luma-prose text-xs text-[#F2F0ED]">
              <div
                dangerouslySetInnerHTML={{
                  __html: marked.parse(artifact.content, { gfm: true }) as string
                }}
              />
            </div>
          )}

          {/* 6. CODE OR SOURCE VIEW */}
          {(viewMode === 'code' || artifact.type === 'code') && (
            <div className="w-full max-h-80 overflow-auto p-3 font-mono text-xs bg-[#181818] text-[#F2F0ED]">
              <pre className="leading-relaxed">
                <code>
                  {artifact.content.split('\n').map((line, idx) => (
                    <div key={idx} className="flex hover:bg-[#252525] py-0.5">
                      <span className="w-9 select-none text-[#77736F] text-right pr-3 shrink-0 tabular-nums text-[11px]">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre">{line || ' '}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
