import React from 'react';

export type LumaLoadingStage = 'thinking' | 'writing' | 'finishing';

interface LumaLoadingIndicatorProps {
  stage: LumaLoadingStage;
  details?: string;
}

export const LumaLoadingIndicator: React.FC<LumaLoadingIndicatorProps> = ({ stage, details }) => {
  const stageLabels: Record<LumaLoadingStage, string> = {
    thinking: 'Thinking...',
    writing: 'Writing...',
    finishing: 'Finishing up...'
  };

  return (
    <div className="flex items-start gap-3 py-3 animate-in fade-in duration-200 select-none">
      {/* Circular Rotating LUMA Logo Avatar */}
      <div className="relative shrink-0 w-8 h-8 rounded-xl bg-[#292929] border border-[#383838] flex items-center justify-center overflow-hidden">
        {/* Subtle, smooth circular rotating ring in #DA4B2A */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-transparent border-t-[#DA4B2A] border-r-[#DA4B2A]/50 animate-spin pointer-events-none"
          style={{ animationDuration: '1.2s' }}
        />
        {/* Inner LUMA logo */}
        <img
          src="/luma-logo.png"
          alt="LUMA"
          className="w-5 h-5 object-contain relative z-10"
          draggable={false}
        />
      </div>

      {/* Dynamic Status Text */}
      <div className="flex flex-col justify-center min-h-[32px]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#F2F0ED] tracking-tight">LUMA</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: '#DA4B2A' }}
          >
            1.0
          </span>
          <span className="text-xs text-[#A5A29F] font-medium flex items-center gap-1.5 ml-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: '#DA4B2A' }}
            />
            {stageLabels[stage] || 'Thinking...'}
          </span>
        </div>
        {details && (
          <span className="text-[11px] text-[#77736F] mt-0.5">{details}</span>
        )}
      </div>
    </div>
  );
};
