import React, { useState, useRef } from 'react';
import { DocumentRecord } from '../../types';
import { uploadAndParseDocument } from '../../services/ai';
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  MessageSquare,
  Search,
  X,
  Loader2,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';

interface DocumentWorkspaceProps {
  documents: DocumentRecord[];
  onAddDocument: (docData: Omit<DocumentRecord, 'id' | 'userId' | 'createdAt'>) => Promise<DocumentRecord>;
  onDeleteDocument: (id: string) => Promise<void>;
  onAskAboutDocument: (doc: DocumentRecord) => void;
}

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  documents,
  onAddDocument,
  onDeleteDocument,
  onAskAboutDocument
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await uploadAndParseDocument(file);
        await onAddDocument({
          name: file.name,
          size: file.size,
          type: file.type || 'document',
          characterCount: parsed.characterCount,
          lineCount: parsed.lineCount,
          extractedText: parsed.extractedText,
          preview: parsed.preview
        });
      } catch (err: any) {
        console.error('Error adding document:', err);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.extractedText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDocIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx') return <FileSpreadsheet className="w-5 h-5 text-[#DA4B2A]" />;
    if (['ts', 'tsx', 'js', 'py', 'json', 'html'].includes(ext || '')) return <FileCode className="w-5 h-5 text-[#DA4B2A]" />;
    return <FileText className="w-5 h-5 text-[#DA4B2A]" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#383838]">
        <div>
          <h1 className="text-xl font-semibold text-[#F2F0ED] tracking-tight">Documents Workspace</h1>
          <p className="text-xs text-[#A5A29F] mt-1">
            Upload, extract, and inspect documents for AI analysis (PDF, DOCX, TXT, MD, CSV)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".pdf,.docx,.txt,.md,.csv,.json,.py,.js,.ts"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50 hover:brightness-110 active:scale-95"
            style={{ backgroundColor: '#DA4B2A' }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="py-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#77736F] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by name or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
          />
        </div>
      </div>

      {/* Document Grid / Empty State */}
      {filteredDocs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#383838] rounded-2xl my-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#292929' }}
          >
            <FileText className="w-6 h-6 text-[#DA4B2A]" />
          </div>
          <h3 className="text-sm font-semibold text-[#F2F0ED]">No documents uploaded</h3>
          <p className="text-xs text-[#A5A29F] mt-1 max-w-sm">
            Upload PDFs, DOCX, TXT, MD, or CSV files to extract text and analyze them with LUMA.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#F2F0ED] border border-[#383838] hover:border-[#DA4B2A] transition-colors"
            style={{ backgroundColor: '#292929' }}
          >
            Choose File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
          {filteredDocs.map((docItem) => (
            <div
              key={docItem.id}
              className="p-4 rounded-xl border border-[#383838] transition-all hover:border-[#DA4B2A]/70 flex flex-col justify-between"
              style={{ backgroundColor: '#292929' }}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{ backgroundColor: '#202020' }}
                    >
                      {getDocIcon(docItem.name)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#F2F0ED] truncate" title={docItem.name}>
                        {docItem.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#A5A29F] mt-0.5">
                        <span className="tabular-nums">{(docItem.size / 1024).toFixed(1)} KB</span>
                        {docItem.characterCount && (
                          <>
                            <span>·</span>
                            <span className="tabular-nums">{docItem.characterCount.toLocaleString()} chars</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(docItem.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteDocument(docItem.id)}
                    className="text-[#77736F] hover:text-[#DA4B2A] p-1.5 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 p-2.5 rounded-lg text-xs text-[#A5A29F] line-clamp-3 bg-[#202020]/70 border border-[#383838]/40 leading-relaxed font-mono">
                  {docItem.preview || docItem.extractedText.slice(0, 240)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#383838]/60">
                <button
                  onClick={() => setPreviewDoc(docItem)}
                  className="flex items-center gap-1.5 text-xs text-[#A5A29F] hover:text-[#F2F0ED] transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Text</span>
                </button>

                <button
                  onClick={() => onAskAboutDocument(docItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  style={{ backgroundColor: '#DA4B2A' }}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Ask LUMA</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-[#383838] shadow-2xl overflow-hidden"
            style={{ backgroundColor: '#202020' }}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#383838]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#DA4B2A]" />
                <span className="text-sm font-semibold text-[#F2F0ED] truncate max-w-sm">
                  {previewDoc.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-[#A5A29F] hover:text-[#F2F0ED] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 font-mono text-xs text-[#F2F0ED] leading-relaxed whitespace-pre-wrap bg-[#191919]">
              {previewDoc.extractedText}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-[#383838] bg-[#242424]">
              <span className="text-xs text-[#77736F] tabular-nums">
                {previewDoc.extractedText.length.toLocaleString()} total characters
              </span>
              <button
                onClick={() => {
                  const docToAsk = previewDoc;
                  setPreviewDoc(null);
                  onAskAboutDocument(docToAsk);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discuss in Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
