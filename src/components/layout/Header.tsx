import React from 'react';
import { WorkspaceTab } from '../../types';
import { LumaLogo } from '../ui/LumaLogo';
import { Settings, Menu, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenSettings: () => void;
  onToggleSidebarMobile: () => void;
  hasActiveArtifact?: boolean;
  onToggleArtifactPanel?: () => void;
  isArtifactPanelOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onToggleSidebarMobile,
  hasActiveArtifact = false,
  onToggleArtifactPanel,
  isArtifactPanelOpen = false
}) => {
  const getTabLabel = (tab: WorkspaceTab) => {
    switch (tab) {
      case 'chat': return 'Chat';
      case 'documents': return 'Documents';
      case 'images': return 'Images';
      case 'library': return 'Library';
    }
  };

  return (
    <header
      className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 border-b border-[#383838] select-none shrink-0"
      style={{ backgroundColor: '#202020' }}
    >
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebarMobile}
          className="md:hidden p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#292929]"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a href="/" className="flex items-center whitespace-nowrap shrink-0">
          <LumaLogo size="sm" showWordmark={true} showCreator={false} />
        </a>
      </div>

      {/* Zone 2: 4 Clean Single-Line Text Navigation Links */}
      <nav className="hidden sm:flex items-center gap-6 text-xs font-medium text-[#A5A29F]">
        {(['chat', 'documents', 'images', 'library'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onSelectTab(tab)}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                isActive
                  ? 'text-[#F2F0ED] font-semibold border-b-2 border-[#DA4B2A]'
                  : 'hover:text-[#F2F0ED]'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary Action (LUMA 1.0 Unified Model Badge + Artifact Toggle + Settings) */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Unified Model Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#F2F0ED] border border-[#383838] shadow-xs"
          style={{ backgroundColor: '#292929' }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: '#DA4B2A' }}
          />
          <span>LUMA 1.0</span>
        </div>

        {/* Toggle Artifact Panel Button if artifacts exist in current chat */}
        {hasActiveArtifact && onToggleArtifactPanel && (
          <button
            onClick={onToggleArtifactPanel}
            title={isArtifactPanelOpen ? 'Hide Artifact Panel' : 'Show Artifact Panel'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isArtifactPanelOpen
                ? 'bg-[#DA4B2A] text-white border-[#DA4B2A]'
                : 'bg-[#292929] text-[#A5A29F] border-[#383838] hover:text-[#F2F0ED]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Artifact</span>
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Workspace Settings"
          className="p-1.5 rounded-lg text-[#A5A29F] hover:text-[#F2F0ED] hover:bg-[#292929] border border-[#383838] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
