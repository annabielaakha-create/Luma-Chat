import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium text-[#F2F0ED] shadow-xl border border-[#383838] animate-in fade-in"
      style={{ backgroundColor: '#292929' }}
    >
      <WifiOff className="w-4 h-4 text-[#DA4B2A]" />
      <span>Offline Mode — Cached local data is being used</span>
    </div>
  );
};
