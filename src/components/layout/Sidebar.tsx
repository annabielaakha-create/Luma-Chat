import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Conversation, WorkspaceTab } from '../../types';
import { LumaLogo } from '../ui/LumaLogo';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import {
  MessageSquarePlus,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Bookmark,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Check,
  X,
  User as UserIcon,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  user: User | null;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  user,
  onOpenSettings,
  onOpenAuth,
  onSignOut,
  isMobileOpen,
  onCloseMobile
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('luma_sidebar_collapsed') === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('luma_sidebar_collapsed', String(next));
  };

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (convId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingConvId(null);
  };

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: {
      today: Conversation[];
      yesterday: Conversation[];
      lastWeek: Conversation[];
      older: Conversation[];
    } = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    };

    filtered.forEach((conv) => {
      const convDate = new Date(conv.updatedAt || conv.createdAt);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= lastWeek) {
        groups.lastWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations, searchQuery]);

  const navItems = [
    { key: 'chat' as WorkspaceTab, label: 'Chat', icon: MessageSquare },
    { key: 'documents' as WorkspaceTab, label: 'Documents', icon: FileText },
    { key: 'images' as WorkspaceTab, label: 'Images', icon: ImageIcon },
    { key: 'library' as WorkspaceTab, label: 'Library', icon: Bookmark }
  ];

  const sidebarContent = (
    <div
      className="flex flex-col h-full border-r border-[#383838] select-none transition-all duration-200"
      style={{
        backgroundColor: '#191919',
        width: isCollapsed ? '68px' : '260px'
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-[#383838]/70">
        <div className="overflow-hidden">
          <LumaLogo size="sm" showWordmark={!isCollapsed} showCreator={false} />
        </div>
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="hidden md:flex p-1.5 rounded-lg text-[#77736F] hover:text-[#F2F0ED] hover:bg-[#242424] transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => {
            onNewChat();
            if (activeTab !== 'chat') onSelectTab('chat');
            onCloseMobile();
          }}
          title="Start New Chat"
          className={`w-full flex items-center gap-2.5 rounded-xl font-medium text-xs text-white transition-all shadow-sm hover:brightness-110 active:scale-95 ${
            isCollapsed ? 'p-2.5 justify-center' : 'px-3.5 py-2.5'
          }`}
          style={{ backgroundColor: '#DA4B2A' }}
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="font-semibold">New Chat</span>}
        </button>
      </div>

      {/* Workspace Tabs */}
      <div className="px-3 pb-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onSelectTab(item.key);
                onCloseMobile();
              }}
              title={item.label}
              className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors ${
                isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
              } ${
                isActive
                  ? 'bg-[#292929] text-[#F2F0ED] font-semibold border-l-2 border-[#DA4B2A]'
                  : 'text-[#A5A29F] hover:bg-[#242424] hover:text-[#F2F0ED]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#DA4B2A]' : 'text-[#77736F]'}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Conversation History Section (Only if in Chat tab & not collapsed) */}
      {!isCollapsed && activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-[#383838]/60 mt-1">
          {/* Search bar */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#77736F] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-[#242424] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
              />
            </div>
          </div>

          {/* Conversations list grouped by date */}
          <div className="flex-1 overflow-y-auto px-2 space-y-3 pb-3">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#77736F]">
                No chats yet
              </div>
            ) : (
              <>
                {groupedConversations.today.length > 0 && (
                  <div>
                    <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-[#77736F] uppercase">
                      Today
                    </div>
                    {renderConversationList(groupedConversations.today)}
                  </div>
                )}

                {groupedConversations.yesterday.length > 0 && (
                  <div>
                    <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-[#77736F] uppercase">
                      Yesterday
                    </div>
                    {renderConversationList(groupedConversations.yesterday)}
                  </div>
                )}

                {groupedConversations.lastWeek.length > 0 && (
                  <div>
                    <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-[#77736F] uppercase">
                      Previous 7 Days
                    </div>
                    {renderConversationList(groupedConversations.lastWeek)}
                  </div>
                )}

                {groupedConversations.older.length > 0 && (
                  <div>
                    <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-[#77736F] uppercase">
                      Older
                    </div>
                    {renderConversationList(groupedConversations.older)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Spacer if collapsed or in other tabs */}
      {(isCollapsed || activeTab !== 'chat') && <div className="flex-1" />}

      {/* Bottom User Profile & Settings */}
      <div className="p-3 border-t border-[#383838]/70 space-y-2">
        {/* PWA Install Button */}
        <PWAInstallButton collapsed={isCollapsed} />

        {/* User Profile Card */}
        {user ? (
          <div
            className={`flex items-center gap-2 p-1.5 rounded-xl border border-[#383838]/60 bg-[#242424] transition-colors ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div
              onClick={onOpenSettings}
              className="flex items-center gap-2 min-w-0 cursor-pointer overflow-hidden flex-1"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                style={{ backgroundColor: '#DA4B2A' }}
              >
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#F2F0ED] truncate">
                    {user.displayName || 'User'}
                  </div>
                  <div className="text-[10px] text-[#77736F] truncate">
                    {user.email}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={onSignOut}
                title="Sign out"
                className="text-[#77736F] hover:text-[#DA4B2A] p-1 rounded"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className={`w-full flex items-center gap-2 rounded-xl text-xs font-medium text-[#F2F0ED] border border-[#383838] hover:border-[#DA4B2A] transition-colors ${
              isCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
            }`}
            style={{ backgroundColor: '#242424' }}
          >
            <UserIcon className="w-4 h-4 text-[#DA4B2A] shrink-0" />
            {!isCollapsed && <span className="truncate">Sign In / Register</span>}
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className={`w-full flex items-center gap-2 rounded-lg text-xs font-medium text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#242424] transition-colors ${
            isCollapsed ? 'p-2 justify-center' : 'px-3 py-1.5'
          }`}
        >
          <Settings className="w-4 h-4 text-[#77736F] shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
  );

  function renderConversationList(convs: Conversation[]) {
    return (
      <div className="space-y-0.5">
        {convs.map((conv) => {
          const isActive = conv.id === activeConversationId;
          const isEditing = conv.id === editingConvId;

          return (
            <div
              key={conv.id}
              onClick={() => {
                onSelectConversation(conv.id);
                onCloseMobile();
              }}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#292929] text-[#F2F0ED] font-medium'
                  : 'text-[#A5A29F] hover:bg-[#242424] hover:text-[#F2F0ED]'
              }`}
            >
              {isEditing ? (
                <div
                  className="flex items-center gap-1 w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#191919] border border-[#DA4B2A] text-[#F2F0ED] px-1.5 py-0.5 rounded text-xs focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={(e) => handleSaveRename(conv.id, e)}
                    className="text-[#DA4B2A] p-0.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingConvId(null);
                    }}
                    className="text-[#77736F] p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="truncate flex-1 pr-2">{conv.title}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={(e) => handleStartRename(conv, e)}
                      title="Rename"
                      className="text-[#77736F] hover:text-[#F2F0ED] p-0.5"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      title="Delete"
                      className="text-[#77736F] hover:text-[#DA4B2A] p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:flex shrink-0 h-full">{sidebarContent}</div>

      {/* Mobile Drawer view */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
