import React from 'react';

interface LumaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showCreator?: boolean;
}

export const LumaLogo: React.FC<LumaLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showCreator = false
}) => {
  const dimensions = {
    sm: { icon: 28, text: 'text-base', creator: 'text-[9px]' },
    md: { icon: 36, text: 'text-xl', creator: 'text-[10px]' },
    lg: { icon: 48, text: 'text-2xl', creator: 'text-xs' }
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-sm"
        style={{
          width: dimensions.icon,
          height: dimensions.icon,
          backgroundColor: '#292929',
          border: '1px solid #383838'
        }}
      >
        <img
          src="/luma-logo.png"
          alt="LUMA Logo"
          className="w-full h-full object-contain p-1"
          draggable={false}
        />
      </div>

      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-bold tracking-tight text-[#F2F0ED] ${dimensions.text}`}
              style={{ letterSpacing: '-0.02em' }}
            >
              LUMA
            </span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-[#F2F0ED]"
              style={{ backgroundColor: '#DA4B2A' }}
            >
              1.0
            </span>
          </div>
          {showCreator && (
            <span className={`text-[#77736F] font-medium leading-tight ${dimensions.creator}`}>
              by Annabil Aska
            </span>
          )}
        </div>
      )}
    </div>
  );
};
