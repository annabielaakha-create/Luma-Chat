import React, { useState } from 'react';
import { LibraryItem } from '../../types';
import {
  Bookmark,
  Search,
  Copy,
  Check,
  Trash2,
  FileText,
  MessageSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface LibraryWorkspaceProps {
  items: LibraryItem[];
  onDeleteItem: (id: string) => Promise<void>;
  onReuseItemInChat: (content: string) => void;
}

export const LibraryWorkspace: React.FC<LibraryWorkspaceProps> = ({
  items,
  onDeleteItem,
  onReuseItemInChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'response' | 'document' | 'prompt'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.itemType === activeFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'response':
        return <MessageSquare className="w-4 h-4 text-[#DA4B2A]" />;
      case 'document':
        return <FileText className="w-4 h-4 text-[#DA4B2A]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#DA4B2A]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#383838]">
        <div>
          <h1 className="text-xl font-semibold text-[#F2F0ED] tracking-tight">Personal Library</h1>
          <p className="text-xs text-[#A5A29F] mt-1">
            Saved AI responses, extracted snippets, and reusable prompts
          </p>
        </div>
      </div>

      {/* Search and Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-[#77736F] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search saved library items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#292929] border border-[#383838] text-xs">
          {(['all', 'response', 'document', 'prompt'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setActiveFilter(filterKey)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                activeFilter === filterKey
                  ? 'bg-[#383838] text-[#F2F0ED] shadow-xs'
                  : 'text-[#A5A29F] hover:text-[#F2F0ED]'
              }`}
            >
              {filterKey === 'all' ? 'All Items' : filterKey + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#383838] rounded-2xl my-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#292929' }}
          >
            <Bookmark className="w-6 h-6 text-[#DA4B2A]" />
          </div>
          <h3 className="text-sm font-semibold text-[#F2F0ED]">Your library is empty</h3>
          <p className="text-xs text-[#A5A29F] mt-1 max-w-sm">
            Save noteworthy assistant answers from conversations or document excerpts to view and reuse them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-12">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-[#383838] transition-all hover:border-[#DA4B2A]/60 flex flex-col justify-between"
              style={{ backgroundColor: '#292929' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-[#202020]">
                    {getItemIcon(item.itemType)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F2F0ED]">{item.title}</h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#77736F] mt-0.5">
                      <span className="capitalize">{item.itemType}</span>
                      {item.modelUsed && (
                        <>
                          <span>·</span>
                          <span>{item.modelUsed}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="tabular-nums">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(item.id, item.content)}
                    className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#383838] transition-colors"
                    title="Copy content"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-[#DA4B2A]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-[#77736F] hover:text-[#DA4B2A] hover:bg-[#383838] transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Snippet body */}
              <div className="mt-3 p-3 rounded-lg bg-[#202020] border border-[#383838]/50 text-xs text-[#F2F0ED] font-mono leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                {item.content}
              </div>

              {/* Bottom actions */}
              <div className="mt-3 pt-2 flex items-center justify-end">
                <button
                  onClick={() => onReuseItemInChat(item.content)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#DA4B2A] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send to Chat Composer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
