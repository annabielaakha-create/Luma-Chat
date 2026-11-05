import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { BackendStatus, UserPreferences } from '../../types';
import { fetchBackendStatus } from '../../services/ai';
import {
  X,
  User as UserIcon,
  Sliders,
  Activity,
  LogOut,
  Palette,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  preferences,
  onUpdatePreferences,
  onSignOut,
  onOpenAuth
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'backend' | 'appearance'>('profile');
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);

  const checkStatus = async () => {
    setCheckingBackend(true);
    try {
      const res = await fetchBackendStatus();
      setBackendStatus(res);
    } catch {
      setBackendStatus(null);
    } finally {
      setCheckingBackend(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#383838] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        style={{ backgroundColor: '#202020' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#383838]">
          <h2 className="text-base font-semibold text-[#F2F0ED]">LUMA Settings</h2>
          <button
            onClick={onClose}
            className="text-[#A5A29F] hover:text-[#F2F0ED] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Layout: Sidebar tabs + Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Tabs */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-[#383838] p-2 space-y-1 bg-[#191919]">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#292929] text-[#F2F0ED]'
                  : 'text-[#A5A29F] hover:text-[#F2F0ED]'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-[#DA4B2A]" />
              <span>Profile & Account</span>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'bg-[#292929] text-[#F2F0ED]'
                  : 'text-[#A5A29F] hover:text-[#F2F0ED]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#DA4B2A]" />
              <span>Intelligence Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-[#292929] text-[#F2F0ED]'
                  : 'text-[#A5A29F] hover:text-[#F2F0ED]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-[#DA4B2A]" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('backend')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'backend'
                  ? 'bg-[#292929] text-[#F2F0ED]'
                  : 'text-[#A5A29F] hover:text-[#F2F0ED]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#DA4B2A]" />
              <span>System Status</span>
            </button>
          </div>

          {/* Content Pane */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#F2F0ED]">Account Profile</h3>
                  <p className="text-xs text-[#A5A29F] mt-0.5">
                    Firebase Authentication manages your workspace sessions and cloud persistence.
                  </p>
                </div>

                {user ? (
                  <div className="p-4 rounded-xl border border-[#383838] bg-[#292929] space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: '#DA4B2A' }}>
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#F2F0ED] truncate">
                          {user.displayName || 'LUMA User'}
                        </div>
                        <div className="text-xs text-[#A5A29F] truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#383838] flex items-center justify-between text-xs">
                      <span className="text-[#77736F]">User UID: {user.uid.slice(0, 12)}...</span>
                      <button
                        onClick={onSignOut}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#DA4B2A] hover:bg-[#383838] transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-[#383838] bg-[#292929] text-center space-y-3">
                    <div className="text-xs text-[#A5A29F]">
                      You are using LUMA in guest mode. Sign in with Firebase to automatically sync and access your conversations, documents, and library across all devices.
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all"
                      style={{ backgroundColor: '#DA4B2A' }}
                    >
                      Sign In / Create Account
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#F2F0ED]">Intelligence Engine</h3>
                  <p className="text-xs text-[#A5A29F] mt-0.5">
                    LUMA 1.0 powers all text generation, document understanding, and interactive artifacts.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Single Model Identity Banner */}
                  <div className="p-3.5 rounded-xl border border-[#DA4B2A]/60 bg-[#292929] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#202020] text-[#DA4B2A] border border-[#383838]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#F2F0ED]">Active Model: LUMA 1.0</div>
                        <div className="text-[11px] text-[#A5A29F]">
                          Unified Multi-Model Intelligence & Artifact Generation
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: '#DA4B2A' }}>
                      Active
                    </span>
                  </div>

                  {/* Streaming Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#292929] border border-[#383838]">
                    <div>
                      <div className="text-[#F2F0ED] font-medium">Stream AI Responses</div>
                      <div className="text-[11px] text-[#A5A29F] mt-0.5">
                        Stream tokens progressively as LUMA 1.0 generates them
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdatePreferences({ streamResponses: !preferences.streamResponses })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        preferences.streamResponses ? 'bg-[#DA4B2A]' : 'bg-[#383838]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          preferences.streamResponses ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Temperature slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[#F2F0ED] font-medium">
                        Sampling Temperature ({preferences.temperature})
                      </label>
                      <span className="text-[#77736F]">
                        {preferences.temperature < 0.4 ? 'Precise' : preferences.temperature > 0.8 ? 'Creative' : 'Balanced'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.2"
                      step="0.1"
                      value={preferences.temperature}
                      onChange={(e) => onUpdatePreferences({ temperature: parseFloat(e.target.value) })}
                      className="w-full accent-[#DA4B2A]"
                    />
                  </div>

                  {/* Custom System Prompt */}
                  <div>
                    <label className="block text-[#F2F0ED] font-medium mb-1.5">
                      Custom Assistant Instructions (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={preferences.systemPrompt}
                      onChange={(e) => onUpdatePreferences({ systemPrompt: e.target.value })}
                      placeholder="e.g. Always format deliverables with clean TypeScript or interactive HTML artifacts where appropriate."
                      className="w-full p-2.5 rounded-lg bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A] resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#F2F0ED]">Appearance & Theme</h3>
                  <p className="text-xs text-[#A5A29F] mt-0.5">
                    LUMA is styled with its official Terracotta Orange (#DA4B2A) brand and calm dark grey surfaces.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#383838] bg-[#292929] space-y-3">
                  <div className="text-xs text-[#F2F0ED] font-medium">Design System Color Tokens</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#A5A29F]">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: '#DA4B2A' }} />
                      <span>Terracotta Orange (#DA4B2A)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: '#202020' }} />
                      <span>Background (#202020)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: '#191919' }} />
                      <span>Sidebar (#191919)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: '#292929' }} />
                      <span>Surface (#292929)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SYSTEM STATUS TAB */}
            {activeTab === 'backend' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F2F0ED]">System Diagnostics</h3>
                    <p className="text-xs text-[#A5A29F] mt-0.5">
                      Unified LUMA intelligence routing health
                    </p>
                  </div>
                  <button
                    onClick={checkStatus}
                    disabled={checkingBackend}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#F2F0ED] border border-[#383838] hover:border-[#DA4B2A]"
                  >
                    <RefreshCw className={`w-3 h-3 text-[#DA4B2A] ${checkingBackend ? 'animate-spin' : ''}`} />
                    <span>Recheck</span>
                  </button>
                </div>

                {backendStatus ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-[#383838] bg-[#292929] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#A5A29F]">Product Engine:</span>
                        <span className="font-semibold text-[#F2F0ED]">LUMA AI (v{backendStatus.version})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#A5A29F]">Model:</span>
                        <span className="text-[#DA4B2A] font-semibold">LUMA 1.0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#A5A29F]">Creator:</span>
                        <span className="text-[#F2F0ED]">{backendStatus.creator}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#A5A29F]">Service Health:</span>
                        <span className="text-[#DA4B2A] font-medium capitalize">{backendStatus.status}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#77736F] text-center py-6">
                    Checking system health...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
