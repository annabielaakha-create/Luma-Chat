import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share2, X } from 'lucide-react';

interface PWAInstallButtonProps {
  collapsed?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ collapsed = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Install LUMA AI as app"
        className={`flex items-center gap-2 rounded-lg text-xs font-medium text-[#F2F0ED] transition-colors border border-[#383838] hover:border-[#DA4B2A] ${
          collapsed ? 'p-2 justify-center w-full' : 'px-3 py-2 w-full'
        }`}
        style={{ backgroundColor: '#292929' }}
      >
        <Download className="w-4 h-4 text-[#DA4B2A] shrink-0" />
        {!collapsed && <span className="truncate">Install App</span>}
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Install on iOS"
          className={`flex items-center gap-2 rounded-lg text-xs font-medium text-[#F2F0ED] transition-colors border border-[#383838] hover:border-[#DA4B2A] ${
            collapsed ? 'p-2 justify-center w-full' : 'px-3 py-2 w-full'
          }`}
          style={{ backgroundColor: '#292929' }}
        >
          <Share2 className="w-4 h-4 text-[#DA4B2A] shrink-0" />
          {!collapsed && <span className="truncate">Install on iOS</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div
              className="w-full max-w-sm rounded-xl p-5 shadow-2xl border border-[#383838]"
              style={{ backgroundColor: '#292929' }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#383838]">
                <h3 className="text-sm font-semibold text-[#F2F0ED]">Install LUMA on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-[#A5A29F] hover:text-[#F2F0ED] p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 text-xs text-[#A5A29F] space-y-2">
                <p>1. Tap the <strong className="text-[#F2F0ED]">Share</strong> icon in the Safari toolbar.</p>
                <p>2. Scroll down and tap <strong className="text-[#F2F0ED]">Add to Home Screen</strong>.</p>
                <p>3. Tap <strong className="text-[#F2F0ED]">Add</strong> in the top right to install.</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg py-2 text-xs font-medium text-[#F2F0ED] transition-colors"
                style={{ backgroundColor: '#383838' }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
