/**
 * LUMA AI — Multi-model AI Workspace
 * Created by Annabil Aska
 * @license Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { WorkspaceTab, UserPreferences, DocumentRecord, ImageRecord, Artifact } from './types';
import { useAuth } from './hooks/useAuth';
import { useConversations } from './hooks/useConversations';
import { useDocuments } from './hooks/useDocuments';
import { useImages } from './hooks/useImages';
import { useLibrary } from './hooks/useLibrary';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { DocumentWorkspace } from './components/documents/DocumentWorkspace';
import { ImageWorkspace } from './components/images/ImageWorkspace';
import { LibraryWorkspace } from './components/library/LibraryWorkspace';
import { ArtifactWorkspace } from './components/artifacts/ArtifactWorkspace';
import { SettingsModal } from './components/settings/SettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { OfflineIndicator } from './components/ui/OfflineIndicator';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  defaultModel: 'LUMA 1.0',
  systemPrompt: '',
  temperature: 0.7,
  streamResponses: true
};

export default function App() {
  const { user, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [composerInitialText, setComposerInitialText] = useState<string>('');

  // Artifact Workspace state
  const [isArtifactWorkspaceOpen, setIsArtifactWorkspaceOpen] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isArtifactFullScreen, setIsArtifactFullScreen] = useState(false);

  // User preferences from localStorage
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const cached = localStorage.getItem('luma_preferences');
    if (cached) {
      try {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(cached) };
      } catch {
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('luma_preferences', JSON.stringify(next));
      return next;
    });
  };

  // Persistent user domain hooks
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    createConversation,
    saveMessage,
    renameConversation,
    deleteConversation
  } = useConversations(user);

  const { documents, addDocument, deleteDocument } = useDocuments(user);
  const { images, addImage, deleteImage } = useImages(user);
  const { items: libraryItems, saveToLibrary, deleteFromLibrary } = useLibrary(user);

  // Collect all artifacts from the active conversation's messages
  const activeConversationArtifacts = useMemo(() => {
    const list: Artifact[] = [];
    for (const msg of messages) {
      if (msg.artifacts && msg.artifacts.length > 0) {
        list.push(...msg.artifacts);
      }
    }
    return list;
  }, [messages]);

  // Handle opening an artifact in the right-side preview panel
  const handleOpenArtifact = (artifact: Artifact) => {
    setActiveArtifactId(artifact.id);
    setIsArtifactWorkspaceOpen(true);
  };

  // Handle revising an existing artifact through conversation
  const handleReviseArtifact = (artifact: Artifact, instructions: string) => {
    setActiveTab('chat');
    setComposerInitialText(
      `Please revise the artifact "${artifact.title}" (v${artifact.version}) with the following modifications:\n\n${instructions}`
    );
  };

  // Cross-Workspace Actions
  const handleAskAboutDocument = (docItem: DocumentRecord) => {
    setActiveTab('chat');
    setComposerInitialText(
      `Please analyze the document "${docItem.name}":\n\n${docItem.extractedText.slice(0, 8000)}\n\nWhat are the primary insights, key takeaways, and potential action items?`
    );
  };

  const handleAnalyzeImageInChat = (img: ImageRecord) => {
    setActiveTab('chat');
    setComposerInitialText(
      `Please inspect and explain this image ("${img.name}"). What are its key visual elements, text contents, and context?`
    );
  };

  const handleReuseLibraryItem = (content: string) => {
    setActiveTab('chat');
    setComposerInitialText(content);
  };

  const handleSaveToLibrary = async (content: string, modelUsed?: string) => {
    const titleSnippet = content.trim().slice(0, 36) || 'Saved Snippet';
    await saveToLibrary({
      title: titleSnippet,
      itemType: 'response',
      content,
      modelUsed: modelUsed || 'LUMA 1.0'
    });
  };

  const hasArtifactsInActiveChat = activeConversationArtifacts.length > 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden text-[#F2F0ED] bg-[#202020] font-sans">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chat') {
            setIsArtifactWorkspaceOpen(false);
          }
        }}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setActiveTab('chat');
        }}
        onNewChat={() => {
          createConversation('LUMA 1.0');
          setIsArtifactWorkspaceOpen(false);
          setActiveArtifactId(null);
        }}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={signOutUser}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#202020]">
        {/* Header (Top Bar Contract) */}
        <Header
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'chat') {
              setIsArtifactWorkspaceOpen(false);
            }
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(true)}
          hasActiveArtifact={hasArtifactsInActiveChat && activeTab === 'chat'}
          onToggleArtifactPanel={() => setIsArtifactWorkspaceOpen(!isArtifactWorkspaceOpen)}
          isArtifactPanelOpen={isArtifactWorkspaceOpen}
        />

        {/* Tab Viewports & Split-Screen Artifact Panel */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Chat Workspace: Kept mounted so generation state, SSE stream, and loading animations persist across tab navigation */}
          <div className={`flex-1 flex h-full overflow-hidden relative ${activeTab === 'chat' ? '' : 'hidden'}`}>
            {/* Left Side: Conversation Area */}
            <div
              className={`h-full flex flex-col transition-all duration-200 overflow-hidden ${
                isArtifactWorkspaceOpen && hasArtifactsInActiveChat && !isArtifactFullScreen
                  ? 'w-full md:w-1/2 lg:w-[48%]'
                  : 'w-full'
              }`}
            >
              <ChatWorkspace
                activeConversationId={activeConversationId}
                messages={messages}
                onSaveMessage={saveMessage}
                onCreateConversation={createConversation}
                onSaveToLibrary={handleSaveToLibrary}
                onOpenDocumentUpload={() => setActiveTab('documents')}
                composerInitialText={composerInitialText}
                onComposerTextConsumed={() => setComposerInitialText('')}
                onOpenArtifact={handleOpenArtifact}
                activeArtifactId={activeArtifactId}
                user={user}
              />
            </div>

            {/* Right Side: Contextual Artifact Workspace Panel */}
            {isArtifactWorkspaceOpen && hasArtifactsInActiveChat && (
              <div
                className={`h-full transition-all duration-200 overflow-hidden ${
                  isArtifactFullScreen
                    ? 'fixed inset-0 z-50'
                    : 'hidden md:flex md:w-1/2 lg:w-[52%]'
                }`}
              >
                <ArtifactWorkspace
                  artifacts={activeConversationArtifacts}
                  activeArtifactId={activeArtifactId}
                  onSelectArtifact={(id) => setActiveArtifactId(id)}
                  onClose={() => setIsArtifactWorkspaceOpen(false)}
                  onReviseArtifact={handleReviseArtifact}
                  isFullScreen={isArtifactFullScreen}
                  onToggleFullScreen={() => setIsArtifactFullScreen(!isArtifactFullScreen)}
                />
              </div>
            )}
          </div>

          {/* Document Workspace */}
          <div className={`flex-1 h-full overflow-hidden ${activeTab === 'documents' ? '' : 'hidden'}`}>
            <DocumentWorkspace
              documents={documents}
              onAddDocument={addDocument}
              onDeleteDocument={deleteDocument}
              onAskAboutDocument={handleAskAboutDocument}
            />
          </div>

          {/* Image Workspace */}
          <div className={`flex-1 h-full overflow-hidden ${activeTab === 'images' ? '' : 'hidden'}`}>
            <ImageWorkspace
              images={images}
              onAddImage={addImage}
              onDeleteImage={deleteImage}
              onAnalyzeImageInChat={handleAnalyzeImageInChat}
            />
          </div>

          {/* Library Workspace */}
          <div className={`flex-1 h-full overflow-hidden ${activeTab === 'library' ? '' : 'hidden'}`}>
            <LibraryWorkspace
              items={libraryItems}
              onDeleteItem={deleteFromLibrary}
              onReuseItemInChat={handleReuseLibraryItem}
            />
          </div>
        </main>
      </div>

      {/* Modals & Connectivity Indicators */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        preferences={preferences}
        onUpdatePreferences={updatePreferences}
        onSignOut={signOutUser}
        onOpenAuth={() => {
          setIsSettingsOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <OfflineIndicator />
    </div>
  );
}
